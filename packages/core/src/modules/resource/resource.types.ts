import { z } from 'zod';

import { type ExtractValue } from '@oyster/types';

import { ListSearchParams } from '@/shared/types';

// Types

export const ResourceType = {
  FILE: 'file',
  URL: 'url',
} as const;

export type ResourceType = ExtractValue<typeof ResourceType>;

// Domain

const Resource = z.object({
  attachments: z.unknown().transform((value) => {
    if (!value) {
      return [] as File[];
    }

    if (Array.isArray(value)) {
      return value as File[];
    }

    return [value] as File[];
  }),

  description: z
    .string()
    .trim()
    .min(1)
    .max(160, 'Description must be 160 characters or less.'),

  id: z.string().min(1),

  link: z
    .string()
    .trim()
    .startsWith('http', 'URL must start with "http://".')
    .url()
    .optional(),

  postedAt: z.coerce.date().optional(),
  postedBy: z.string().min(1),
  title: z.string().min(1),
  type: z.nativeEnum(ResourceType),
});

const Tag = z.object({
  createdAt: z.coerce.date(),
  id: z.string().min(1),
  name: z.string().trim().min(1),
});

// Queries

export const ListResourcesOrderBy = z
  .enum(['newest', 'most_upvotes'])
  .catch('newest');

export const ListResourcesWhere = z.object({
  id: z.string().min(1).optional(),
  postedAfter: z.date().optional(),
  postedBefore: z.date().optional(),
  search: ListSearchParams.shape.search,
  tags: z.string().min(1).array().catch([]),
});

export type ListResourcesOrderBy = z.infer<typeof ListResourcesOrderBy>;
export type ListResourcesWhere = z.infer<typeof ListResourcesWhere>;

// Use Case(s)

export const AddResourceInput = Resource.pick({
  attachments: true,
  description: true,
  link: true,
  postedBy: true,
  title: true,
  type: true,
}).extend({
  tags: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(',')),
});

export const CreateTagInput = Tag.pick({
  id: true,
  name: true,
});

export const DownvoteResourceInput = z.object({
  memberId: z.string().min(1),
});

export const UpdateResourceInput = AddResourceInput.omit({
  postedBy: true,
  type: true,
});

export const UpvoteResourceInput = z.object({
  memberId: z.string().min(1),
});

export const ViewResourceInput = z.object({
  memberId: z.string().min(1),
});

export type AddResourceInput = z.infer<typeof AddResourceInput>;
export type CreateTagInput = z.infer<typeof CreateTagInput>;
export type DownvoteResourceInput = z.infer<typeof DownvoteResourceInput>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceInput>;
export type UpvoteResourceInput = z.infer<typeof UpvoteResourceInput>;
export type ViewResourceInput = z.infer<typeof ViewResourceInput>;
