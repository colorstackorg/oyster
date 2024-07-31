import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type AddAdminInput } from './admin.types';

// Queries

export async function isMemberAdmin(memberId: string) {
  const admin = await db
    .selectFrom('admins')
    .where('memberId', '=', memberId)
    .executeTakeFirst();

  return !!admin;
}

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
    .orderBy('createdAt', 'desc')
    .execute();

  return admins;
}

// Use Cases

/**
 * Adds a new ColorStack admin. This will grant the user access to the Admin
 * Dashboard. If an existing admin already exists with the same email, this will
 * return an `Error`.
 */
export async function addAdmin({
  email,
  firstName,
  isAmbassador,
  lastName,
}: AddAdminInput) {
  const existingAdmin = await db
    .selectFrom('admins')
    .where('email', 'ilike', email)
    .executeTakeFirst();

  if (existingAdmin) {
    return new Error('An admin already exists with this email.');
  }

  await db
    .insertInto('admins')
    .values({
      email,
      firstName,
      id: id(),
      isAmbassador,
      lastName,
    })
    .execute();
}
