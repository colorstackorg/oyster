import { useEffect } from 'react';
import { useFetcher } from 'react-router';

import {
  ComboboxPopover,
  type InputProps,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  type MultiComboboxProps,
  MultiComboboxSearch,
  MultiComboboxValues,
} from '@oyster/ui';

import type { SearchCountriesResult } from '@/routes/api.countries.search';

type EthnicityMultiComboboxProps = Pick<MultiComboboxProps, 'defaultValues'> &
  Pick<InputProps, 'name' | 'required'>;

export function EthnicityMultiCombobox({
  defaultValues,
  name,
}: EthnicityMultiComboboxProps) {
  const fetcher = useFetcher<SearchCountriesResult>();

  useEffect(() => {
    fetcher.load('/api/countries/search');
  }, []);

  const countries = fetcher.data?.countries || [];

  return (
    <MultiCombobox defaultValues={defaultValues}>
      <MultiComboboxDisplay>
        <MultiComboboxValues name={name} />
        <MultiComboboxSearch
          id={name}
          onChange={(e) => {
            fetcher.submit(
              { search: e.currentTarget.value },
              {
                action: '/api/countries/search',
                method: 'get',
              }
            );
          }}
        />
      </MultiComboboxDisplay>

      {!!countries.length && (
        <ComboboxPopover side="top">
          <ul>
            {countries.map((country) => {
              const label = `${country.flagEmoji} ${country.demonym}`;

              return (
                <MultiComboboxItem
                  key={country.code}
                  label={label}
                  value={country.code}
                >
                  {label}
                </MultiComboboxItem>
              );
            })}
          </ul>
        </ComboboxPopover>
      )}
    </MultiCombobox>
  );
}
