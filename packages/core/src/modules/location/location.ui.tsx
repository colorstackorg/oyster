import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  type ComboboxProps,
  type InputProps,
  useDelayedValue,
} from '@oyster/ui';

type CityDetailsResult = {
  details: {
    id: string;
    latitude: number;
    longitude: number;
    name: string;
  } | null;
};

type SearchCitiesResult = {
  cities: Array<{ description: string; id: string }>;
};

export type CityComboboxProps = Pick<ComboboxProps, 'defaultValue'> &
  Pick<InputProps, 'required'> & {
    defaultLatitude?: number | string;
    defaultLongitude?: number | string;
    latitudeName: string;
    longitudeName: string;
    name: string;
  };

export function CityCombobox({
  defaultValue = '',
  defaultLatitude = '',
  defaultLongitude = '',
  latitudeName,
  longitudeName,
  name,
  required,
}: CityComboboxProps) {
  const [search, setSearch] = useState<string>('');

  const delayedSearch = useDelayedValue(search, 250);

  const autocompleteFetcher = useFetcher<SearchCitiesResult>();
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

  const cities = autocompleteFetcher.data?.cities || [];
  const latitude = detailsFetcher.data?.details?.latitude || defaultLatitude;
  const longitude = detailsFetcher.data?.details?.longitude || defaultLongitude;

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
