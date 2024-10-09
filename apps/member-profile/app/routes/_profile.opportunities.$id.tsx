import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import dayjs from 'dayjs';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { emojify } from 'node-emoji';

import { db } from '@oyster/db';
import { Modal } from '@oyster/ui';

import {
  SlackMessage,
  SlackMessageCard,
} from '@/shared/components/slack-message';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  // channelId={opportunity.channelId}
  // messageId={opportunity.id}
  // postedAt={opportunity.postedAt}
  // posterFirstName={opportunity.posterFirstName || ''}
  // posterLastName={opportunity.posterLastName || ''}
  // posterProfilePicture={opportunity.posterProfilePicture || ''}
  // text={opportunity.text || ''}

  const opportunity = await db
    .selectFrom('opportunities')
    .leftJoin('students', 'students.id', 'opportunities.postedBy')
    .leftJoin('slackMessages', (join) => {
      return join
        .onRef('slackMessages.channelId', '=', 'opportunities.slackChannelId')
        .onRef('slackMessages.id', '=', 'opportunities.slackMessageId');
    })
    .select([
      'opportunities.description',
      'opportunities.expiresAt as closeDate',
      'opportunities.id',
      'opportunities.title',
      'opportunities.type',
      'slackMessages.channelId as slackMessageChannelId',
      'slackMessages.id as slackMessageId',
      'slackMessages.createdAt as slackMessagePostedAt',
      'slackMessages.text as slackMessageText',
      'students.firstName as posterFirstName',
      'students.lastName as posterLastName',
      'students.profilePicture as posterProfilePicture',

      ({ ref }) => {
        const field = ref('opportunities.expiresAt');
        const format = 'YYYY-MM-DD';

        return sql<string>`to_char(${field}, ${format})`.as('closeDate');
      },

      (eb) => {
        return eb
          .selectFrom('opportunityTagAssociations')
          .leftJoin(
            'opportunityTags',
            'opportunityTags.id',
            'opportunityTagAssociations.tagId'
          )
          .whereRef('opportunityId', '=', 'opportunities.id')
          .select(({ fn, ref }) => {
            const object = jsonBuildObject({
              id: ref('opportunityTags.id'),
              name: ref('opportunityTags.name'),
            });

            return fn
              .jsonAgg(sql`${object} order by ${ref('name')} asc`)
              .$castTo<Array<{ id: string; name: string }>>()
              .as('tags');
          })
          .as('tags');
      },
    ])
    .where('opportunities.id', '=', params.id as string)
    .executeTakeFirst();

  if (!opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are trying to edit does not exist.',
    });
  }

  Object.assign(opportunity, {
    slackMessageText: emojify(opportunity.slackMessageText || '', {
      fallback: '',
    }),
    slackMessagePostedAt: dayjs().to(opportunity.slackMessagePostedAt),
  });

  return json({ opportunity });
}

export async function action() {
  return json({});
}

export default function EditOpportunity() {
  const { opportunity } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>{opportunity.title}</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <SlackMessageCard
        channelId={opportunity.slackMessageChannelId || ''}
        messageId={opportunity.id}
        postedAt={opportunity.slackMessagePostedAt || ''}
        posterFirstName={opportunity.posterFirstName || ''}
        posterLastName={opportunity.posterLastName || ''}
        posterProfilePicture={opportunity.posterProfilePicture || ''}
        text={opportunity.slackMessageText || ''}
      />
    </Modal>
  );
}
