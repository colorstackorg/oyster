import { useFetcher } from '@remix-run/react';

import { useEffect } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
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

// Ethnicity Combobox
type EthnicityComboboxProps = Pick<InputProps, 'name' | 'required'>;

export function EthnicityCombobox({ name }: EthnicityComboboxProps) {
  const fetcher = useFetcher<SearchCountriesResult>();

  useEffect(() => {
    fetcher.load('/api/countries/search');
  }, [fetcher]);

  const countries = fetcher.data?.countries || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    fetcher.submit(
      { search: e.currentTarget.value },
      {
        action: '/api/countries/search',
        method: 'get',
      }
    );
  };

  return (
    <Combobox>
      <ComboboxInput id={name} name={name} onChange={handleInputChange} required />

      {!!countries.length && (
        <ComboboxPopover>
          <div className="max-h-48 overflow-y-auto">
            {countries.map((country) => (
              <ComboboxItem key={country.code} value={country.code}>
                {`${country.flagEmoji} ${country.demonym}`}
              </ComboboxItem>
            ))}
          </div>
        </ComboboxPopover>
      )}
    </Combobox>
  );
}

// Ethnicity MultiCombobox
type EthnicityMultiComboboxProps = Pick<MultiComboboxProps, 'defaultValues'> &
  Pick<InputProps, 'name' | 'required'>;

export function EthnicityMultiCombobox({ defaultValues, name }: EthnicityMultiComboboxProps) {
  const fetcher = useFetcher<SearchCountriesResult>();

  useEffect(() => {
    fetcher.load('/api/countries/search');
  }, [fetcher]);

  const countries = fetcher.data?.countries || [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    fetcher.submit(
      { search: e.currentTarget.value },
      {
        action: '/api/countries/search',
        method: 'get',
      }
    );
  };

  return (
    <MultiCombobox defaultValues={defaultValues}>
      <MultiComboboxDisplay>
        <MultiComboboxValues name={name} />
        <MultiComboboxSearch id={name} onChange={handleSearchChange} />
      </MultiComboboxDisplay>

      {!!countries.length && (
        <ComboboxPopover>
          <div className="max-h-48 overflow-y-auto">
            {countries.map((country) => (
              <MultiComboboxItem key={country.code} label={`${country.flagEmoji} ${country.demonym}`} value={country.code}>
                {`${country.flagEmoji} ${country.demonym}`}
              </MultiComboboxItem>
            ))}
          </div>
        </ComboboxPopover>
      )}
    </MultiCombobox>
  );
}
