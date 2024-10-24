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
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { useRef, useState } from 'react';
import {
  Bookmark,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Circle,
  Plus,
  Tag,
  X,
} from 'react-feather';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import {
  cx,
  Dashboard,
  getButtonCn,
  Pill,
  type PillProps,
  ProfilePicture,
  Table,
  type TableColumnProps,
  Text,
  useOnClickOutside,
} from '@oyster/ui';

import {
  BookmarkButton,
  BookmarkForm,
} from '@/routes/_profile.opportunities.$id_.bookmark';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { searchParams } = new URL(request.url);
  const memberId = user(session);

  const bookmarked = searchParams.has('bookmarked');
  const company = searchParams.get('company');
  const date = searchParams.get('date');
  const status = searchParams.get('status');
  const tagsFromSearch = searchParams.getAll('tag');

  const [filteredCompany, filteredTags, companies, tags, opportunities] =
    await Promise.all([
      company
        ? db
            .selectFrom('companies')
            .select(['name'])
            .where('companies.id', '=', company)
            .executeTakeFirst()
        : null,

      tagsFromSearch.length
        ? db
            .selectFrom('opportunityTags')
            .select(['color', 'id', 'name'])
            .where('opportunityTags.name', 'in', tagsFromSearch)
            .execute()
        : null,

      db
        .selectFrom('companies')
        .select(['id', 'name', 'imageUrl'])
        .orderBy('name', 'asc')
        .execute(),

      db
        .selectFrom('opportunityTags')
        .select(['color', 'id', 'name'])
        .orderBy('name', 'asc')
        .execute(),

      db
        .selectFrom('opportunities')
        .leftJoin('companies', 'companies.id', 'opportunities.companyId')
        .leftJoin('slackMessages', (join) => {
          return join
            .onRef(
              'slackMessages.channelId',
              '=',
              'opportunities.slackChannelId'
            )
            .onRef('slackMessages.id', '=', 'opportunities.slackMessageId');
        })
        .leftJoin('students', 'students.id', 'opportunities.postedBy')
        .select([
          'companies.id as companyId',
          'companies.name as companyName',
          'companies.imageUrl as companyLogo',
          'opportunities.description',
          'opportunities.id',
          'opportunities.title',
          'slackMessages.text as slackMessage',
          'students.id as posterId',
          'students.firstName as posterFirstName',
          'students.lastName as posterLastName',
          'students.profilePicture as posterProfilePicture',

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
                  color: ref('opportunityTags.color'),
                  id: ref('opportunityTags.id'),
                  name: ref('opportunityTags.name'),
                });

                return fn
                  .jsonAgg(sql`${object} order by ${ref('name')} asc`)
                  .$castTo<
                    Array<{
                      color: PillProps['color'];
                      id: string;
                      name: string;
                    }>
                  >()
                  .as('tags');
              })
              .as('tags');
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
        .$if(!!bookmarked, (qb) => {
          return qb.where((eb) => {
            return eb.exists(() => {
              return eb
                .selectFrom('opportunityBookmarks')
                .whereRef(
                  'opportunityBookmarks.opportunityId',
                  '=',
                  'opportunities.id'
                )
                .where('opportunityBookmarks.studentId', '=', memberId);
            });
          });
        })
        .$if(!!company, (qb) => {
          return qb.where('opportunities.companyId', '=', company);
        })
        .$if(!!date, (qb) => {
          if (
            ![
              'Today',
              'Last Week',
              'Last Month',
              'Last 3 Months',
              'Last 6 Months',
            ].includes(date as string)
          ) {
            return qb;
          }

          const tz = getTimezone(request);
          const startOfToday = dayjs().tz(tz).startOf('day');

          const comparison = match(date)
            .with('Today', () => {
              return startOfToday.toDate();
            })
            .with('Last Week', () => {
              return startOfToday.subtract(1, 'week').toDate();
            })
            .with('Last Month', () => {
              return startOfToday.subtract(1, 'month').toDate();
            })
            .with('Last 3 Months', () => {
              return startOfToday.subtract(3, 'month').toDate();
            })
            .with('Last 6 Months', () => {
              return startOfToday.subtract(6, 'month').toDate();
            })
            .otherwise(() => {
              return startOfToday.toDate();
            });

          return qb.where('opportunities.createdAt', '>=', comparison);
        })
        .$if(!!status, (qb) => {
          return match(status)
            .with('All', () => {
              return qb;
            })
            .with('Open', () => {
              return qb.where('opportunities.expiresAt', '>', new Date());
            })
            .with('Expired', () => {
              return qb.where('opportunities.expiresAt', '<', new Date());
            })
            .otherwise(() => {
              return qb;
            });
        })
        .orderBy('opportunities.createdAt', 'desc')
        .execute(),
    ]);

  return json({
    companies,
    filteredCompany,
    filteredTags,
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkFilter />
          <TagFilter />
          <CompanyFilter />
          <DateFilter />
          <StatusFilter />
        </div>

        <ClearFiltersButton />
      </div>

      <OpportunitiesTable />

      <Outlet />
    </>
  );
}

