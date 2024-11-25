import { type ExpressionBuilder, sql } from 'kysely';

import { type DB } from '@oyster/db';

/**
 * Builds the "full name" of a member using the first, last and preferred name!
 *
 * If there is a preferred name, it will be used in parenthesis between the
 * first/last name.
 *
 * @example
 * "Jehron Petty"
 * "Michelle Figueroa"
 * "Jehron (Jayo) Petty"
 * "Michelle (Shay) Figueroa"
 */
export function buildFullName(eb: ExpressionBuilder<DB, 'students'>) {
  const field = eb.fn<string>('concat', [
    'firstName',

    eb
      .case()
      .when('preferredName', 'is not', null)
      .then(
        eb.fn<string>('concat', [
          sql.lit(' '),
          sql.lit('('),
          eb.ref('preferredName'),
          sql.lit(')'),
          sql.lit(' '),
        ])
      )
      .else(sql.lit(' '))
      .end(),

    'lastName',
  ]);

  return field.as('fullName');
}
