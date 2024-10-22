import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  Form as RemixForm,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from '@remix-run/react';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { useRef, useState } from 'react';
import { Bookmark, Check, ChevronDown, Plus, Tag } from 'react-feather';

import { db } from '@oyster/db';
import {
  cx,
  Dashboard,
  getButtonCn,
  IconButton,
  Input,
  Pill,
  ProfilePicture,
  Table,
  type TableColumnProps,
  Text,
  useOnClickOutside,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { searchParams } = new URL(request.url);
  const memberId = user(session);

  const tagsFromSearch = searchParams.getAll('tag');

  const [tags, opportunities] = await Promise.all([
    db
      .selectFrom('opportunityTags')
      .select(['id', 'name'])
      .orderBy('name', 'asc')
      .execute(),

    db
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
      .$if(!!tagsFromSearch.length, (qb) => {
        return qb.where((eb) => {
          return eb.exists((eb) => {
            return eb
              .selectFrom('opportunityTagAssociations')
              .leftJoin(
                'opportunityTags',
                'opportunityTags.id',
                'opportunityTagAssociations.tagId'
              )
              .whereRef(
                'opportunityTagAssociations.opportunityId',
                '=',
                'opportunities.id'
              )
              .groupBy('opportunities.id')
              .having(
                sql`array_agg(opportunity_tags.name)`,
                '@>',
                sql<string[]>`${tagsFromSearch}`
              );
          });
        });
      })
      .orderBy('opportunities.createdAt', 'desc')
      .execute(),
  ]);

  return json({
    opportunities,
    tags,
  });
}

export default function OpportunitiesPage() {
  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Opportunities 💰</Dashboard.Title>
      </Dashboard.Header>

      <Dashboard.Subheader>
        <TagFilter />
      </Dashboard.Subheader>

      <OpportunitiesTable />

      <Outlet />
    </>
  );
}

// TODO: Convert to popover.
function TagFilter() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { tags: allTags } = useLoaderData<typeof loader>();

  const filteredTags = allTags.filter((tag) => {
    return tag.name.toLowerCase().startsWith(search.toLowerCase());
  });

  useOnClickOutside(ref, () => {
    setOpen(false);
  });

  const tags = searchParams.getAll('tag');

  const currentTagElements = tags.length ? (
    <ul className="flex items-center gap-1">
      {tags.map((tag) => {
        return (
          <li key={tag}>
            <Pill color="pink-100">{tag}</Pill>
          </li>
        );
      })}
    </ul>
  ) : null;

  // sort the checked ones to the top

  return (
    <div className="relative" ref={ref}>
      <button
        className={cx(
          'flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm',
          'focus:border-primary'
        )}
        onClick={() => {
          setOpen((value) => !value);
        }}
        type="button"
      >
        <Tag className="text-primary" size={16} /> <span>Tags</span>
        {!!tags.length && currentTagElements}
        <ChevronDown className="ml-2 text-primary" size={16} />
      </button>

      <div
        className="absolute top-full z-10 mt-1 flex max-h-60 w-max flex-col gap-2 overflow-auto rounded-lg border border-gray-300 bg-white p-2 data-[open=false]:hidden"
        data-open={open}
      >
        <input
          autoComplete="off"
          autoFocus
          className="border-b border-b-gray-300 p-2 text-sm"
          name="search"
          onChange={(e) => {
            setSearch(e.currentTarget.value);
          }}
          placeholder="Search..."
          type="text"
        />

        {filteredTags.length ? (
          <ul>
            {allTags
              .filter((tag) => {
                return tag.name.toLowerCase().includes(search.toLowerCase());
              })
              .map((tag) => {
                return <TagItem key={tag.id} value={tag.name} />;
              })}
          </ul>
        ) : (
          <div className="p-2">
            <Text color="gray-500" variant="sm">
              No tags found.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}

function TagItem({ value }: { value: string }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const tags = searchParams.getAll('tag');

  return (
    <li className="rounded-lg hover:bg-gray-50">
      <button
        className="flex w-full items-center justify-between gap-4 px-2 py-3 text-left text-sm"
        onClick={(e) => {
          setSearchParams((params) => {
            if (params.getAll('tag').includes(e.currentTarget.value)) {
              params.delete('tag', e.currentTarget.value);
            } else {
              params.append('tag', e.currentTarget.value);
            }

            return params;
          });
        }}
        value={value}
      >
        {value}{' '}
        <Check
          className="text-primary data-[checked=false]:invisible"
          data-checked={tags.includes(value)}
          size={20}
        />
      </button>
    </li>
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
    {
      size: '80',
      sticky: true,
      render: (opportunity) => {
        return (
          <div className="mx-auto flex w-fit items-center gap-2">
            <RemixForm
              action={generatePath('/opportunities/:id/bookmark', {
                id: opportunity.id,
              })}
              method="post"
              navigate={false}
            >
              <Text
                className="flex items-center gap-0.5 text-gray-300"
                variant="sm"
              >
                <IconButton
                  className="hover:bg-gray-100 hover:text-amber-400 data-[bookmarked=true]:text-amber-400"
                  data-bookmarked={!!opportunity.bookmarked}
                  icon={
                    <Bookmark
                      color="currentColor"
                      fill={opportunity.bookmarked ? 'currentColor' : 'none'}
                      size={20}
                    />
                  }
                  name="action"
                  type="submit"
                  value="bookmark"
                />
                {opportunity.bookmarks}
              </Text>

              <input
                type="hidden"
                name="opportunityId"
                value={opportunity.id}
              />
            </RemixForm>
          </div>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={opportunities}
      emptyMessage="No opportunities found."
      onRowClick={(row) => {
        navigate(generatePath(Route['/opportunities/:id'], { id: row.id }));
      }}
    />
  );
}
