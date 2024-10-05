import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  type InputProps,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxList,
  type MultiComboboxProps,
  MultiComboboxSearch,
  MultiComboboxValues,
} from '@oyster/ui';

import type { SearchCountriesResult } from '@/routes/api.countries.search';

type EthnicityComboboxProps = Pick<InputProps, 'name' | 'required'>;

export function EthnicityCombobox({ name }: EthnicityComboboxProps) {
  const fetcher = useFetcher<SearchCountriesResult>();

  useEffect(() => {
    fetcher.load('/api/countries/search');
  }, []);

  const countries = fetcher.data?.countries || [];

  return (
    <Combobox>
      <ComboboxInput
        id={name}
        name={name}
        onChange={(e) => {
          fetcher.submit(
            { search: e.currentTarget.value },
            {
              action: '/api/countries/search',
              method: 'get',
            }
          );
        }}
        required
      />

      {!!countries.length && (
        <ComboboxPopover>
          <ul>
            {countries.map((country) => {
              const label = `${country.flagEmoji} ${country.demonym}`;

              return (
                <ComboboxItem key={country.code} value={country.code}>
                  {label}
                </ComboboxItem>
              );
            })}
          </ul>
        </ComboboxPopover>
      )}
    </Combobox>
  );
}

type EthnicityMultiComboboxProps = Pick<MultiComboboxProps, 'defaultValues'> &
  Pick<InputProps, 'name' | 'required'>;

export function EthnicityMultiCombobox({
  defaultValues,
  name,
}: EthnicityMultiComboboxProps) {
  const fetcher = useFetcher<SearchCountriesResult>();
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    fetcher.load('/api/countries/search');
  }, []);

  const countries = fetcher.data?.countries || [];

  const parsedCountries = countries.map((item) => {
    const label = `${item.flagEmoji} ${item.demonym}`;

    return {
      name: label,
      id: item.code,
    };
  });

  return (
    <MultiCombobox defaultValues={defaultValues}>
      {({ values }) => {
        const filteredCountries = parsedCountries.filter((item) => {
          return values.every((value) => value.value !== item.id);
        });

        return (
          <>
            <MultiComboboxDisplay>
              <MultiComboboxValues name={name} />
              <MultiComboboxSearch
                id={name}
                onChange={(e) => {
                  setSearch(e.currentTarget.value);

                  fetcher.submit(
                    { search: e.currentTarget.value },
                    {
                      action: '/api/countries/search',
                      method: 'get',
                    }
                  );
                }}
                items={filteredCountries}
              />
            </MultiComboboxDisplay>

            {(!!filteredCountries.length || !!search.length) && (
              <ComboboxPopover>
                <MultiComboboxList items={filteredCountries} />
              </ComboboxPopover>
            )}
          </>
        );
      }}
    </MultiCombobox>
  );
}
