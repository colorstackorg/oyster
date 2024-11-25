import { db } from '@oyster/db';

import { type ListSearchParams } from '@/shared/types';

type ListSlackMessagesOptions = {
  include?: {
    poster?: boolean;
    reactions?: boolean;
  };
  orderBy?: 'most_reactions';
  pagination: Pick<ListSearchParams, 'limit' | 'page'>;
  where: {
    channelId?: string;
    threadId?: null;
    sentAfter?: Date;
    sentBefore?: Date;
  };
};

export async function listSlackMessages({
  include,
  orderBy,
  pagination,
  where,
}: ListSlackMessagesOptions) {
  const messages = await db
    .selectFrom('slackMessages as messages')
    .select([
      'messages.channelId',
      'messages.createdAt',
      'messages.id',
      'messages.text',
    ])
    .$if(!!include?.poster, (qb) => {
      return qb
        .leftJoin('students', 'students.id', 'messages.studentId')
        .select([
          'students.firstName as posterFirstName',
          'students.lastName as posterLastName',
          'students.profilePicture as posterProfilePicture',
        ]);
    })
    .$if(!!where.channelId, (qb) => {
      return qb.where('messages.channelId', '=', where.channelId!);
    })
    .$if(!!where.sentAfter, (qb) => {
      return qb.where('messages.createdAt', '>=', where.sentAfter!);
    })
    .$if(!!where.sentBefore, (qb) => {
      return qb.where('messages.createdAt', '<=', where.sentBefore!);
    })
    .$if(where.threadId === null, (qb) => {
      return qb.where('messages.threadId', 'is', null);
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
    .orderBy('messages.createdAt', 'desc')
    .limit(pagination.limit)
    .offset((pagination.page - 1) * pagination.limit)
    .execute();

  return messages;
}
