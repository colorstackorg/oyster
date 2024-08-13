import { match } from 'ts-pattern';
import { z } from 'zod';

import { ColorStackError } from '@/shared/errors';

// Environment Variables

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY as string;

// Core

type ContentBlock =
  | {
      type: 'image';
      source: {
        data: string;
        media_type: 'image/jpeg' | 'image/png';
        type: 'base64';
      };
    }
  | {
      type: 'text';
      text: string;
    };

type Message = {
  content: string | ContentBlock[];
  role: 'assistant' | 'user';
};

type GetChatCompletionInput = {
  maxTokens: number;
  messages: Message[];
  service?: 'anthropic';
  system?: string;
  temperature?: number;
};

export async function getChatCompletion({
  service = 'anthropic',
  ...input
}: GetChatCompletionInput): Promise<string> {
  const result = match(service)
    .with('anthropic', () => {
      return getChatCompletionWithAnthropic(input);
    })
    .exhaustive();

  return result;
}

const AnthropicResponse = z.object({
  content: z.object({ text: z.string().trim().min(1) }).array(),
  id: z.string().trim().min(1),
});

async function getChatCompletionWithAnthropic({
  maxTokens,
  messages,
  system,
  temperature,
}: Omit<GetChatCompletionInput, 'service'>) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    body: JSON.stringify({
      messages,
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: maxTokens,
      system,
      temperature,
    }),
    headers: {
      'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
    },
    method: 'post',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to fetch chat completion from Anthropic.')
      .withContext({ response: json, status: response.status });
  }

  const result = AnthropicResponse.parse(json);

  return result.content[0].text;
}
