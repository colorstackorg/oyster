import { useFetcher } from '@remix-run/react';
import React, { useEffect, useState } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  cx,
  Text,
  useDelayedValue,
} from '@oyster/ui';

import { type Company } from '../employment.types';

type CompanyComboboxProps = {
  defaultCompanyName?: string;
  defaultCompanyId?: string;
  displayName: string;
  name: string;
  showDescription?: boolean;
};

export function CompanyCombobox({
  defaultCompanyName,
  defaultCompanyId,
  displayName,
  name,
  showDescription,
}: CompanyComboboxProps) {
  const [search, setSearch] = useState<string>(defaultCompanyName || '');

  const delayedSearch = useDelayedValue(search, 250);

  const fetcher = useFetcher<{
    companies: Pick<Company, 'description' | 'id' | 'imageUrl' | 'name'>[];
  }>();

  useEffect(() => {
    fetcher.submit(
      { search: delayedSearch },
      {
        action: '/api/companies',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const companies = fetcher.data?.companies || [];

  return (
    <Combobox
      defaultDisplayValue={defaultCompanyName}
      defaultValue={defaultCompanyId}
    >
      <ComboboxInput
        displayName={displayName}
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
                className={cx(
                  'whitespace-nowrap [&>button]:flex',
                  !showDescription && '[&>button]:items-center'
                )}
                displayValue={company.name}
                key={company.id}
                value={company.id}
              >
                {company.imageUrl && (
                  <img
                    alt={company.name}
                    className="mr-2 mt-1 h-6 w-6 rounded"
                    src={company.imageUrl}
                  />
                )}

                <span className="flex flex-col overflow-hidden">
                  <Text as="span" variant="sm">
                    {company.name}
                  </Text>

                  {showDescription && (
                    <Text
                      as="span"
                      color="gray-500"
                      className="line-clamp-1 text-ellipsis"
                      variant="xs"
                    >
                      {company.description}
                    </Text>
                  )}
                </span>
              </ComboboxItem>
            );
          })}

          {!companies.length && !!search && (
            <ComboboxItem value="">{search}</ComboboxItem>
          )}
        </ul>
      </ComboboxPopover>
    </Combobox>
  );
}
