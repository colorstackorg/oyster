import { db } from '@oyster/db';

export async function listAdmins() {
  const admins = await db
    .selectFrom('admins')
    .select([
      'firstName',
      'lastName',
      'email',
      'isAmbassador',
      'id',
      (eb) => {
        return eb
          .case()
          .when('deletedAt', 'is not', null)
          .then(true)
          .else(false)
          .end()
          .as('isArchived');
      },
    ])
    .where('deletedAt', 'is', null) // returns only active admins
    .orderBy('createdAt', 'desc')
    .execute();

  return admins;
}
