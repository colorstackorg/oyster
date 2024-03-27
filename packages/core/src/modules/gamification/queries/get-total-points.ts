import { db } from '@/infrastructure/database';

type GetTotalPointsOptions = {
  occurredAfter?: Date | null;
};

export async function getTotalPoints(
  memberId: string,
  options: GetTotalPointsOptions = {}
) {
  const row = await db
    .selectFrom('completedActivities')
    .select((eb) => eb.fn.sum('points').as('points'))
    .where('studentId', '=', memberId)
    .$if(!!options.occurredAfter, (eb) => {
      return eb.where('occurredAt', '>=', options.occurredAfter!);
    })
    .executeTakeFirstOrThrow();

  const points = Number(row.points);

  return points;
}
