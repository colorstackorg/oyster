import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  type FieldProps,
  useDelayedValue,
} from '@oyster/ui';

import type { SearchCompaniesResult } from '@/routes/companies';
import { type Company } from '@/shared/core.ui';

type CompanyComboboxProps = FieldProps<Pick<Company, 'crunchbaseId' | 'name'>>;

export function CompanyCombobox({ defaultValue, name }: CompanyComboboxProps) {
  const [search, setSearch] = useState<string>(defaultValue?.name || '');

  const delayedSearch = useDelayedValue(search, 250);

  const fetcher = useFetcher<SearchCompaniesResult>();

  useEffect(() => {
    fetcher.submit(
      { search: delayedSearch },
      {
        action: '/companies',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const companies = fetcher.data?.companies || [];

  return (
    <Combobox
      defaultDisplayValue={defaultValue?.name}
      defaultValue={defaultValue?.crunchbaseId}
    >
      <ComboboxInput
        id={name}
        name={name}
        onChange={(e) => setSearch(e.currentTarget.value)}
        required
      />

      <ComboboxPopover>
        <ul>
          {companies.map((company) => {
            return (
              <ComboboxItem
                className="whitespace-nowrap [&>button]:flex [&>button]:items-center"
                displayValue={company.name}
                key={company.crunchbaseId}
                value={company.crunchbaseId}
              >
                <img
                  alt={company.name}
                  className="mr-2 h-6 w-6 rounded"
                  src={company.imageUrl}
                />
                {company.name}
              </ComboboxItem>
            );
          })}
        </ul>
      </ComboboxPopover>
    </Combobox>
  );
}
