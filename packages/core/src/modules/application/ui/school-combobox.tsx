import { useFetcher } from '@remix-run/react';
import React, { useEffect, useState } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  InputProps,
  useDelayedValue,
} from '@oyster/core-ui';

import { School as _School } from '@/modules/education/education.types';

type School = Pick<_School, 'id' | 'name'>;

type SchoolComboboxProps = Pick<InputProps, 'readOnly' | 'required'> & {
  defaultValue?: School;
  name: string;
  onSelect?: React.HTMLProps<HTMLButtonElement>['onClick'];
  popoverProps?: Partial<React.ComponentProps<typeof ComboboxPopover>>;
};

export function SchoolCombobox({
  defaultValue = { id: '', name: '' },
  name,
  onSelect,
  popoverProps = {},
  readOnly,
  required,
}: SchoolComboboxProps) {
  const [search, setSearch] = useState<string>('');

  const delayedSearch = useDelayedValue(search, 250);

  const fetcher = useFetcher<{
    schools: Pick<School, 'id' | 'name'>[];
  }>();

  useEffect(() => {
    fetcher.submit(
      { search: delayedSearch },
      {
        action: '/schools',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const schools = fetcher.data?.schools || [];

  return (
    <Combobox
      defaultDisplayValue={defaultValue.name}
      defaultValue={defaultValue.id}
    >
      <ComboboxInput
        id={name}
        name={name}
        onChange={(e) => setSearch(e.currentTarget.value)}
        readOnly={readOnly}
        required={required}
      />

      <ComboboxPopover {...popoverProps}>
        <ul>
          {schools.map((school) => {
            return (
              <ComboboxItem
                key={school.id}
                onSelect={onSelect}
                value={school.id}
              >
                {school.name}
              </ComboboxItem>
            );
          })}

          <ComboboxItem onSelect={onSelect} value="other">
            Other
          </ComboboxItem>
        </ul>
      </ComboboxPopover>
    </Combobox>
  );
}
