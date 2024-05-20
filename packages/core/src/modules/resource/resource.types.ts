import { z } from 'zod';

import { ListSearchParams } from '@/shared/types';

// Domain

const Resource = z.object({
  description: z.string().trim().min(1),
  id: z.string().trim().min(1),
  lastUpdatedAt: z.coerce.date().optional(),
  link: z.string().url().optional(),
  postedAt: z.coerce.date().optional(),
  postedBy: z.string().trim().min(1),
  title: z.string().trim().min(1),
});

const ResourceTag = z.object({
  createdAt: z.coerce.date(),
  resourceId: z.string().trim().min(1),
  tagId: z.string().trim().min(1),
});

const Tag = z.object({
  createdAt: z.coerce.date(),
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

// Querie(s)

export const ListResourcesWhere = ListSearchParams.pick({
  search: true,
}).extend({
  tags: Tag.shape.id.array().catch([]),
});

export type ListResourcesWhere = z.infer<typeof ListResourcesWhere>;

// Use Case(s)

export const AddResourceInput = Resource.pick({
  description: true,
  link: true,
  postedBy: true,
  title: true,
}).extend({
  tags: Tag.shape.id.array().min(1),
});

export const CreateTagInput = Tag.pick({
  name: true,
});

export const DownvoteResourceInput = z.object({
  memberId: z.string().trim().min(1),
});

export const UpdateResourceInput = AddResourceInput.omit({
  postedBy: true,
}).partial();

export const UpvoteResourceInput = z.object({
  memberId: z.string().trim().min(1),
});

export type AddResourceInput = z.infer<typeof AddResourceInput>;
export type CreateTagInput = z.infer<typeof CreateTagInput>;
export type DownvoteResourceInput = z.infer<typeof DownvoteResourceInput>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceInput>;
export type UpvoteResourceInput = z.infer<typeof UpvoteResourceInput>;
