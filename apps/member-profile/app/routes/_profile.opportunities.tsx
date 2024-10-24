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
import React, {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  Bookmark,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Circle,
  Tag,
  X,
  Zap,
} from 'react-feather';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import {
  type AccentColor,
  cx,
  Dashboard,
  getButtonCn,
  Pill,
  type PillProps,
  ProfilePicture,
  setInputValue,
  Table,
  type TableColumnProps,
  Text,
  useOnClickOutside,
} from '@oyster/ui';
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
            .select(['id', 'name'])
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
  return (
    <Link
      className="line-clamp-1 flex w-fit items-center gap-2 hover:underline"
      target="_blank"
      to={generatePath(Route['/companies/:id'], { id: companyId })}
    >
      <div className="h-8 w-8 rounded-lg border border-gray-200 p-1">
        <img
          alt={companyName as string}
          className="aspect-square h-full w-full rounded-md"
          src={companyLogo as string}
        />
      </div>

      <Text variant="sm">{companyName}</Text>
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

function ClearFiltersButton() {
  const [_, setSearchParams] = useSearchParams();

  return (
    <button
      className="flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm"
      onClick={() => {
        setSearchParams({});
      }}
      type="button"
    >
      Clear Filters <X className="text-gray-500" size={16} />
    </button>
  );
}

function BookmarkFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const bookmarked = searchParams.has('bookmarked');

  return (
    <FilterButton
      active={bookmarked}
      icon={<Bookmark />}
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
    >
      Bookmarked
    </FilterButton>
  );
}

function CompanyFilter() {
  return (
    <FilterContainer>
      <FilterButton icon={<Briefcase />} popover>
        Company
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <CompanyList />
      </FilterPopover>
    </FilterContainer>
  );
}

