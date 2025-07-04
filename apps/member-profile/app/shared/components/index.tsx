// This will export all the smaller components that don't particularly
// need their own file.

import { Briefcase } from 'react-feather';
import { generatePath, Link } from 'react-router';

import { Text } from '@oyster/ui';
import {
  FilterEmptyMessage,
  FilterItem,
  FilterList,
  FilterPopover,
  FilterRoot,
  FilterSearch,
  FilterTrigger,
  useFilterContext,
} from '@oyster/ui/filter';
import { toEscapedString } from '@oyster/utils';

import { Route } from '@/shared/constants';

// Company Column

export function CompanyColumn({
  companyId,
  companyLogo,
  companyName,
}: CompanyLinkProps) {
  if (!companyId || !companyName) {
    return null;
  }

  return (
    <CompanyLink
      companyId={companyId}
      companyLogo={companyLogo}
      companyName={companyName}
    />
  );
}

type CompanyLinkProps = {
  companyId: string | null;
  companyLogo: string | null;
  companyName: string | null;
};

export function CompanyLink({
  companyId,
  companyLogo,
  companyName,
}: CompanyLinkProps) {
  if (!companyId || !companyName) {
    return null;
  }

  return (
    <Link
      className="flex w-fit max-w-full items-center gap-2 hover:underline"
      target="_blank"
      to={generatePath(Route['/companies/:id'], { id: companyId })}
    >
      <div className="aspect-square h-8 w-8 rounded-lg border border-gray-200 p-1">
        <img
          alt={companyName}
          className="h-full w-full rounded-md object-contain"
          src={companyLogo as string}
        />
      </div>

      <Text as="span" className="truncate" variant="sm">
        {companyName}
      </Text>
    </Link>
  );
}

// Company Filter

type CompanyForFilter = {
  count?: string | number;
  id: string;
  imageUrl: string | null;
  name: string;
};

type CompanyFilterProps = {
  allCompanies: CompanyForFilter[];
  emptyMessage: string;
  selectedCompany?: Pick<CompanyForFilter, 'id' | 'name'>;
};

export function CompanyFilter({
  allCompanies,
  emptyMessage,
  selectedCompany,
}: CompanyFilterProps) {
  return (
    <FilterRoot
      name="company"
      selectedValues={
        selectedCompany
          ? [
              {
                color: 'gray-100',
                label: selectedCompany.name,
                value: selectedCompany.id,
              },
            ]
          : []
      }
    >
      <FilterTrigger icon={<Briefcase />}>Company</FilterTrigger>

      <FilterPopover>
        <FilterSearch />
        <CompanyFilterList
          allCompanies={allCompanies}
          emptyMessage={emptyMessage}
        />
      </FilterPopover>
    </FilterRoot>
  );
}

function CompanyFilterList({ allCompanies, emptyMessage }: CompanyFilterProps) {
  const { search } = useFilterContext();

  const regex = new RegExp(toEscapedString(search), 'i');

  const filteredCompanies = allCompanies.filter((company) => {
    return regex.test(company.name);
  });

  if (!filteredCompanies.length) {
    return <FilterEmptyMessage>{emptyMessage}</FilterEmptyMessage>;
  }

  return (
    <FilterList>
      {filteredCompanies.map(({ count, id, name }) => {
        const label = count ? `${name} (${count})` : name;

        return <FilterItem key={id} label={label} value={id} />;
      })}
    </FilterList>
  );
}
