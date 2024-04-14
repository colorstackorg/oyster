import { useFetcher } from '@remix-run/react';

import {
  ComboboxPopover,
  DatePicker,
  Form,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
} from '@oyster/ui';

import type { SearchMembersResult } from '../../routes/members.search';

type FieldProps = {
  error?: string;
  name: string;
};

export const OnboardingSessionForm = () => {};

export function OnboardingSessionAttendeesField({ error, name }: FieldProps) {
  const fetcher = useFetcher<SearchMembersResult>();

  const members = fetcher.data?.members || [];

  return (
    <Form.Field
      description="Please select any other students who attended this onboarding session."
      error={error}
      label="Attendees"
      labelFor={name}
      required
    >
      <MultiCombobox>
        <MultiComboboxDisplay>
          <MultiComboboxValues name={name} />
          <MultiComboboxSearch
            id={name}
            onChange={(e) => {
              fetcher.submit(
                { search: e.currentTarget.value },
                {
                  action: '/members/search',
                  method: 'get',
                }
              );
            }}
          />
        </MultiComboboxDisplay>

        {!!members.length && (
          <ComboboxPopover>
            <ul>
              {members.map((member) => {
                return (
                  <MultiComboboxItem
                    key={member.id}
                    label={`${member.firstName} ${member.lastName}`}
                    value={member.id}
                  >
                    {member.firstName} {member.lastName} ({member.email})
                  </MultiComboboxItem>
                );
              })}
            </ul>
          </ComboboxPopover>
        )}
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
