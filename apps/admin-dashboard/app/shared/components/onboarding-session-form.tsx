import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

import {
  ComboboxPopover,
  DatePicker,
  Form,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxList,
  MultiComboboxSearch,
  MultiComboboxValues,
} from '@oyster/ui';

import { type SearchMembersResult } from '@/routes/members.search';

type FieldProps = {
  error?: string;
  name: string;
};

export const OnboardingSessionForm = () => {};

export function OnboardingSessionAttendeesField({ error, name }: FieldProps) {
  const [search, setSearch] = useState('');
  const fetcher = useFetcher<SearchMembersResult>();

  useEffect(() => {
    fetcher.load('/members/search');
  }, []);

  const members = fetcher.data?.members || [];

  const parsedMembers = members.map((item) => {
    const label = `${item.firstName} ${item.lastName}`;

    return {
      name: label,
      id: item.id,
    };
  });

  return (
    <Form.Field
      description="Please select any other students who attended this onboarding session."
      error={error}
      label="Attendees"
      labelFor={name}
      required
    >
      <MultiCombobox>
        {({ values }) => {
          const filteredMembers = parsedMembers.filter((item) => {
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
                  items={filteredMembers}
                />
              </MultiComboboxDisplay>

              {(!!filteredMembers.length || !!search.length) && (
                <ComboboxPopover>
                  <MultiComboboxList items={filteredMembers} />
                </ComboboxPopover>
              )}
            </>
          );
        }}
      </MultiCombobox>
    </Form.Field>
  );
}

OnboardingSessionForm.DateField = function DateField({
  error,
  name,
}: FieldProps) {
  return (
    <Form.Field error={error} label="Date" labelFor={name} required>
      <DatePicker id={name} name={name} type="date" required />
    </Form.Field>
  );
};