function ClearFiltersButton() {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <button
      className="flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm"
      onClick={() => {
        setSearchParams((params) => {
          return {};
        });
      }}
      type="button"
    >
      Clear Filters
    </button>
  );
}

function BookmarkFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const bookmarked = searchParams.has('bookmarked');

  return (
    <button
      className={cx(
        'flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm',
        bookmarked && 'border-primary bg-primary text-white'
      )}
      onClick={() => {
        setSearchParams((params) => {
          if (params.has('bookmarked')) {
            params.delete('bookmarked');
          } else {
            params.set('bookmarked', '1');
          }

          return params;
        });
      }}
      type="button"
    >
      <Bookmark className={bookmarked ? '' : 'text-primary'} size={16} />{' '}
      <span>Bookmarked</span>
    </button>
  );
}

function CompanyFilter() {
  const [open, setOpen] = useState(false);
  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const [searchParams] = useSearchParams();
  const { filteredCompany } = useLoaderData<typeof loader>();

  useOnClickOutside(ref, () => {
    setOpen(false);
  });

  const company = searchParams.get('company');

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
        <Briefcase className="text-primary" size={16} /> <span>Company</span>
        {!!filteredCompany && (
          <Pill color="pink-100">{filteredCompany.name}</Pill>
        )}
        <ChevronDown className="ml-2 text-primary" size={16} />
      </button>

      {open && <CompanyPopover />}
    </div>
  );
}

function CompanyPopover() {
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const { companies } = useLoaderData<typeof loader>();

  return (
    <div className="absolute top-full z-10 mt-1 flex max-h-60 w-max flex-col gap-2 overflow-auto rounded-lg border border-gray-300 bg-white p-2">
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

      {companies.length ? (
        <ul>
          {companies.map((company) => {
            return (
              <CompanyItem
                key={company.id}
                id={company.id}
                name={company.name}
              />
            );
          })}
        </ul>
      ) : (
        <div className="p-2">
          <Text color="gray-500" variant="sm">
            No companies found.
          </Text>
        </div>
      )}
    </div>
  );
}

function CompanyItem({ id, name }: { id: string; name: string }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const tags = searchParams.getAll('tag');

  return (
    <li className="rounded-lg hover:bg-gray-50">
      <button
        className="flex w-full items-center justify-between gap-4 px-2 py-3 text-left text-sm"
        onClick={(e) => {
          setSearchParams((params) => {
            if (params.get('company') === e.currentTarget.value) {
              params.delete('company');
            } else {
              params.set('company', e.currentTarget.value);
            }

            return params;
          });
        }}
        value={id}
      >
        {name}{' '}
        <Check
          className="text-primary data-[checked=false]:invisible"
          data-checked={tags.includes(id)}
          size={20}
        />
      </button>
    </li>
  );
}

