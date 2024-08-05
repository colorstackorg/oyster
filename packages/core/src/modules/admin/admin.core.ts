import { type DB, db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type SelectExpression } from '@/shared/types';
import { fail, success } from '@/shared/utils/core.utils';
import { type AddAdminInput, AdminRole } from './admin.types';

// Types

type Admin = DB['admins'];
type AdminSelection = SelectExpression<DB, 'admins'>;

// Queries

type GetAdminOptions<Selection> = {
  select: Selection[];
  where: Partial<Pick<Admin, 'email' | 'id' | 'memberId'>>;
};

export async function getAdmin<Selection extends AdminSelection>({
  select,
  where,
}: GetAdminOptions<Selection>) {
  const admin = await db
    .selectFrom('admins')
    .select(select)
    .$if(!!where.email, (qb) => {
      return qb.where('admins.email', 'ilike', where.email as string);
    })
    .$if(!!where.id, (qb) => {
      return qb.where('admins.id', '=', where.id as string);
    })
    .$if(!!where.memberId, (qb) => {
      return qb.where('admins.memberId', '=', where.memberId as string);
    })
    .where('admins.deletedAt', 'is', null)
    .executeTakeFirst();

  return admin;
}

/**
 * Returns whether or not the given member is also an admin. This is useful
 * for giving additional permissions to certain users in the Member Profile (ie:
 * ability to edit all resources).
 *
 * @param memberId - The ID of the member to check if they are an admin.
 */
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
 * Adds a new ColorStack admin, which grants the user access to the Admin
 * Dashboard. The acting admin must have the required role to add an admin with
 * the specified role.
 *
 * A corresponding member record will also be linked to the admin if the email
 * matches an existing member.
 */
export async function addAdmin({
  actor,
  email,
  firstName,
  lastName,
  role,
}: AddAdminInput) {
  const actingAdmin = await getAdmin({
    select: ['admins.role'],
    where: { id: actor },
  });

  if (!actingAdmin) {
    return fail({
      code: 404,
      error: 'The acting admin does not exist.',
    });
  }

  const hasPermission = doesAdminHavePermission({
    minimumRole: role,
    role: actingAdmin.role as AdminRole,
  });

  if (!hasPermission) {
    return fail({
      code: 403,
      error: 'You do not have permission to add an admin with this role.',
    });
  }

  const existingAdmin = await getAdmin({
    select: [],
    where: { email },
  });

  if (existingAdmin) {
    return fail({
      code: 409,
      error: 'An admin already exists with this email.',
    });
  }

  const adminId = id();

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('admins')
      .values((eb) => {
        // If the admin also happens to be a member of ColorStack, then we can
        // link the records upon creation.
        const memberId = eb
          .selectFrom('students')
          .select('students.id')
          .leftJoin('studentEmails', 'studentEmails.studentId', 'students.id')
          .where('studentEmails.email', 'ilike', email)
          .limit(1);

        return {
          email,
          firstName,
          id: adminId,
          lastName,
          memberId,
          role,
        };
      })
      .execute();
  });

  // TODO: Send an email to new admin...

  return success({ id: adminId });
}

/**
 * 'Removes' ColorStack admin. This will revoke the user access to the Admin
 *  Dashboard. Note that it shouldn't delete the record entirely, but it should
 *  set the deletedAt timestamp, effectively archiving the admin).
 */
export async function removeAdmin({ id }: { id: string }) {
  const admin = await db
    .updateTable('admins')
    .set({
      deletedAt: new Date(), // not sure of the format
    })
    .where('id', '=', id as string)
    .executeTakeFirst();

  if (admin) {
    return new Error('The admin does not exist.');
  }
}

// Helpers

type DoesAdminHavePermissionInput = {
  minimumRole: AdminRole;
  role: AdminRole;
};

/**
 * Returns whether or not the given admin has the required role to perform the
 * action.
 *
 * @param minimumRole - The minimum role required to perform the action.
 * @param role - The role of the acting admin.
 *
 * @example
 * ```ts
 * // true
 * const hasPermission = doesAdminHavePermission({
 *   minimumRole: 'admin',
 *   role: 'owner',
 * });
 * ```
 *
 * @example
 * ```ts
 * // true
 * const hasPermission = doesAdminHavePermission({
 *   minimumRole: 'admin',
 *   role: 'admin',
 * });
 * ```
 *
 * @example
 * ```ts
 * // false
 * const hasPermission = doesAdminHavePermission({
 *   minimumRole: 'owner',
 *   role: 'admin',
 * });
 * ```
 */
export function doesAdminHavePermission({
  minimumRole,
  role,
}: DoesAdminHavePermissionInput) {
  const roles = [AdminRole.AMBASSADOR, AdminRole.ADMIN, AdminRole.OWNER];

  const minimumRoleIndex = roles.indexOf(minimumRole);
  const roleIndex = roles.indexOf(role);

  return roleIndex >= minimumRoleIndex;
}
