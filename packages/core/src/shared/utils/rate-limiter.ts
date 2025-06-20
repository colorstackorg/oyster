import { sleep } from '@oyster/utils';

import { redis } from '@/infrastructure/redis';

type RateLimitOptions = {
  rateLimit: number;

  /**
   * The rate limit window in *seconds*.
   *
   * @example 60 // 1 Minute
   * @example 60 * 60 // 1 Hour
   * @example 60 * 60 * 24 // 24 Day
   */
  rateLimitWindow: number | null;
};

export class RateLimiter {
  private rateLimit: RateLimitOptions['rateLimit'];
  private rateLimitWindow: RateLimitOptions['rateLimitWindow'];

  constructor(
    protected key: string,
    options: RateLimitOptions
  ) {
    this.rateLimit = options.rateLimit;
    this.rateLimitWindow = options.rateLimitWindow;
  }

  /**
   * Processes the rate limit for the current thread.
   *
   * If the rate limit count has reached the rate limit count limit, then this
   * function will block the current thread until the rate limit window is
   * complete.
   *
   * It also increments the rate limit count.
   */
  async process() {
    if (!this.rateLimitWindow) {
      throw new Error('Window must be set to call rateLimiter.process().');
    }

    while (true) {
      const count = await redis.incr(this.key);

      if (count === 1) {
        await redis.expire(this.key, this.rateLimitWindow);
      }

      // If the thread can grab the lock, then we don't need to worry about
      // decrementing that count because the key will expire (and thus reset
      // automatically).
      if (count <= this.rateLimit) {
        return;
      }

      await redis.decr(this.key);

      const ttl = await redis.ttl(this.key);

      await sleep(ttl * 1000);
    }
  }

  /**
   * Executes the given function when this thread is available within the
   * rate limit. This function will return whatever the given function returns.
   *
   * If the limit is reached, then this function will block the current thread
   * for 1 second and then try again.
   *
   * @param fn - Function to execute when the rate limit is available.
   */
  async doWhenAvailable<T>(fn: () => T): Promise<T> {
    if (this.rateLimitWindow) {
      throw new Error(
        'Window cannot be set when calling rateLimiter.doWhenAvailable().'
      );
    }

    while (true) {
      const count = await redis.incr(this.key);

      // If the count is less than or equal to the rate limit, then we can
      // execute the function.
      if (count <= this.rateLimit) {
        try {
          const result = await fn();

          return result;
        } finally {
          // If the try block is successful, we'll still decrement the count.
          // If the try block throws an error, we'll throw the error (because
          // we don't have a catch block), and we'll still decrement the count.
          await redis.decr(this.key);
        }
      } else {
        await redis.decr(this.key);
      }

      // If the count is greater than the rate limit, then we'll wait for a
      // random amount of time between 0 and 2 seconds.
      await sleep(Math.random() * 2000);
    }
  }
}
