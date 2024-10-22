import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  useLoaderData,
  useNavigate,
} from '@remix-run/react';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { useState } from 'react';
import { Bookmark, Edit, Plus } from 'react-feather';

import { db } from '@oyster/db';
import {
  Button,
  Dashboard,
  Dropdown,
  getButtonCn,
  Pill,
  ProfilePicture,
  Table,
  type TableColumnProps,
  Text,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const opportunities = await db
    .selectFrom('opportunities')
    .leftJoin('slackMessages', (join) => {
      return join
        .onRef('slackMessages.channelId', '=', 'opportunities.slackChannelId')
        .onRef('slackMessages.id', '=', 'opportunities.slackMessageId');
    })
    .leftJoin('students', 'students.id', 'opportunities.postedBy')
    .select([
      'opportunities.description',
      'opportunities.id',
      'opportunities.title',
      'opportunities.type',
      'slackMessages.text as slackMessage',
      'students.id as posterId',
      'students.firstName as posterFirstName',
      'students.lastName as posterLastName',
      'students.profilePicture as posterProfilePicture',

      ({ ref }) => {
        const field = ref('opportunities.createdAt');
        const format = 'MM/D/YY';

        return sql<string>`to_char(${field}, ${format})`.as('createdAt');
      },

      (eb) => {
        return eb
          .selectFrom('opportunityTags')
          .leftJoin(
            'opportunityTagAssociations as associations',
            'associations.tagId',
            'opportunityTags.id'
          )
          .whereRef('associations.opportunityId', '=', 'opportunities.id')
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
    .orderBy('opportunities.createdAt', 'desc')
    .execute();

  return json({
    opportunities,
  });
}

export default function OpportunitiesPage() {
  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Opportunities 💰</Dashboard.Title>
      </Dashboard.Header>

      <OpportunitiesTable />

      <Outlet />
    </>
  );
}

type OpportunityInView = SerializeFrom<typeof loader>['opportunities'][number];

function OpportunitiesTable() {
  const { opportunities } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const columns: TableColumnProps<OpportunityInView>[] = [
    {
      displayName: 'Company',
      size: '200',
      render: (opportunity) => {
        return (
          <ul>
            {(opportunity.companies || []).map((company) => {
              return (
                <li className="w-fit" key={company.id}>
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
                </li>
              );
            })}
          </ul>
        );
      },
    },
    // {
    //   displayName: 'Type',
    //   size: '120',
    //   render: (opportunity) => {
    //     return opportunity.type === 'job' ? (
    //       <Pill color="lime-100">Job</Pill>
    //     ) : (
    //       <Pill color="purple-100">{opportunity.type}</Pill>
    //     );
    //   },
    // },
    {
      displayName: 'Title',
      size: '400',
      render: (opportunity) => opportunity.title,
    },
    {
      displayName: 'Tags',
      size: '320',
      render: (opportunity) => {
        const tags = opportunity.tags || [];

        if (!tags.length) {
          return (
            <Link
              className={getButtonCn({ size: 'xs', variant: 'secondary' })}
              to={generatePath(Route['/opportunities/:id/context'], {
                id: opportunity.id,
              })}
            >
              Add Tags <Plus size={16} />
            </Link>
          );
        }

        return (
          <ul className="overflow-scroll flex items-center gap-1">
            {(opportunity.tags || []).map((tag) => {
              return (
                <li key={tag.id}>
                  <Pill color="pink-100">{tag.name}</Pill>
                </li>
              );
            })}
          </ul>
        );
      },
    },

    {
      displayName: 'Date Posted',
      size: '120',
      render: (opportunity) => opportunity.createdAt,
    },
    {
      displayName: 'Posted By',
      size: '120',
      render: (opportunity) => {
        return (
          <ProfilePicture
            initials={`${opportunity.posterFirstName} ${opportunity.posterLastName}`}
            src={opportunity.posterProfilePicture || '/default-avatar.png'}
            size="32"
          />
        );
      },
    },

    // {
    //   displayName: 'Date',
    //   size: '160',
    //   render: (event) => event.date,
    // },
    // {
    //   displayName: 'Time',
    //   render: (event) => `${event.startTime} - ${event.endTime}`,
    //   size: '200',
    // },
  ];

  return (
    <Table
      columns={columns}
      data={opportunities}
      emptyMessage="No opportunities found."
      Dropdown={OpportunityDropdown}
      onRowClick={(row) => {
        navigate(generatePath(Route['/opportunities/:id'], { id: row.id }));
      }}
    />
  );
}

function OpportunityDropdown({ id }: OpportunityInView) {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onOpen() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      {open && (
        <Table.Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link to={generatePath(Route['/opportunities/:id/edit'], { id })}>
                <Edit /> Edit Opportunity
              </Link>
            </Dropdown.Item>

            <Dropdown.Item>
              <Link to="">
                <Bookmark /> Bookmark Opportunity
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
