import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type AddAdminInput, AdminRole } from './admin.types';

// Queries

/**
 * Returns whether or not the given admin is an ambassador. If the admin does
 * not exist, this will return `false`.
 */
export async function isAmbassador(adminId: string) {
  const admin = await db
    .selectFrom('admins')
    .select(['role'])
    .where('id', '=', adminId)
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  if (!admin) {
    return false;
  }

  return admin.role === AdminRole.AMBASSADOR;
}

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
      'id',
      'role',
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
  lastName,
  role,
}: AddAdminInput) {
  const existingAdmin = await db
    .selectFrom('admins')
    .where('email', 'ilike', email)
    .executeTakeFirst();

  if (existingAdmin) {
    return new Error('An admin already exists with this email.');
  }

  const memberId = db
    .selectFrom('students')
    .select('students.id')
    .leftJoin('studentEmails', 'studentEmails.studentId', 'students.id')
    .where('studentEmails.email', 'ilike', email)
    .limit(1);

  await db
    .insertInto('admins')
    .values({
      email,
      firstName,
      id: id(),
      lastName,
      memberId,
      role,
    })
    .execute();
}