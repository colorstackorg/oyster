import { type z } from 'zod';

import { Event } from '@oyster/types';

// Use Cases

export const AddEventRecordingLinkInput = Event.pick({
  recordingLink: true,
});

export type AddEventRecordingLinkInput = z.infer<
  typeof AddEventRecordingLinkInput
>;
