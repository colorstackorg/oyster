import { z } from 'zod';

import { Student } from './student';
import { Entity } from './types';

// Schemas

export const ProfileView = z.object({
  id: Entity.shape.id,
  profileViewedId: Student.shape.id,
  viewedAt: z.coerce.date(),
  viewerId: Student.shape.id,
});

// Types

export type ProfileView = z.infer<typeof ProfileView>;
