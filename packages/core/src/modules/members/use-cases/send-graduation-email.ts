/* eslint-disable prettier/prettier */
import { sql } from 'kysely';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';


export async function sendEmailChangeEmail(
  _: GetBullJobData<'student.graduation.email'>
) {
  const graduatingTime = sql<number | string>`
    extract(year from graduation_date) - extract(year from current_date)
  `;

  const members = await db
    .selectFrom('students')
    .select(['email', 'firstName', graduatingTime.as('years')])

    // we want to send an email to students who are graduating in
    // a year
    .where(graduatingTime, '=', 1)
    .where( 'email', 'like', '%@%.edu')
    .execute();

    // No need to send an email if there are no members who are graduating
    // in less than a year or in a year
    if (!members.length) {
      return;
    }

    members.forEach(({ email, firstName, years }) => {
      job('notification.email.send', {
        name: 'student-graduating',
        data: { firstName, graduatingYear: new Date().getFullYear(), years: Number(years) },
        to: email,
      });
    });
  }
