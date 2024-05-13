import { db } from '@/infrastructure/database';
import { type AddEventRecordingLinkInput } from '@/modules/event/event.types';

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
