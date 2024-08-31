import { match } from 'ts-pattern';
import { z } from 'zod';

import { ColorStackError } from '@/shared/errors';
import { fail, type Result, success } from '@/shared/utils/core.utils';
import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY as string;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;

// Instances

// Generic Rate Limiter(s)

/**
 * @see https://docs.anthropic.com/en/api/rate-limits#rate-limits
 */
const anthropicRateLimiter = new RateLimiter('anthropic:requests', {
  rateLimit: 1000,
  rateLimitWindow: 60,
});

// Constants

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1';
const OPENAI_API_URL = 'https://api.openai.com/v1';

// Core

// "Create Embedding"

const createEmbeddingRateLimiter = new RateLimiter('openai:embeddings', {
  rateLimit: 3000,
  rateLimitWindow: 60 - 1,
});

/**
 * An embedding is a vector representation of a text that can be easily
 * consumed by ML models and algorithms. It can be used to represent the
 * semantic meaning of the text.
 */
type Embedding = number[];

/**
 * The maximum length of a text that can be embedded. Typically a token is
 * roughly ~4 characters, but we'll use 3 to be safe.
 *
 * @see https://platform.openai.com/docs/guides/embeddings/embedding-models
 */
const MAX_EMBEDDING_LENGTH = 8192 * 3;

/**
 * Creates an embedding for a given text using OpenAI.
 *
 * By default, we use the `text-embedding-3-small` model, which outputs vectors
 * with 1536 dimensions.
 *
 * @param text - The text to create an embedding for.
 * @returns The embedding for the text.
 *
 * @see https://platform.openai.com/docs/api-reference/embeddings/create
 * @see https://platform.openai.com/docs/guides/embeddings
 * @see https://platform.openai.com/docs/models/embeddings
 */
export async function createEmbedding(
  text: string
): Promise<Result<Embedding>> {
  await createEmbeddingRateLimiter.process();

  if (text.length > MAX_EMBEDDING_LENGTH) {
    text = text.slice(0, MAX_EMBEDDING_LENGTH);
  }

  const response = await fetch(OPENAI_API_URL + '/embeddings', {
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const json = await response.json();

  if (!response.ok) {
    const error = new ColorStackError()
      .withMessage('Failed to create embedding with OpenAI.')
      .withContext({ ...json, status: response.status })
      .report();

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  const embedding = json.data[0].embedding;

  return success(embedding);
}

// "Get Chat Completion"

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

type SystemPrompt = {
  cache?: true;
  text: string;
  type: 'text';
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
  system: SystemPrompt[];

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
  system: _system,
  temperature = 0.5,
}: GetChatCompletionInput): Promise<Result<string>> {
  await anthropicRateLimiter.process();

  const system = _system.map(({ cache, ...prompt }) => {
    return {
      text: prompt.text,
      type: prompt.type,

      // This will cache this prompt for 5 minutes...
      ...(cache && {
        cache_control: { type: 'ephemeral' },
      }),
    };
  });

  const response = await fetch(ANTHROPIC_API_URL + '/messages', {
    body: JSON.stringify({
      messages,
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: maxTokens,
      system,
      temperature,
    }),
    headers: {
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
    },
    method: 'POST',
  });

  const json = await response.json();

  console.log(json.usage);

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
