import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
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

type AutocompleteResult = Nullable<
  Array<{
    description: string;
    id: string;
  }>
>;

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

  const delayedSearch = useDelayedValue(search, 250);

  const autocompleteFetcher = useFetcher<AutocompleteResult>();
  const detailsFetcher = useFetcher<CityDetailsResult>();

  useEffect(() => {
    autocompleteFetcher.submit(
      { search: delayedSearch },
      {
        action: '/api/cities/autocomplete',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const cities = autocompleteFetcher.data || [];
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

      {!!cities.length && (
        <ComboboxPopover>
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
        </ComboboxPopover>
      )}

      <input name={latitudeName} type="hidden" value={latitude} />
      <input name={longitudeName} type="hidden" value={longitude} />
    </Combobox>
  );
}
