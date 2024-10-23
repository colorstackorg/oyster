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
import { Bookmark, Edit } from 'react-feather';

import { db } from '@oyster/db';
import { getIconButtonCn, Modal, Pill, Text } from '@oyster/ui';

import {
  BookmarkButton,
  BookmarkForm,
} from '@/routes/_profile.opportunities.$id_.bookmark';
import { SlackMessageCard } from '@/shared/components/slack-message';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

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

      (eb) => {
        return eb
          .selectFrom('opportunityBookmarks')
          .whereRef('opportunityId', '=', 'opportunities.id')
          .select((eb) => {
            return eb.fn.countAll<string>().as('count');
          })
          .as('bookmarks');
      },

      (eb) => {
        return eb
          .exists(() => {
            return eb
              .selectFrom('opportunityBookmarks')
              .whereRef('opportunityId', '=', 'opportunities.id')
              .where('opportunityBookmarks.studentId', '=', memberId);
          })
          .as('bookmarked');
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

          <BookmarkForm id={opportunity.id}>
            <Text className="inline" variant="lg">
              <span className="mr-2">{opportunity.title}</span>
              <span className="inline-flex align-top">
                <BookmarkButton bookmarked={!!opportunity.bookmarked} />
              </span>
            </Text>
          </BookmarkForm>
        </div>

        <div className="flex items-center gap-[inherit]">
          <Link
            className={getIconButtonCn({
              backgroundColor: 'gray-100',
              backgroundColorOnHover: 'gray-200',
            })}
            to={generatePath(Route['/opportunities/:id/edit'], {
              id: opportunity.id,
            })}
          >
            <Edit />
          </Link>

          <div className="h-6 w-[1px] bg-gray-100" />

          <Modal.CloseButton />
        </div>
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
