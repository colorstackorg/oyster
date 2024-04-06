import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { type CreateSurveyInput } from '../survey.types';

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
