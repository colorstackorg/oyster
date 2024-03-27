import { Application } from '@colorstack/types';

import { db } from '@/infrastructure/database';

type UpdateApplicationEmailInput = Pick<Application, 'email' | 'id'>;

export async function updateEmailApplication({
  email,
  id,
}: UpdateApplicationEmailInput) {
  const existingApplication = await db
    .selectFrom('applications')
    .where('email', 'ilike', email)
    .where('id', '!=', id)
    .executeTakeFirst();

  if (existingApplication) {
    return new Error(
      'There is another application that exists with this email.'
    );
  }

  await db
    .updateTable('applications')
    .set({ email })
    .where('id', '=', id)
    .execute();
}