function CompanyList() {
  const { companies, filteredCompany } = useLoaderData<typeof loader>();
  const { search } = useContext(FilterContext);

  const matchedCompanies = companies.filter((company) => {
    return company.name.toLowerCase().startsWith(search.toLowerCase());
  });

  return matchedCompanies.length ? (
    <ul className="overflow-auto">
      {matchedCompanies.map((company) => {
        return (
          <PopoverItem
            checked={company.id === filteredCompany?.id}
            key={company.id}
            name="company"
            value={company.name}
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
  );
}

function StatusFilter() {
  const [searchParams] = useSearchParams();

  const status = searchParams.get('status');

  const options: FilterValue[] = [
    { color: 'red-100', label: 'All' },
    { color: 'pink-100', label: 'Open' },
    { color: 'lime-100', label: 'Expired' },
  ];

  const selectedValues = options.filter((option) => {
    return status === option.label;
  });

  return (
    <FilterContainer>
      <FilterButton icon={<Circle />} popover selectedValues={selectedValues}>
        Status
      </FilterButton>

      <FilterPopover>
        <ul>
          {options.map((option) => {
            return (
              <PopoverItem
                checked={status === option.label}
                color={option.color}
                key={option.label}
                name="status"
                value={option.label}
              />
            );
          })}
        </ul>
      </FilterPopover>
    </FilterContainer>
  );
}

function DateFilter() {
  const [searchParams] = useSearchParams();

  const date = searchParams.get('date');

  const options: FilterValue[] = [
    { color: 'red-100', label: 'Today' },
    { color: 'pink-100', label: 'Last Week' },
    { color: 'lime-100', label: 'Last Month' },
    { color: 'green-100', label: 'Last 3 Months' },
    { color: 'amber-100', label: 'Last 6 Months' },
  ];

  const selectedValues = options.filter((option) => {
    return date === option.label;
  });

  return (
    <FilterContainer>
      <FilterButton icon={<Calendar />} popover selectedValues={selectedValues}>
        Date Posted
      </FilterButton>

      <FilterPopover>
        <ul>
          {options.map((option) => {
            return (
              <PopoverItem
                checked={date === option.label}
                color={option.color}
                key={option.label}
                name="date"
                value={option.label}
              />
            );
          })}
        </ul>
      </FilterPopover>
    </FilterContainer>
  );
}

function TagFilter() {
  const { filteredTags } = useLoaderData<typeof loader>();

  return (
    <FilterContainer multiple>
      <FilterButton
        icon={<Tag />}
        popover
        selectedValues={filteredTags?.map((tag) => {
          return {
            color: tag.color as AccentColor,
            label: tag.name,
          };
        })}
      >
        Tags
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <TagList />
      </FilterPopover>
    </FilterContainer>
  );
}

function TagList() {
  const { tags: allTags } = useLoaderData<typeof loader>();
  const { search } = useContext(FilterContext);
  const [searchParams] = useSearchParams();

  const tagsFromSearch = searchParams.getAll('tag');

  const matchedTags = allTags.filter((tag) => {
    return tag.name.toLowerCase().startsWith(search.toLowerCase());
  });

  return matchedTags.length ? (
    <ul className="overflow-auto">
      {matchedTags.map((tag) => {
        return (
          <PopoverItem
            checked={tagsFromSearch.includes(tag.name)}
            color={tag.color as PillProps['color']}
            key={tag.id}
            name="tag"
            value={tag.name}
          />
        );
      })}
    </ul>
  ) : (
    <div className="p-2">
      <Text color="gray-500" variant="sm">
        No tags found.
      </Text>
    </div>
  );
}

// Filter Components

type FilterContext = {
  multiple?: boolean;
  open: boolean;
  search: string;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
};

const FilterContext = createContext<FilterContext>({
  multiple: false,
  open: false,
  search: '',
  setOpen: () => {},
  setSearch: () => {},
});

function FilterContainer({
  children,
  multiple,
}: PropsWithChildren<Pick<FilterContext, 'multiple'>>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  useOnClickOutside(ref, () => {
    setOpen(false);
  });

  return (
    <FilterContext.Provider
      value={{
        multiple,
        open,
        search,
        setOpen,
        setSearch,
      }}
    >
      <div className="relative" ref={ref}>
        {children}
      </div>
    </FilterContext.Provider>
  );
}

type FilterValue = {
  color: PillProps['color'];
  label: string;
};

type FilterButtonProps = PropsWithChildren<{
  active?: boolean;
  className?: string;
  icon: React.ReactElement;
  onClick?(): void;
  popover?: boolean;
  selectedValues?: FilterValue[];
}>;

function FilterButton({
  active,
  children,
  className,
  icon,
  onClick,
  popover,
  selectedValues = [],
}: FilterButtonProps) {
  const { setOpen } = useContext(FilterContext);

  icon = React.cloneElement(icon, {
    className: active ? '' : 'text-primary',
    size: 16,
  });

  const selectedList =
    selectedValues && selectedValues.length ? (
      <ul className="flex items-center gap-1">
        {selectedValues.map((value) => {
          return (
            <li key={value.label}>
              <Pill color={value.color}>{value.label}</Pill>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <button
      className={cx(
        'flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm',
        'focus:border-primary',
        active && 'border-primary bg-primary text-white',
        className
      )}
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          setOpen((value) => !value);
        }
      }}
      type="button"
    >
      {icon} {children} {selectedList}{' '}
      {popover && <ChevronDown className="ml-2 text-primary" size={16} />}
    </button>
  );
}

function FilterPopover({ children }: PropsWithChildren) {
  const { open } = useContext(FilterContext);

  if (!open) {
    return null;
  }

  return (
    <div
      className="absolute top-full z-10 mt-1 flex max-h-60 w-max flex-col gap-2 rounded-lg border border-gray-300 bg-white p-2"
      id="popover"
    >
      {children}
    </div>
  );
}

function FilterSearch() {
  const { setSearch } = useContext(FilterContext);

  return (
    <input
      autoComplete="off"
      className="border-b border-b-gray-300 p-2 text-sm"
      name="search"
      onChange={(e) => {
        setSearch(e.currentTarget.value);
      }}
      placeholder="Search..."
      type="text"
    />
  );
}

type PopoverItemProps = PropsWithChildren<{
  checked: boolean;
  color?: PillProps['color'];
  name: string;
  value: string;
}>;

function PopoverItem({ checked, color, name, value }: PopoverItemProps) {
  const [_, setSearchParams] = useSearchParams();
  const { multiple, setOpen } = useContext(FilterContext);

  return (
    <li className="rounded-lg hover:bg-gray-50">
      <button
        className="flex w-full items-center justify-between gap-4 p-2 text-left text-sm"
        onClick={(e) => {
          if (!multiple) {
            setOpen(false);
          }

          setSearchParams((params) => {
            if (multiple) {
              if (params.getAll(name).includes(e.currentTarget.value)) {
                params.delete(name, e.currentTarget.value);
              } else {
                params.append(name, e.currentTarget.value);
              }

              return params;
            }

            if (params.get(name) === e.currentTarget.value) {
              params.delete(name);
            } else {
              params.set(name, e.currentTarget.value);
            }

            return params;
          });

          const popoverElement = (e.target as Element).closest('#popover');

          const searchElement = popoverElement?.querySelector(
            'input[name="search"]'
          );

          if (searchElement) {
            setInputValue(searchElement as HTMLInputElement, '');
          }
        }}
        value={value}
      >
        {color ? <Pill color={color}>{value}</Pill> : value}
        <Check
          className="text-primary data-[checked=false]:invisible"
          data-checked={checked}
          size={20}
        />
      </button>
    </li>
  );
}
