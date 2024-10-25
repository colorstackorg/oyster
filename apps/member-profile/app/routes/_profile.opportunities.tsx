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
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import {
  Bookmark,
  Briefcase,
  Calendar,
  Circle,
  Tag,
  X,
  Zap,
} from 'react-feather';

import { track } from '@oyster/core/mixpanel';
import { db } from '@oyster/db';
import {
  type AccentColor,
  Dashboard,
  getButtonCn,
  Pagination,
  Pill,
  ProfilePicture,
  Table,
  type TableColumnProps,
  Text,
} from '@oyster/ui';
import {
  FilterButton,
  FilterEmptyMessage,
  FilterItem,
  FilterPopover,
  FilterRoot,
  FilterSearch,
  type FilterValue,
  useFilterContext,
} from '@oyster/ui/filter';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

import {
  BookmarkButton,
  BookmarkForm,
} from '@/routes/_profile.opportunities.$id_.bookmark';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const { pathname, searchParams } = new URL(request.url);
  const { limit: _limit, page: _page } = Object.fromEntries(searchParams);

  const limit = parseInt(_limit) || 50;
  const page = parseInt(_page) || 1;

  const [
    appliedCompany,
    appliedTags,
    allCompanies,
    allTags,
    { opportunities, totalOpportunities },
  ] = await Promise.all([
    getAppliedCompany(searchParams),
    getAppliedTags(searchParams),
    listAllCompanies(),
    listAllTags(),
    listOpportunities(searchParams, { limit, memberId, page }),
  ]);

  if (pathname === Route['/opportunities']) {
    track({
      event: 'Page Viewed',
      properties: { Page: 'Opportunities' },
      request,
      user: memberId,
    });
  }

  return json({
    allCompanies,
    allTags,
    appliedCompany,
    appliedTags,
    limit,
    opportunities,
    page,
    totalOpportunities,
  });
}

async function getAppliedCompany(searchParams: URLSearchParams) {
  const companyFromSearch = searchParams.get('company');

  if (!companyFromSearch) {
    return null;
  }

  const company = await db
    .selectFrom('companies')
    .select(['id', 'name', 'imageUrl'])
    .where((eb) => {
      return eb.or([
        eb('companies.id', '=', companyFromSearch),
        eb('companies.name', 'ilike', companyFromSearch),
      ]);
    })
    .executeTakeFirst();

  return company;
}

async function getAppliedTags(searchParams: URLSearchParams) {
  const tagsFromSearch = searchParams.getAll('tag');

  if (!tagsFromSearch.length) {
    return [];
  }

  const tags = await db
    .selectFrom('opportunityTags')
    .select(['color', 'id', 'name'])
    .where((eb) => {
      return eb.or([
        eb('opportunityTags.id', 'in', tagsFromSearch),
        eb('opportunityTags.name', 'in', tagsFromSearch),
      ]);
    })
    .execute();

  return tags;
}

async function listAllCompanies() {
  const companies = await db
    .selectFrom('companies')
    .select(['id', 'name', 'imageUrl'])
    .where((eb) => {
      return eb.exists(() => {
        return eb
          .selectFrom('opportunities')
          .whereRef('opportunities.companyId', '=', 'companies.id');
      });
    })
    .orderBy('name', 'asc')
    .execute();

  return companies;
}

async function listAllTags() {
  const tags = await db
    .selectFrom('opportunityTags')
    .select(['color', 'id', 'name'])
    .orderBy('name', 'asc')
    .execute();

  return tags;
}

type ListOpportunitiesOptions = {
  limit: number;
  memberId: string;
  page: number;
};

