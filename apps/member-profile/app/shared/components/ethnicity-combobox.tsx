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
  MultiComboboxItem,
  type MultiComboboxProps,
  MultiComboboxSearch,
  MultiComboboxValues,
} from '@oyster/ui';

import type { SearchCountriesResult } from '@/routes/api.countries.search';

type EthnicityComboboxProps = Pick<InputProps, 'name' | 'required'>;

const SPACE_FROM_BOTTOM_OF_WINDOW = 30;

export function EthnicityCombobox({ name }: EthnicityComboboxProps) {
  const fetcher = useFetcher<SearchCountriesResult>();
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    fetcher.load('/api/countries/search');
  }, []);

  const countries = fetcher.data?.countries || [];

  const calculateDropdownHeight = () => {
    if (!name) return;

    const inputElement = document.getElementById(name);

    if (inputElement) {
      const rect = inputElement.getBoundingClientRect();
      const availableHeight =
        window.innerHeight - rect.bottom - SPACE_FROM_BOTTOM_OF_WINDOW;

      setHeight(availableHeight > 0 ? availableHeight : 0);
    }
  };

  useEffect(() => {
    calculateDropdownHeight();
    window.addEventListener('resize', calculateDropdownHeight);

    return () => {
      window.removeEventListener('resize', calculateDropdownHeight);
    };
  }, []);

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
          <ul style={{ maxHeight: height, overflowY: 'auto' }}>
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
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    fetcher.load('/api/countries/search');
  }, []);

  const countries = fetcher.data?.countries || [];

  const calculateDropdownHeight = () => {
    if (!name) return;

    const inputElement = document.getElementById(name);

    if (inputElement) {
      const rect = inputElement.getBoundingClientRect();
      const availableHeight =
        window.innerHeight - rect.bottom - SPACE_FROM_BOTTOM_OF_WINDOW;

      setHeight(availableHeight > 0 ? availableHeight : 0);
    }
  };

  useEffect(() => {
    calculateDropdownHeight();
    window.addEventListener('resize', calculateDropdownHeight);

    return () => {
      window.removeEventListener('resize', calculateDropdownHeight);
    };
  }, []);

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
        <ComboboxPopover>
          <ul style={{ maxHeight: height, overflowY: 'auto' }}>
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
