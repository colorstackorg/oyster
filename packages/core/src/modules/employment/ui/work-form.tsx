import React, { type PropsWithChildren, useContext, useState } from 'react';

import { CompanyCombobox } from '@oyster/core/member-profile/ui';
import {
  Address,
  Checkbox,
  DatePicker,
  Field,
  type FieldProps,
  Input,
  Select,
} from '@oyster/ui';
import { order } from '@oyster/utils';

import {
  type EmploymentType,
  FORMATTED_EMPLOYMENT_TYPE,
  FORMATTED_LOCATION_TYPE,
  type LocationType,
} from '../employment.types';

type WorkFormState = {
  isCurrentRole: boolean;
  setIsCurrentRole(value: boolean): void;
};

const WorkFormContext = React.createContext<WorkFormState>({
  isCurrentRole: false,
  setIsCurrentRole: (_: boolean) => {},
});

export const WorkForm = () => {};

WorkForm.Context = ({
  children,
  defaultValue,
}: PropsWithChildren<{
  defaultValue?: Pick<WorkFormState, 'isCurrentRole'>;
}>) => {
  const [isCurrentRole, setIsCurrentRole] = useState<boolean>(
    defaultValue?.isCurrentRole || false
  );

  return (
    <WorkFormContext.Provider value={{ isCurrentRole, setIsCurrentRole }}>
      {children}
    </WorkFormContext.Provider>
  );
};

WorkForm.CityField = function CityField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field error={error} label="City" labelFor={name}>
      <Address.City defaultValue={defaultValue} id={name} name={name} />
    </Field>
  );
};

type CompanyFieldProps = Pick<FieldProps<string>, 'error' | 'name'> & {
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  displayName: string;
};

WorkForm.CompanyField = function CompanyField({
  defaultCompanyId,
  defaultCompanyName,
  displayName,
  error,
  name,
}: CompanyFieldProps) {
  return (
    <Field error={error} label="Organization" labelFor={name} required>
      <CompanyCombobox
        defaultCompanyId={defaultCompanyId}
        defaultCompanyName={defaultCompanyName}
        displayName={displayName}
        name={name}
        showDescription
      />
    </Field>
  );
};

WorkForm.CurrentRoleField = function CurrentRoleField({
  defaultValue,
  error,
  name,
}: FieldProps<boolean>) {
  const { isCurrentRole, setIsCurrentRole } = useContext(WorkFormContext);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIsCurrentRole(e.target.checked);
  }

  return (
    <Field error={error} labelFor={name} required>
      <Checkbox
        color="gold-100"
        defaultChecked={isCurrentRole || !!defaultValue}
        id={name}
        label="I am currently working in this role."
        name={name}
        onChange={onChange}
      />
    </Field>
  );
};

WorkForm.EndDateField = function EndDateField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { isCurrentRole } = useContext(WorkFormContext);

  if (isCurrentRole) {
    return null;
  }

  return (
    <Field
      error={error}
      description="Example: August 2022"
      label="End Date"
      labelFor={name}
      required
    >
      <DatePicker
        defaultValue={defaultValue}
        id={name}
        name={name}
        required
        type="month"
      />
    </Field>
  );
};

const EmploymentTypeOrder: Record<EmploymentType, number> = {
  full_time: 1,
  internship: 2,
  part_time: 3,
  contract: 4,
  freelance: 5,
  apprenticeship: 6,
};

const ORDERED_EMPLOYMENT_TYPES = order(EmploymentTypeOrder);

WorkForm.EmploymentTypeField = function EmploymentTypeField({
  defaultValue,
  error,
  name,
}: FieldProps<EmploymentType>) {
  return (
    <Field error={error} label="Employment Type" labelFor={name} required>
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {ORDERED_EMPLOYMENT_TYPES.map((employmentType) => {
          return (
            <option key={employmentType} value={employmentType}>
              {FORMATTED_EMPLOYMENT_TYPE[employmentType]}
            </option>
          );
        })}
      </Select>
    </Field>
  );
};

const LocationTypeOrder: Record<LocationType, number> = {
  in_person: 1,
  remote: 2,
  hybrid: 3,
};

const ORDERED_LOCATION_TYPES = order(LocationTypeOrder);

WorkForm.LocationTypeField = function LocationTypeField({
  defaultValue,
  error,
  name,
}: FieldProps<LocationType>) {
  return (
    <Field error={error} label="Location Type" labelFor={name} required>
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {ORDERED_LOCATION_TYPES.map((locationType) => {
          return (
            <option key={locationType} value={locationType}>
              {FORMATTED_LOCATION_TYPE[locationType]}
            </option>
          );
        })}
      </Select>
    </Field>
  );
};

WorkForm.StartDateField = function StartDateField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field
      error={error}
      description="Example: August 2020"
      label="Start Date"
      labelFor={name}
      required
    >
      <DatePicker
        defaultValue={defaultValue}
        id={name}
        name={name}
        required
        type="month"
      />
    </Field>
  );
};

WorkForm.StateField = function StateField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field error={error} label="State" labelFor={name}>
      <Address.State defaultValue={defaultValue} id={name} name={name} />
    </Field>
  );
};

WorkForm.TitleField = function TitleField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field
      description="Example: Software Engineering Intern"
      error={error}
      label="Title"
      labelFor={name}
      required
    >
      <Input defaultValue={defaultValue} id={name} name={name} required />
    </Field>
  );
};
