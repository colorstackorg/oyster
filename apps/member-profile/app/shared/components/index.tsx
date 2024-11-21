// This will export all the smaller components that don't particularly
// need their own file.

import { generatePath, Link } from '@remix-run/react';
import { Briefcase } from 'react-feather';

import { Text } from '@oyster/ui';
import {
  FilterButton,
  FilterEmptyMessage,
  FilterItem,
  FilterPopover,
  FilterSearch,
  useFilterContext,
} from '@oyster/ui/filter';
import { FilterRoot } from '@oyster/ui/filter';

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
      <div className="h-8 w-8 rounded-lg border border-gray-200 p-1">
        <img
          alt={companyName}
          className="aspect-square h-full w-full rounded-md"
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
    <FilterRoot>
      <FilterButton
        icon={<Briefcase />}
        popover
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
        Company
      </FilterButton>

      <FilterPopover>
        <FilterSearch />
        <CompanyFilterList
          allCompanies={allCompanies}
          emptyMessage={emptyMessage}
          selectedCompany={selectedCompany}
        />
      </FilterPopover>
    </FilterRoot>
  );
}

function CompanyFilterList({
  allCompanies,
  emptyMessage,
  selectedCompany,
}: CompanyFilterProps) {
  const { search } = useFilterContext();

  const filteredCompanies = allCompanies.filter((company) => {
    return new RegExp(search, 'i').test(company.name);
  });

  if (!filteredCompanies.length) {
    return <FilterEmptyMessage>{emptyMessage}</FilterEmptyMessage>;
  }

  return (
    <ul className="overflow-auto">
      {filteredCompanies.map((company) => {
        return (
          <FilterItem
            checked={company.id === selectedCompany?.id}
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
