import { match } from 'ts-pattern';
import { z } from 'zod';

import { ColorStackError } from '@/shared/errors';
import { fail, type Result, success } from '@/shared/utils/core.utils';
import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY as string;

// Rate Limiter

/**
 * @see https://docs.anthropic.com/en/api/rate-limits#rate-limits
 */
const anthropicRateLimiter = new RateLimiter('anthropic:requests', {
  rateLimit: 1000,
  rateLimitWindow: 60,
});

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

type ChatMessage = {
  content: string | ContentBlock[];
  role: 'assistant' | 'user';
};

type GetChatCompletionInput = {
  /**
   * The maximum number of tokens to generate. The maximum value is 8192.
   *
   * @example 1000
   * @example 8192
   */
  maxTokens: number;

  /**
   * The messages to use as context for the completion. The last message should
   * be the user's message.
   */
  messages: ChatMessage[];

  /**
   * The system prompt to use for the completion. This can be used to provide
   * additional context to the AI model, such as the role of the assistant.
   */
  system?: string;

  /**
   * The temperature to use for the completion. This controls the randomness of
   * the output. The higher the temperature, the more random the output. The
   * default value is 0.5.
   *
   * @example 0.1
   * @example 0.5
   * @example 1
   */
  temperature?: number;
};

const AnthropicResponse = z.object({
  content: z.object({ text: z.string().trim().min(1) }).array(),
  id: z.string().trim().min(1),
});

/**
 * Returns a chat completion using AI. For now, we're using the Anthropic API,
 * but that is subject to change in the future.
 *
 * We should also explore streaming completions in order to reduce the latency
 * of the chat completions.
 *
 * @see https://docs.anthropic.com/en/api/messages
 */
export async function getChatCompletion({
  maxTokens,
  messages,
  system,
  temperature = 0.5,
}: GetChatCompletionInput): Promise<Result<string>> {
  await anthropicRateLimiter.process();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    body: JSON.stringify({
      messages,
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: maxTokens,
      system,
      temperature,
    }),
    headers: {
      // This allows us to use up to 8192 tokens for a single completion.
      'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
    },
    method: 'post',
  });

  const json = await response.json();

  if (!response.ok) {
    const message = match(response.status)
      .with(429, () => {
        return 'We have reached the rate limit with the Anthropic API. Please try again in 1-2 minutes.';
      })
      .with(529, () => {
        return 'The Anthropic API is temporarily overloaded down. Please try again in a bit.';
      })
      .otherwise(() => {
        return 'Failed to fetch chat completion from Anthropic.';
      });

    const error = new ColorStackError()
      .withMessage(message)
      .withContext({ json, status: response.status })
      .report();

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  const result = AnthropicResponse.parse(json);

  const message = result.content[0].text;

  return success(message);
}
