import { useFetcher } from '@remix-run/react';
import { useEffect } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  InputProps,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxProps,
  MultiComboboxSearch,
  MultiComboboxValues,
} from '@oyster/ui';

import type { SearchCountriesResult } from '../../routes/countries.search';

type EthnicityComboboxProps = Pick<InputProps, 'name' | 'required'>;

export function EthnicityCombobox({ name, required }: EthnicityComboboxProps) {
  const fetcher = useFetcher<SearchCountriesResult>();

  useEffect(() => {
    fetcher.load('/countries/search');
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
              action: '/countries/search',
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
  required,
}: EthnicityMultiComboboxProps) {
  const fetcher = useFetcher<SearchCountriesResult>();

  useEffect(() => {
    fetcher.load('/countries/search');
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
                action: '/countries/search',
                method: 'get',
              }
            );
          }}
        />
      </MultiComboboxDisplay>

      {!!countries.length && (
        <ComboboxPopover>
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