function StatusFilter() {
  const [open, setOpen] = useState(false);
  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const [searchParams] = useSearchParams();

  useOnClickOutside(ref, () => {
    setOpen(false);
  });

  const status = searchParams.get('status');

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
        <Circle className="text-primary" size={16} /> <span>Status</span>
        {!!status && <Pill color="pink-100">{status}</Pill>}
        <ChevronDown className="ml-2 text-primary" size={16} />
      </button>

      {open && (
        <div className="absolute top-full z-10 mt-1 flex max-h-60 w-max flex-col gap-2 overflow-auto rounded-lg border border-gray-300 bg-white p-2">
          <ul>
            <StatusItem value="All" />
            <StatusItem value="Open" />
            <StatusItem value="Expired" />
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusItem({ value }: { value: string }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status');

  return (
    <li className="rounded-lg hover:bg-gray-50">
      <button
        className="flex w-full items-center justify-between gap-4 px-2 py-3 text-left text-sm"
        onClick={(e) => {
          setSearchParams((params) => {
            if (params.get('status') === e.currentTarget.value) {
              params.delete('status');
            } else {
              params.set('status', e.currentTarget.value);
            }

            return params;
          });
        }}
        value={value}
      >
        {value}{' '}
        <Check
          className="text-primary data-[checked=false]:invisible"
          data-checked={status === value}
          size={20}
        />
      </button>
    </li>
  );
}

// TODO: Convert to popover.
function DateFilter() {
  const [open, setOpen] = useState(false);
  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const [searchParams] = useSearchParams();

  useOnClickOutside(ref, () => {
    setOpen(false);
  });

  const date = searchParams.get('date');

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
        <Calendar className="text-primary" size={16} /> <span>Date Posted</span>
        {!!date && <Pill color="pink-100">{date}</Pill>}
        <ChevronDown className="ml-2 text-primary" size={16} />
      </button>

      {open && (
        <div className="absolute top-full z-10 mt-1 flex max-h-60 w-max flex-col gap-2 overflow-auto rounded-lg border border-gray-300 bg-white p-2">
          <ul>
            <DateItem value="Today" />
            <DateItem value="Last Week" />
            <DateItem value="Last Month" />
            <DateItem value="Last 3 Months" />
            <DateItem value="Last 6 Months" />
          </ul>
        </div>
      )}
    </div>
  );
}

function DateItem({ value }: { value: string }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const date = searchParams.get('date');

  return (
    <li className="rounded-lg hover:bg-gray-50">
      <button
        className="flex w-full items-center justify-between gap-4 px-2 py-3 text-left text-sm"
        onClick={(e) => {
          setSearchParams((params) => {
            if (params.get('date') === e.currentTarget.value) {
              params.delete('date');
            } else {
              params.set('date', e.currentTarget.value);
            }

            return params;
          });
        }}
        value={value}
      >
        {value}{' '}
        <Check
          className="text-primary data-[checked=false]:invisible"
          data-checked={date === value}
          size={20}
        />
      </button>
    </li>
  );
}

function TagFilter() {
  const [open, setOpen] = useState(false);
  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const [searchParams] = useSearchParams();
  const { filteredTags } = useLoaderData<typeof loader>();

  useOnClickOutside(ref, () => {
    setOpen(false);
  });

  const tags = searchParams.getAll('tag');

  const currentTagElements =
    filteredTags && filteredTags.length ? (
      <ul className="flex items-center gap-1">
        {filteredTags.map((tag) => {
          return (
            <li key={tag.id}>
              <Pill color={tag.color as PillProps['color']}>{tag.name}</Pill>
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

      {open && <TagPopover />}
    </div>
  );
}

function TagPopover() {
  const [search, setSearch] = useState('');
  const { tags: allTags } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const tagsFromSearch = searchParams.getAll('tag');

  const filteredTags = allTags.filter((tag) => {
    return tag.name.toLowerCase().startsWith(search.toLowerCase());
  });

  const selectedTags: typeof allTags = [];
  const unselectedTags: typeof allTags = [];

  filteredTags.forEach((tag) => {
    if (tagsFromSearch.includes(tag.name)) {
      selectedTags.push(tag);
    } else {
      unselectedTags.push(tag);
    }
  });

  return (
    <div className="absolute top-full z-10 mt-1 flex max-h-60 w-max flex-col gap-2 overflow-auto rounded-lg border border-gray-300 bg-white p-2">
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
          {selectedTags.map((tag) => {
            return <TagItem key={tag.id} color={tag.color} value={tag.name} />;
          })}

          {unselectedTags.map((tag) => {
            return <TagItem key={tag.id} color={tag.color} value={tag.name} />;
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
  );
}

function TagItem({ color, value }: { color: string; value: string }) {
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
        <Pill color={color as PillProps['color']}>{value}</Pill>{' '}
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const columns: TableColumnProps<OpportunityInView>[] = [
    {
      displayName: 'Company',
      size: '200',
      render: (opportunity) => {
        return (
          <Link
            className="w-fit cursor-pointer hover:underline"
            target="_blank"
            to={generatePath(Route['/companies/:id'], {
              id: opportunity.companyId,
            })}
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg border border-gray-200 p-1">
                <img
                  alt={opportunity.companyName as string}
                  className="aspect-square h-full w-full rounded-md"
                  src={opportunity.companyLogo as string}
                />
              </div>

              <Text variant="sm">{opportunity.companyName}</Text>
            </div>
          </Link>
        );
      },
    },
    {
      displayName: 'Title',
      size: '400',
      render: (opportunity) => opportunity.title,
    },
    {
      displayName: 'Tags',
      size: '360',
      render: (opportunity) => {
        const tags = opportunity.tags || [];

        if (!tags.length) {
          return (
            <Link
              className={getButtonCn({ size: 'xs', variant: 'secondary' })}
              to={{
                pathname: generatePath(Route['/opportunities/:id/refine'], {
                  id: opportunity.id,
                }),
                search: searchParams.toString(),
              }}
            >
              Add Tags <Plus size={16} />
            </Link>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <ul className="overflow-scroll line-clamp-1 flex items-center gap-1">
              {tags.slice(0, 3).map((tag) => {
                return (
                  <li key={tag.id}>
                    <Pill color={tag.color}>{tag.name}</Pill>
                  </li>
                );
              })}
            </ul>

            {tags.length > 3 ? (
              <Text className="text-gray-500" variant="sm">
                +{tags.length - 3} more...
              </Text>
            ) : null}
          </div>
        );
      },
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
          <BookmarkForm id={opportunity.id}>
            <BookmarkButton
              bookmarked={!!opportunity.bookmarked}
              className="mx-auto"
            />
          </BookmarkForm>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={opportunities}
      emptyMessage="No opportunities found."
      rowTo={(row) => {
        return {
          pathname: generatePath(Route['/opportunities/:id'], { id: row.id }),
          search: searchParams.toString(),
        };
      }}
    />
  );
}
