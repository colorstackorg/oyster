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
import { Bookmark, Calendar, Tag, Zap } from 'react-feather';

import { track } from '@oyster/core/mixpanel';
import { db } from '@oyster/db';
import {
  type AccentColor,
  Button,
  Dashboard,
  Pagination,
  Pill,
  ProfilePicture,
  Table,
  type TableColumnProps,
  Text,
} from '@oyster/ui';
import {
  FilterEmptyMessage,
  FilterItem,
  FilterList,
  FilterPopover,
  FilterRoot,
  FilterSearch,
  FilterTrigger,
  type FilterValue,
  ResetFiltersButton,
  useFilterContext,
} from '@oyster/ui/filter';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { toEscapedString } from '@oyster/utils';

import {
  BookmarkButton,
  BookmarkForm,
} from '@/routes/_profile.opportunities.$id_.bookmark';
import { CompanyColumn, CompanyFilter } from '@/shared/components';
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
    return undefined;
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
    .selectFrom('opportunities')
    .innerJoin('companies', 'companies.id', 'opportunities.companyId')
    .select([
      'companies.id',
      'companies.name',
      'companies.imageUrl',
      ({ fn }) => fn.countAll<string>().as('count'),
    ])
    .where('opportunities.expiresAt', '>', new Date())
    .groupBy(['companies.id', 'companies.name', 'companies.imageUrl'])
    .orderBy('count', 'desc')
    .execute();

  return companies;
}

async function listAllTags() {
  const tags = await db
    .selectFrom('opportunities')
    .innerJoin(
      'opportunityTagAssociations',
      'opportunityTagAssociations.opportunityId',
      'opportunities.id'
    )
    .innerJoin(
      'opportunityTags',
      'opportunityTags.id',
      'opportunityTagAssociations.tagId'
    )
    .select([
      'opportunityTags.color',
      'opportunityTags.id',
      'opportunityTags.name',
      ({ fn }) => fn.countAll<string>().as('count'),
    ])
    .where('opportunities.expiresAt', '>', new Date())
    .groupBy([
      'opportunityTags.color',
      'opportunityTags.id',
      'opportunityTags.name',
    ])
    .orderBy('count', 'desc')
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
  const { bookmarked, company, since } = Object.fromEntries(searchParams);

  const tags = searchParams.getAll('tag');

  const query = db
    .selectFrom('opportunities')
    .leftJoin('companies', 'companies.id', 'opportunities.companyId')
    .where('opportunities.expiresAt', '>', new Date())
    .where('opportunities.refinedAt', 'is not', null)
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

  const [{ count }, _opportunities] = await Promise.all([
    query
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),

    query
      .leftJoin('students', 'students.id', 'opportunities.postedBy')
      .select([
        'companies.id as companyId',
        'companies.name as companyName',
        'companies.imageUrl as companyLogo',
        'opportunities.createdAt',
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

  const opportunities = _opportunities.map(({ createdAt, ...opportunity }) => {
    return {
      ...opportunity,
      sharedAt: dayjs().to(createdAt),
    };
  });

  return {
    opportunities,
    totalOpportunities: Number(count),
  };
}

// Page

export default function OpportunitiesPage() {
  const { allCompanies, appliedCompany } = useLoaderData<typeof loader>();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Opportunities 💰</Dashboard.Title>
      </Dashboard.Header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkFilter />
          <TagFilter />
          <CompanyFilter
            allCompanies={allCompanies}
            emptyMessage="No companies found that are linked to opportunities."
            selectedCompany={appliedCompany}
          />
          <DatePostedFilter />
          <ResetFiltersButton />
        </div>
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
      size: '200',
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
        if (
          !opportunity.posterId ||
          !opportunity.posterFirstName ||
          !opportunity.posterLastName
        ) {
          return null;
        }

        const initials =
          opportunity.posterFirstName[0] + opportunity.posterLastName[0];

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
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
      displayName: '',
      size: '80',
      render: (opportunity) => {
        return (
          <Text as="span" color="gray-500" variant="sm">
            {opportunity.sharedAt} ago
          </Text>
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

function TagsColumn({ id, tags }: OpportunityInView) {
  const [searchParams] = useSearchParams();

  tags = tags || [];

  if (!tags.length) {
    return (
      <Button.Slot size="sm" variant="secondary">
        <Link
          to={{
            pathname: generatePath(Route['/opportunities/:id/refine'], { id }),
            search: searchParams.toString(),
          }}
        >
          Generate Tags <Zap size={16} />
        </Link>
      </Button.Slot>
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
    <FilterTrigger
      active={bookmarked}
      icon={<Bookmark />}
      onClick={toggleBookmark}
      popover={false}
    >
      Bookmarked
    </FilterTrigger>
  );
}

function TagFilter() {
  const { appliedTags } = useLoaderData<typeof loader>();

  return (
    <FilterRoot
      multiple
      name="tag"
      selectedValues={appliedTags.map((tag) => {
        return {
          color: tag.color as AccentColor,
          label: tag.name,
          value: tag.id,
        };
      })}
    >
      <FilterTrigger icon={<Tag />}>Tags</FilterTrigger>

      <FilterPopover>
        <FilterSearch />
        <TagList />
      </FilterPopover>
    </FilterRoot>
  );
}

function TagList() {
  const { allTags } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  const regex = new RegExp(toEscapedString(search), 'i');

  const filteredTags = allTags.filter((tag) => {
    return regex.test(tag.name);
  });

  if (!filteredTags.length) {
    return <FilterEmptyMessage>No tags found.</FilterEmptyMessage>;
  }

  return (
    <FilterList>
      {filteredTags.map((tag) => {
        const label = tag.count ? `${tag.name} (${tag.count})` : tag.name;

        return (
          <FilterItem
            color={tag.color as AccentColor}
            key={tag.id}
            label={label}
            value={tag.id}
          />
        );
      })}
    </FilterList>
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
    <FilterRoot name="since" selectedValues={selectedValues}>
      <FilterTrigger icon={<Calendar />}>Date Posted</FilterTrigger>

      <FilterPopover>
        <FilterList>
          {options.map((option) => {
            return (
              <FilterItem
                color={option.color}
                key={option.value}
                label={option.label}
                value={option.value}
              />
            );
          })}
        </FilterList>
      </FilterPopover>
    </FilterRoot>
  );
}
