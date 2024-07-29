import { type ExtractValue } from '@oyster/types';

export const ApplicationStatus = {
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const;

export type ApplicationStatus = ExtractValue<typeof ApplicationStatus>;
