import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxMessage,
  ComboboxPopover,
  useDelayedValue,
} from '@oyster/ui';

import { type Nullable } from '@/shared/types';

export type CityComboboxProps = {
  defaultLatitude?: number | string;
  defaultLongitude?: number | string;
  defaultValue?: string;
  latitudeName: string;
  longitudeName: string;
  name: string;
  required?: boolean;
};

type CityDetailsResult = Nullable<{
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}>;

export function CityCombobox({
  defaultLatitude = '',
  defaultLongitude = '',
  defaultValue = '',
  latitudeName,
  longitudeName,
  name,
  required,
}: CityComboboxProps) {
  const [search, setSearch] = useState<string>('');

  const cities = useAutocompletedCities(search);

  const detailsFetcher = useFetcher<CityDetailsResult>();

  const latitude = detailsFetcher.data?.latitude || defaultLatitude;
  const longitude = detailsFetcher.data?.longitude || defaultLongitude;

  return (
    <Combobox defaultDisplayValue={defaultValue} defaultValue={defaultValue}>
      <ComboboxInput
        id={name}
        name={name}
        onChange={(e) => setSearch(e.currentTarget.value)}
        required={required}
      />

      {!!search && !!cities && (
        <ComboboxPopover>
          {cities.length ? (
            <ul>
              {cities.map((city) => {
                return (
                  <ComboboxItem
                    key={city.id}
                    onSelect={(_) => {
                      detailsFetcher.load(`/api/cities/${city.id}`);
                    }}
                    value={city.description}
                  >
                    {city.description}
                  </ComboboxItem>
                );
              })}
            </ul>
          ) : (
            <ComboboxMessage>No results found.</ComboboxMessage>
          )}
        </ComboboxPopover>
      )}

      <input name={latitudeName} type="hidden" value={latitude} />
      <input name={longitudeName} type="hidden" value={longitude} />
    </Combobox>
  );
}

type AutocompleteResult = Nullable<
  Array<{
    description: string;
    id: string;
  }>
>;

export function useAutocompletedCities(search: string) {
  const delayedSearch = useDelayedValue(search, 250);
  const autocompleteFetcher = useFetcher<AutocompleteResult>();

  useEffect(() => {
    if (!delayedSearch) {
      return;
    }

    autocompleteFetcher.submit(
      { search: delayedSearch },
      {
        action: '/api/cities/autocomplete',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const cities = autocompleteFetcher.data;

  return cities;
}
