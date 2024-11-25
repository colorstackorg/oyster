import { z } from 'zod';

import { Entity, Student } from '@oyster/types';

const SlackChannelType = {
  DIRECT_MESSAGE: 'direct_message',
  GROUP_MESSAGE: 'group_message',
  PUBLIC_CHANNEL: 'public_channel',
  PRIVATE_CHANNEL: 'private_channel',
} as const;

export const SlackChannel = z.object({
  createdAt: Entity.shape.createdAt,
  deletedAt: Entity.shape.deletedAt,
  id: Entity.shape.id,
  name: z.string().min(1),
  type: z.nativeEnum(SlackChannelType),
});

export type SlackChannel = z.infer<typeof SlackChannel>;

export const SlackReaction = z.object({
  createdAt: Entity.shape.createdAt,
  channelId: z.string().min(1),
  messageId: z.string().min(1),
  reaction: z.string().min(1),
  studentId: Student.shape.id.optional(),
  userId: z.string().min(1),
});

export type SlackReaction = z.infer<typeof SlackReaction>;

export const SlackMessage = z.object({
  channelId: SlackChannel.shape.id,
  createdAt: Entity.shape.createdAt,
  deletedAt: Entity.shape.deletedAt,
  id: Entity.shape.id,

  /**
   * If this is populated, it means this message is a reply to another message,
   * and the value is the ID of the message being replied to.
   */
  threadId: z.string().min(1).optional(),

  studentId: Student.shape.id.optional(),
  text: z.string().optional(),
  userId: z.string().min(1),
});

export type SlackMessage = z.infer<typeof SlackMessage>;
