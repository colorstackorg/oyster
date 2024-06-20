import { type SelectExpression, sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';

import { type DB } from '@oyster/db';

import { db } from '@/infrastructure/database';
import { type ListSearchParams } from '@/shared/types';

type ListSlackMessagesOptions<Selection> = {
  include?: 'reactions'[];
  orderBy?: 'most_reactions';
  pagination: Pick<ListSearchParams, 'limit' | 'page'>;
  select: Selection[];
  where: {
    channelId?: string;
    sentAfter?: Date;
    sentBefore?: Date;
  };
};

export async function listSlackMessages<
  Selection extends SelectExpression<
    DB & { messages: DB['slackMessages'] },
    'messages'
  >,
>({
  include = [],
  orderBy,
  pagination,
  select,
  where,
}: ListSlackMessagesOptions<Selection>) {
  const messages = await db
    .selectFrom('slackMessages as messages')
    .select(select)
    // .$if(include.includes('reactions'), (qb) => {
    //   return qb.select((eb) => {
    //     return eb
    //       .selectFrom('slackReactions as reactions')
    //       .whereRef('reactions.channelId', '=', 'messages.channelId')
    //       .whereRef('reactions.messageId', '=', 'messages.id')
    //       .select(({ fn, ref }) => {
    //         const object = jsonBuildObject({
    //           count: fn.countAll<string>().as('count').expression,
    //           reaction: ref('reactions.reaction'),
    //         });

    //         return fn
    //           .jsonAgg(sql`${object} order by count desc`)
    //           .$castTo<{ count: string; reaction: string }[]>()
    //           .as('reactions');
    //       })
    //       .groupBy('reactions.reaction')
    //       .as('reactions');
    //   });
    // })
    .$if(!!where.channelId, (qb) => {
      return qb.where('messages.channelId', '=', where.channelId!);
    })
    .$if(!!where.sentAfter, (qb) => {
      return qb.where('messages.createdAt', '>=', where.sentAfter!);
    })
    .$if(!!where.sentBefore, (qb) => {
      return qb.where('messages.createdAt', '<=', where.sentBefore!);
    })
    .$if(orderBy === 'most_reactions', (qb) => {
      return qb
        .select((eb) => {
          return eb
            .selectFrom('slackReactions as reactions')
            .whereRef('reactions.channelId', '=', 'messages.channelId')
            .whereRef('reactions.messageId', '=', 'messages.id')
            .select((eb) => {
              return eb.fn.countAll<string>('reactions').as('totalReactions');
            })
            .as('totalReactions');
        })
        .orderBy('totalReactions', 'desc');
    })
    .orderBy('createdAt', 'desc')
    .limit(pagination.limit)
    .offset((pagination.page - 1) * pagination.limit)
    .execute();

  return messages;
}
