import { db } from '@oyster/db';

import { type AddEventRecordingLinkInput } from '@/modules/events/events.types';

export async function addEventRecordingLink(
  id: string,
  { recordingLink }: AddEventRecordingLinkInput
) {
  await db
    .updateTable('events')
    .set({ recordingLink })
    .where('id', '=', id)
    .executeTakeFirst();
}
