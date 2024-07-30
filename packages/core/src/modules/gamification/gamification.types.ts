import { z } from 'zod';

import { Entity, type ExtractValue, Student } from '@oyster/types';

// Enums

export const ActivityPeriod = {
  QUARTERLY: 'quarterly',
} as const;

// NOTE: If any of these values are changed, the unique indicies in the
// database also need to be updated.
export const ActivityType = {
  ATTEND_EVENT: 'attend_event',
  GET_ACTIVATED: 'get_activated',
  GET_RESOURCE_UPVOTE: 'get_resource_upvote',
  JOIN_MEMBER_DIRECTORY: 'join_member_directory',
  POST_RESOURCE: 'post_resource',
  REACT_TO_MESSAGE: 'react_to_message',
  REPLY_TO_THREAD: 'reply_to_thread',
  RESPOND_TO_SURVEY: 'respond_to_survey',
  REVIEW_COMPANY: 'review_company',
  SUBMIT_CENSUS_RESPONSE: 'submit_census_response',
  SUBMIT_RESUME: 'submit_resume',
  UPDATE_EDUCATION_HISTORY: 'update_education_history',
  UPDATE_WORK_HISTORY: 'update_work_history',
  UPLOAD_PROFILE_PICTURE: 'upload_profile_picture',
} as const;

export type ActivityType = ExtractValue<typeof ActivityType>;
export type ActivityPeriod = ExtractValue<typeof ActivityPeriod>;

// Schemas

export const Activity = z.object({
  createdAt: Entity.shape.createdAt,
  deletedAt: Entity.shape.deletedAt,
  description: z.string().trim().min(1).nullable().catch(null),
  id: Entity.shape.id,
  name: z.string().trim().min(1),
  period: z.nativeEnum(ActivityPeriod).nullable().catch(null),
  points: z.coerce.number().int().positive(),
  type: z.nativeEnum(ActivityType),
});

/**
 * Note: Didn't include any of the contextual fields that do exist in the
 * database, since they're not used anywhere in the codebase.
 *
 * @todo Convert to a discriminated union for better type safety.
 */
export const CompletedActivity = z.object({
  activityId: Activity.shape.id.nullable(),
  createdAt: Entity.shape.createdAt,

  /**
   * If the activity was a one-off, this will serve as the description for
   * why the points were awarded.
   *
   * @example 'Sujar gave great feedback that resulted in a nomenclature update.'
   * @example 'Glory helped find a nasty timezone bug.'
   * @example 'Samsondeen was the first person to guess a new feature that we released.'
   */
  description: z.string().trim().min(1).nullable().catch(null),

  id: Entity.shape.id,
  occurredAt: z.coerce.date(),
  points: z.coerce.number().int().positive(),
  studentId: Student.shape.id,
  type: z.union([z.nativeEnum(ActivityType), z.literal('one_off')]),
});

export type Activity = z.infer<typeof Activity>;
export type CompletedActivity = z.infer<typeof CompletedActivity>;

// Use Cases

export const CreateActivityInput = Activity.pick({
  description: true,
  name: true,
  period: true,
  points: true,
  type: true,
});

export const EditActivityInput = Activity.pick({
  description: true,
  name: true,
  period: true,
  points: true,
  type: true,
});

export const GrantPointsInput = CompletedActivity.pick({
  description: true,
  points: true,
}).extend({
  description: z.string().trim().min(1),
  memberId: Student.shape.id,
});

export type CreateActivityInput = z.infer<typeof CreateActivityInput>;
export type EditActivityInput = z.infer<typeof EditActivityInput>;
export type GrantPointsInput = z.infer<typeof GrantPointsInput>;
