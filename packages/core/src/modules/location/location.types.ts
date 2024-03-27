import { z } from 'zod';

export const Country = z.object({
  code: z.string().trim().length(3),
  demonym: z.string().trim().min(1),
  flagEmoji: z.string().trim().min(1),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().trim().min(1),
  region: z.string().trim().min(1),
  subregion: z.string().trim().min(1).nullable(),
});

export type Country = z.infer<typeof Country>;
