import { z } from 'zod';

import { Student } from './student';
import { Email, Entity } from './types';

// Enums

export const EmailMarketingPlatform = z.enum(['mailchimp']);

// Schemas

export const EmailList = Entity.extend({
  name: z.string().min(1),
  platform: EmailMarketingPlatform,
});

export const EmailCampaign = Entity.extend({
  archiveUrl: z.string().url().optional(),
  content: z.string().min(1).catch(''),

  /**
   * This is the date that the campaign's activity (opens + clicks) was last
   * synced. Whenever we poll the Mailchimp API for opens + clicks, we will
   * only get activity that happened after this date.
   */
  lastSyncedAt: z.date().optional(),

  listId: EmailList.shape.id,
  platform: EmailMarketingPlatform,
  sentAt: z.date().optional(),
  sentCount: z.number().gte(0).optional(),
  subject: z.string().min(1),
  title: z.string().optional(),
});

export const EmailCampaignLink = Entity.extend({
  campaignId: EmailCampaign.shape.id,
  platform: EmailMarketingPlatform,
  url: z.preprocess((value) => {
    return typeof value === 'string' ? value.replace(/\s/g, '') : value;
  }, z.string().url()),
});

export const EmailCampaignOpen = Entity.extend({
  campaignId: EmailCampaign.shape.id,
  email: Email,
  openedAt: z.date(),
  platform: EmailMarketingPlatform,
  studentId: Student.shape.id.optional(),
});

export const EmailCampaignClick = Entity.extend({
  campaignId: EmailCampaign.shape.id,
  clickedAt: z.date(),
  email: Email,
  linkId: EmailCampaignLink.shape.id,
  platform: EmailMarketingPlatform,
  studentId: Student.shape.id.optional(),
});

// Types

export type EmailCampaign = z.infer<typeof EmailCampaign>;
export type EmailCampaignClick = z.infer<typeof EmailCampaignClick>;
export type EmailCampaignLink = z.infer<typeof EmailCampaignLink>;
export type EmailCampaignOpen = z.infer<typeof EmailCampaignOpen>;
export type EmailList = z.infer<typeof EmailList>;
export type EmailMarketingPlatform = z.infer<typeof EmailMarketingPlatform>;
