import type { Request } from 'express';

export type RawBodyRequest = Request & { rawBody?: Buffer };
