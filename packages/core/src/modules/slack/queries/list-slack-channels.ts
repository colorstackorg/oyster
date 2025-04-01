import { db } from '@oyster/db';

export async function listSlackChannels(search?: string) {
  return await db
    .selectFrom('slackChannels')
    .selectAll()
    .$if(!!search, (qb) => qb.where('name', 'ilike', `%${search}%`))
    .orderBy('name', 'asc')
    .execute();
}
