import { useFetcher } from '@remix-run/react';
import React, {
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  Address,
  Checkbox,
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  DatePicker,
  FieldProps,
  Form,
  Input,
  Select,
  useDelayedValue,
} from '@oyster/core-ui';
import { order } from '@oyster/utils';

import {
  BaseCompany,
  Company,
  EmploymentType,
  FORMATTED_EMPLOYMENT_TYPE,
  FORMATTED_LOCATION_TYPE,
  LocationType,
} from '../employment.types';

type WorkFormState = {
  isCurrentRole: boolean;
  isOtherCompany: boolean;
  setIsCurrentRole(value: boolean): void;
  setIsOtherCompany(value: boolean): void;
};

const WorkFormContext = React.createContext<WorkFormState>({
  isCurrentRole: false,
  isOtherCompany: false,
  setIsCurrentRole: (value: boolean) => {},
  setIsOtherCompany: (value: boolean) => {},
});

export const WorkForm = () => {};

WorkForm.Context = ({
  children,
  defaultValue,
}: PropsWithChildren<{
  defaultValue?: Pick<WorkFormState, 'isCurrentRole' | 'isOtherCompany'>;
}>) => {
  const [isCurrentRole, setIsCurrentRole] = useState<boolean>(
    defaultValue?.isCurrentRole || false
  );

  const [isOtherCompany, setIsOtherCompany] = useState<boolean>(
    defaultValue?.isOtherCompany || false
  );

  return (
    <WorkFormContext.Provider
      value={{
        isCurrentRole,
        isOtherCompany,
        setIsCurrentRole,
        setIsOtherCompany,
      }}
    >
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
    <Form.Field error={error} label="City" labelFor={name}>
      <Address.City defaultValue={defaultValue} id={name} name={name} />
    </Form.Field>
  );
};

type CompanyFieldProps = FieldProps<Pick<Company, 'crunchbaseId' | 'name'>>;

WorkForm.CompanyField = function CompanyField({
  defaultValue = { crunchbaseId: '', name: '' },
  error,
  name,
}: CompanyFieldProps) {
  const { setIsOtherCompany } = useContext(WorkFormContext);

  const [search, setSearch] = useState<string>(defaultValue.name);

  const delayedSearch = useDelayedValue(search, 250);

  const fetcher = useFetcher<{ companies: BaseCompany[] }>();

  useEffect(() => {
    fetcher.submit(
      { search: delayedSearch },
      {
        action: '/companies',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const companies = fetcher.data?.companies || [];

  return (
    <Form.Field error={error} label="Organization" labelFor={name} required>
      <Combobox
        defaultDisplayValue={defaultValue.name}
        defaultValue={defaultValue.crunchbaseId}
      >
        <ComboboxInput
          id={name}
          name={name}
          onChange={(e) => setSearch(e.currentTarget.value)}
          required
        />

        <ComboboxPopover>
          <ul>
            {companies.map((company) => {
              return (
                <ComboboxItem
                  className="whitespace-nowrap [&>button]:flex [&>button]:items-center"
                  displayValue={company.name}
                  key={company.crunchbaseId}
                  onSelect={() => setIsOtherCompany(false)}
                  value={company.crunchbaseId}
                >
                  <img
                    alt={company.name}
                    className="mr-2 h-6 w-6 rounded"
                    src={company.imageUrl}
                  />
                  {company.name}{' '}
                  <span className="ml-1 box-border max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-gray-400">
                    - {company.description}
                  </span>
                </ComboboxItem>
              );
            })}

            <ComboboxItem onSelect={() => setIsOtherCompany(true)} value="">
              Other
            </ComboboxItem>
          </ul>
        </ComboboxPopover>
      </Combobox>
    </Form.Field>
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
    <Form.Field error={error} labelFor={name} required>
      <Checkbox
        color="gold-100"
        defaultChecked={isCurrentRole || !!defaultValue}
        id={name}
        label="I am currently working in this role."
        name={name}
        onChange={onChange}
      />
    </Form.Field>
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
    <Form.Field
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
    </Form.Field>
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
    <Form.Field error={error} label="Employment Type" labelFor={name} required>
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {ORDERED_EMPLOYMENT_TYPES.map((employmentType) => {
          return (
            <option key={employmentType} value={employmentType}>
              {FORMATTED_EMPLOYMENT_TYPE[employmentType]}
            </option>
          );
        })}
      </Select>
    </Form.Field>
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
    <Form.Field error={error} label="Location Type" labelFor={name} required>
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {ORDERED_LOCATION_TYPES.map((locationType) => {
          return (
            <option key={locationType} value={locationType}>
              {FORMATTED_LOCATION_TYPE[locationType]}
            </option>
          );
        })}
      </Select>
    </Form.Field>
  );
};

WorkForm.OtherCompanyField = function OtherCompanyField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { isOtherCompany } = useContext(WorkFormContext);

  if (!isOtherCompany) {
    return null;
  }

  return (
    <Form.Field error={error} label="Organization" labelFor={name} required>
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder="Google"
        required
      />
    </Form.Field>
  );
};

WorkForm.StartDateField = function StartDateField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field
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
    </Form.Field>
  );
};

WorkForm.StateField = function StateField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field error={error} label="State" labelFor={name}>
      <Address.State defaultValue={defaultValue} id={name} name={name} />
    </Form.Field>
  );
};

WorkForm.TitleField = function TitleField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field error={error} label="Title" labelFor={name} required>
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder="Software Engineering Intern"
        required
      />
    </Form.Field>
  );
};
