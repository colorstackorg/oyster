import { ExtractValue } from '@oyster/types';

export const Route = {
  ADD_EDUCATION: '/profile/education/add',
  ADD_EMAIL_FINISH: '/profile/emails/add/finish',
  ADD_EMAIL_START: '/profile/emails/add/start',
  ADD_WORK_EXPERIENCE: '/profile/work/add',
  APPLICATION: '/apply',
  APPLICATION_THANK_YOU: '/apply/thank-you',
  CHANGE_PRIMARY_EMAIL: '/profile/emails/change-primary',
  CLAIM_SWAG_PACK: '/home/claim-swag-pack',
  CLAIM_SWAG_PACK_CONFIRMATION: '/home/claim-swag-pack/confirmation',
  DELETE_EDUCATION: '/profile/education/:id/delete',
  DELETE_WORK_EXPERIENCE: '/profile/work/:id/delete',
  EDIT_WORK_EXPERIENCE: '/profile/work/:id/edit',
  LOGIN: '/login',
  LOGIN_OTP_SEND: '/login/otp/send',
  LOGIN_OTP_VERIFY: '/login/otp/verify',
  HOME: '/home',
  POINTS: '/points',

  // Directory

  '/directory': '/directory',
  '/directory/:id': '/directory/:id',
  '/directory/join': '/directory/join',
  '/directory/join/1': '/directory/join/1',
  '/directory/join/2': '/directory/join/2',
  '/directory/join/3': '/directory/join/3',
  '/directory/join/4': '/directory/join/4',
  '/directory/join/finish': '/directory/join/finish',

  // Events

  '/events': '/events',
  '/events/past': '/events/past',
  '/events/past/:id/attendees': '/events/past/:id/attendees',
  '/events/upcoming': '/events/upcoming',
  '/events/upcoming/:id/register': '/events/upcoming/:id/register',
  '/events/upcoming/:id/registrations': '/events/upcoming/:id/registrations',

  // Profile

  '/profile': '/profile',
  '/profile/education': '/profile/education',
  '/profile/education/:id/edit': '/profile/education/:id/edit',
  '/profile/emails': '/profile/emails',
  '/profile/general': '/profile/general',
  '/profile/icebreakers': '/profile/icebreakers',
  '/profile/personal': '/profile/personal',
  '/profile/socials': '/profile/socials',
  '/profile/work': '/profile/work',
} as const;

export type Route = ExtractValue<typeof Route>;
