import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  generatePath,
  Link,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { emojify } from 'node-emoji';

import { db } from '@oyster/db';
import { Divider, Modal, Pill, Text } from '@oyster/ui';

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

      (eb) => {
        return eb
          .selectFrom('opportunityCompanies')
          .leftJoin(
            'companies',
            'companies.id',
            'opportunityCompanies.companyId'
          )
          .whereRef('opportunityId', '=', 'opportunities.id')
          .select(({ fn, ref }) => {
            const object = jsonBuildObject({
              id: ref('companies.id'),
              name: ref('companies.name'),
              logo: ref('companies.imageUrl'),
            });

            return fn
              .jsonAgg(object)
              .$castTo<Array<{ id: string; name: string; logo: string }>>()
              .as('companies');
          })
          .as('companies');
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

  const company = opportunity.companies?.[0];

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <div className="flex flex-col gap-2">
          {company && (
            <Link
              className="w-fit cursor-pointer hover:underline"
              target="_blank"
              to={generatePath(Route['/companies/:id'], {
                id: company.id,
              })}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg border border-gray-200 p-1">
                  <img
                    alt={company.name}
                    className="aspect-square h-full w-full rounded-md"
                    src={company.logo as string}
                  />
                </div>

                <Text variant="sm">{company.name}</Text>
              </div>
            </Link>
          )}

          <Text variant="lg">{opportunity.title}</Text>
        </div>
        <Modal.CloseButton />
      </Modal.Header>

      {opportunity.tags && (
        <ul className="flex flex-wrap items-center gap-1">
          {opportunity.tags.map((tag) => {
            return (
              <li key={tag.id}>
                <Pill color="pink-100">{tag.name}</Pill>
              </li>
            );
          })}
        </ul>
      )}

      {opportunity.description && (
        <Text color="gray-500">{opportunity.description}</Text>
      )}

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
