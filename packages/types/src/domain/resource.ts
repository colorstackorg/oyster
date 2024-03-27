import { z } from 'zod';

import { ExtractValue } from '../shared/types';
import { Student } from './student';
import { Entity } from './types';

// Enums

export const ResourceStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// Schemas

export const Resource = Entity.extend({
  name: z.string().min(1),
  status: z.nativeEnum(ResourceStatus),
});

export const ResourceUser = Entity.extend({
  email: Student.shape.email.optional(),
  resourceId: Resource.shape.id,
  studentId: Student.shape.id.optional(),
  usedAt: z.date().optional(),
});

// Types

export type Resource = z.infer<typeof Resource>;
export type ResourceStatus = ExtractValue<typeof ResourceStatus>;
export type ResourceUser = z.infer<typeof ResourceUser>;
