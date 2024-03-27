import { id } from '@colorstack/utils';

import { db } from '@/infrastructure/database';
import { CreateSurveyInput } from '../survey.types';

export async function createSurvey({
  description,
  eventId,
  title,
}: CreateSurveyInput) {
  await db
    .insertInto('surveys')
    .values({
      description,
      eventId,
      id: id(),
      title,
    })
    .execute();
}