async function listOpportunities(
  searchParams: URLSearchParams,
  { limit, page, memberId }: ListOpportunitiesOptions
) {
  const { bookmarked, company, since, status } =
    Object.fromEntries(searchParams);

  const tags = searchParams.getAll('tag');

  const query = db
    .selectFrom('opportunities')
    .leftJoin('companies', 'companies.id', 'opportunities.companyId')
    .$if(!!bookmarked, (qb) => {
      return qb.where((eb) => {
        return eb.exists(() => {
          return eb
            .selectFrom('opportunityBookmarks as bookmarks')
            .whereRef('bookmarks.opportunityId', '=', 'opportunities.id')
            .where('bookmarks.studentId', '=', memberId);
        });
      });
    })
    .$if(!!company, (qb) => {
      return qb.where((eb) => {
        return eb.or([
          eb('companies.id', '=', company),
          eb('companies.name', 'ilike', company),
        ]);
      });
    })
    .$if(!!since, (qb) => {
      const daysAgo = parseInt(since);

      if (!daysAgo) {
        return qb;
      }

      const date = dayjs().subtract(daysAgo, 'day').toDate();

      return qb.where('opportunities.createdAt', '>=', date);
    })
    .$if(!!status, (qb) => {
      const regex = new RegExp(status as string, 'i');

      if (regex.test('open')) {
        return qb.where('opportunities.expiresAt', '>', new Date());
      }

      if (regex.test('expired')) {
        return qb.where('opportunities.expiresAt', '<', new Date());
      }

      return qb;
    })
    .$if(!!tags.length, (qb) => {
      return qb.where((eb) => {
        const conditions = tags.map((tag) => {
          return eb.exists(() => {
            return eb
              .selectFrom('opportunityTagAssociations as associations')
              .innerJoin(
                'opportunityTags as tags',
                'tags.id',
                'associations.tagId'
              )
              .whereRef('opportunityId', '=', 'opportunities.id')
              .where((eb) => {
                return eb.or([
                  eb('tags.name', '=', tag),
                  eb('tags.id', '=', tag),
                ]);
              });
          });
        });

        return eb.and(conditions);
      });
    });

  const [{ count }, opportunities] = await Promise.all([
    query
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),

    query
      .leftJoin('students', 'students.id', 'opportunities.postedBy')
      .select([
        'companies.id as companyId',
        'companies.name as companyName',
        'companies.imageUrl as companyLogo',
        'opportunities.id',
        'opportunities.title',
        'students.id as posterId',
        'students.firstName as posterFirstName',
        'students.lastName as posterLastName',
        'students.profilePicture as posterProfilePicture',

        (eb) => {
          return eb
            .selectFrom('opportunityTags as tags')
            .leftJoin(
              'opportunityTagAssociations as associations',
              'associations.tagId',
              'tags.id'
            )
            .whereRef('associations.opportunityId', '=', 'opportunities.id')
            .select(({ fn, ref }) => {
              const object = jsonBuildObject({
                color: ref('tags.color'),
                id: ref('tags.id'),
                name: ref('tags.name'),
              });

              type TagObject = {
                color: AccentColor;
                id: string;
                name: string;
              };

              return fn
                .jsonAgg(sql`${object} order by ${ref('tags.name')} asc`)
                .$castTo<TagObject[]>()
                .as('tags');
            })
            .as('tags');
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
      .orderBy('opportunities.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),
  ]);

  return {
    opportunities,
    totalOpportunities: Number(count),
  };
}

// Page

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
          <DatePostedFilter />
          <StatusFilter />
        </div>

        <ClearFiltersButton />
      </div>

      <OpportunitiesTable />
      <OpportunitiesPagination />
      <Outlet />
    </>
  );
}

// Table

type OpportunityInView = SerializeFrom<typeof loader>['opportunities'][number];

function OpportunitiesTable() {
  const { opportunities } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const columns: TableColumnProps<OpportunityInView>[] = [
    {
      displayName: 'Company',
      size: '240',
      render: (opportunity) => <CompanyColumn {...opportunity} />,
    },
    {
      displayName: 'Title',
      size: '400',
      render: (opportunity) => opportunity.title,
    },
    {
      displayName: 'Tags',
      size: '360',
      render: (opportunity) => <TagsColumn {...opportunity} />,
    },
    {
      displayName: 'Posted By',
      size: '120',
      render: (opportunity) => {
        const initials =
          opportunity.posterFirstName![0] + opportunity.posterLastName![0];

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                className="cursor-pointer"
                target="_blank"
                to={generatePath(Route['/directory/:id'], {
                  id: opportunity.posterId,
                })}
              >
                <ProfilePicture
                  initials={initials}
                  src={opportunity.posterProfilePicture || undefined}
                  size="32"
                />
              </Link>
            </TooltipTrigger>

            <TooltipContent>
              <TooltipText>
                {opportunity.posterFirstName} {opportunity.posterLastName}
              </TooltipText>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      size: '80',
      sticky: true,
      render: (opportunity) => {
        return (
          <BookmarkForm opportunityId={opportunity.id}>
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

function CompanyColumn({
  companyId,
  companyLogo,
  companyName,
}: OpportunityInView) {
  if (!companyId || !companyName) {
    return null;
  }

  return (
    <Link
      className="flex w-fit max-w-full items-center gap-2 hover:underline"
      target="_blank"
      to={generatePath(Route['/companies/:id'], { id: companyId })}
    >
      <div className="h-8 w-8 flex-shrink-0 rounded-lg border border-gray-200 p-1">
        <img
          alt={companyName as string}
          className="aspect-square h-full w-full rounded-md"
          src={companyLogo as string}
        />
      </div>

      <span className="truncate text-sm">{companyName}</span>
    </Link>
  );
}

function TagsColumn({ id, tags }: OpportunityInView) {
  const [searchParams] = useSearchParams();

  tags = tags || [];

  if (!tags.length) {
    return (
      <Link
        className={getButtonCn({ size: 'xs', variant: 'secondary' })}
        to={{
          pathname: generatePath(Route['/opportunities/:id/refine'], { id }),
          search: searchParams.toString(),
        }}
      >
        Generate Tags <Zap size={16} />
      </Link>
    );
  }

  const visibleTags = tags.slice(0, 3);
  const remainingTags = tags.slice(3);

  return (
    <div className="flex items-center gap-2 pr-2">
      <ul className="overflow-scroll line-clamp-1 flex items-center gap-1">
        {visibleTags.map((tag) => {
          return (
            <li key={tag.id}>
              <Pill color={tag.color}>{tag.name}</Pill>
            </li>
          );
        })}
      </ul>

      {!!remainingTags.length && (
        <Text className="text-gray-500" variant="sm">
          +{remainingTags.length} more...
        </Text>
      )}
    </div>
  );
}

function OpportunitiesPagination() {
  const { limit, opportunities, page, totalOpportunities } =
    useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={opportunities.length}
      page={page}
      pageSize={limit}
      totalCount={totalOpportunities}
    />
  );
}

// Filters

function BookmarkFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const bookmarked = searchParams.has('bookmarked');

  function toggleBookmark() {
    setSearchParams((params) => {
      params.delete('page');

      if (params.has('bookmarked')) {
        params.delete('bookmarked');
      } else {
        params.set('bookmarked', '1');
      }

      return params;
    });
  }

  return (
    <FilterButton
      active={bookmarked}
      icon={<Bookmark />}
      onClick={toggleBookmark}
    >
      Bookmarked
    </FilterButton>
  );
}

function TagFilter() {
  const { appliedTags } = useLoaderData<typeof loader>();

  return (
    <FilterRoot multiple>
      <FilterButton
        icon={<Tag />}
        popover
        selectedValues={appliedTags.map((tag) => {
          return {
            color: tag.color as AccentColor,
            label: tag.name,
            value: tag.id,
          };
        })}
      >
        Tags
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <TagList />
      </FilterPopover>
    </FilterRoot>
  );
}

function TagList() {
  const { allTags, appliedTags } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  const filteredTags = allTags.filter((tag) => {
    return new RegExp(search, 'i').test(tag.name);
  });

  if (!filteredTags.length) {
    return <FilterEmptyMessage>No tags found.</FilterEmptyMessage>;
  }

  return (
    <ul className="overflow-auto">
      {filteredTags.map((tag) => {
        const checked = appliedTags.some((appliedTag) => {
          return appliedTag.id === tag.id;
        });

        return (
          <FilterItem
            checked={checked}
            color={tag.color as AccentColor}
            key={tag.id}
            label={tag.name}
            name="tag"
            value={tag.name}
          />
        );
      })}
    </ul>
  );
}

function CompanyFilter() {
  const { appliedCompany } = useLoaderData<typeof loader>();

  return (
    <FilterRoot>
      <FilterButton
        icon={<Briefcase />}
        popover
        selectedValues={
          appliedCompany
            ? [
                {
                  color: 'gray-100',
                  label: appliedCompany.name,
                  value: appliedCompany.id,
                },
              ]
            : []
        }
      >
        Company
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <CompanyList />
      </FilterPopover>
    </FilterRoot>
  );
}

function CompanyList() {
  const { allCompanies, appliedCompany } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  const filteredCompanies = allCompanies.filter((company) => {
    return new RegExp(search, 'i').test(company.name);
  });

  if (!filteredCompanies.length) {
    return (
      <FilterEmptyMessage>
        No companies found that have been linked to opportunities.
      </FilterEmptyMessage>
    );
  }

  return (
    <ul className="overflow-auto">
      {filteredCompanies.map((company) => {
        return (
          <FilterItem
            checked={company.id === appliedCompany?.id}
            key={company.id}
            label={company.name}
            name="company"
            value={company.id}
          />
        );
      })}
    </ul>
  );
}

function DatePostedFilter() {
  const [searchParams] = useSearchParams();

  const since = searchParams.get('since');

  const options: FilterValue[] = [
    { color: 'lime-100', label: 'Last 24 Hours', value: '1' },
    { color: 'green-100', label: 'Last 7 Days', value: '7' },
    { color: 'cyan-100', label: 'Last 30 Days', value: '30' },
    { color: 'blue-100', label: 'Last 90 Days', value: '90' },
  ];

  const selectedValues = options.filter((option) => {
    return since === option.value;
  });

  return (
    <FilterRoot>
      <FilterButton icon={<Calendar />} popover selectedValues={selectedValues}>
        Date Posted
      </FilterButton>

      <FilterPopover>
        <ul>
          {options.map((option) => {
            return (
              <FilterItem
                checked={since === option.value}
                color={option.color}
                key={option.value}
                label={option.label}
                name="since"
                value={option.value}
              />
            );
          })}
        </ul>
      </FilterPopover>
    </FilterRoot>
  );
}

function StatusFilter() {
  const [searchParams] = useSearchParams();

  const status = searchParams.get('status');

  const options: FilterValue[] = [
    { color: 'orange-100', label: 'Open', value: 'open' },
    { color: 'red-100', label: 'Expired', value: 'expired' },
  ];

  const selectedValues = options.filter((option) => {
    return status === option.value;
  });

  return (
    <FilterRoot>
      <FilterButton icon={<Circle />} popover selectedValues={selectedValues}>
        Status
      </FilterButton>

      <FilterPopover>
        <ul>
          {options.map((option) => {
            return (
              <FilterItem
                checked={status === option.value}
                color={option.color}
                key={option.value}
                label={option.label}
                name="status"
                value={option.value}
              />
            );
          })}
        </ul>
      </FilterPopover>
    </FilterRoot>
  );
}

function ClearFiltersButton() {
  const [searchParams, setSearchParams] = useSearchParams();

  if (searchParams.size === 0) {
    return null;
  }

  if (searchParams.size === 1 && searchParams.has('page')) {
    return null;
  }

  return (
    <button
      className="flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm hover:bg-gray-50 active:bg-gray-100"
      onClick={() => {
        setSearchParams({});
      }}
      type="button"
    >
      Clear Filters <X className="text-gray-500" size={16} />
    </button>
  );
}
