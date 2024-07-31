import { type DB, db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type SelectExpression } from '@/shared/types';
import { type AddAdminInput } from './admin.types';

// Types

type Admin = DB['admins'];
type AdminSelection = SelectExpression<DB, 'admins'>;

// Queries

type GetAdminOptions<Selection> = {
  select: Selection[];
  where: Partial<Pick<Admin, 'id' | 'memberId'>>;
};

export async function getAdmin<Selection extends AdminSelection>({
  select,
  where,
}: GetAdminOptions<Selection>) {
  const admin = await db
    .selectFrom('admins')
    .select(select)
    .$if(!!where.id, (qb) => {
      return qb.where('id', '=', where.id as string);
    })
    .$if(!!where.memberId, (qb) => {
      return qb.where('memberId', '=', where.memberId as string);
    })
    .executeTakeFirst();

  return admin;
}

export async function isMemberAdmin(memberId: string) {
  const admin = await getAdmin({
    select: [],
    where: { memberId },
  });

  return !!admin;
}

type ListAdminsOptions<Selection> = {
  select: Selection[];
};

export async function listAdmins<Selection extends AdminSelection>({
  select,
}: ListAdminsOptions<Selection>) {
  const admins = await db
    .selectFrom('admins')
    .select(select)
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
