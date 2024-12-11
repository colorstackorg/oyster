import React, {
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { MajorCombobox, SchoolCombobox } from '@oyster/core/education/ui';
import {
  DegreeType,
  FORMATTED_DEGREEE_TYPE,
  type School,
} from '@oyster/core/member-profile/ui';
import { type Major } from '@oyster/types';
import { DatePicker, Field, Input } from '@oyster/ui';
import { Select } from '@oyster/ui/select';
import { toTitleCase } from '@oyster/utils';

const EducationFormContext = React.createContext({
  isOtherFieldOfStudy: false,
  isOtherSchool: false,
  setIsOtherFieldOfStudy: (_: boolean) => {},
  setIsOtherSchool: (_: boolean) => {},
});

export const EducationForm = () => {};

EducationForm.Context = ({ children }: PropsWithChildren) => {
  const [isOtherSchool, setIsOtherSchool] = useState(false);
  const [isOtherFieldOfStudy, setIsOtherFieldOfStudy] = useState(false);

  return (
    <EducationFormContext.Provider
      value={{
        isOtherFieldOfStudy,
        isOtherSchool,
        setIsOtherFieldOfStudy,
        setIsOtherSchool,
      }}
    >
      {children}
    </EducationFormContext.Provider>
  );
};

type EducationFieldProps<T> = {
  defaultValue?: T;
  error?: string;
  name: string;
};

const DEGREE_TYPES: DegreeType[] = Object.values(DegreeType);

EducationForm.DegreeTypeField = function DegreeTypeField({
  defaultValue,
  error,
  name,
}: EducationFieldProps<DegreeType>) {
  return (
    <Field error={error} label="Degree Type" labelFor={name} required>
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {DEGREE_TYPES.map((degreeType) => (
          <Select.Option key={degreeType} value={degreeType}>
            {FORMATTED_DEGREEE_TYPE[degreeType]}
          </Select.Option>
        ))}
      </Select>
    </Field>
  );
};

EducationForm.EndDateField = ({
  defaultValue,
  error,
  name,
}: EducationFieldProps<string>) => {
  return (
    <Field
      description="If you haven't graduated yet, please select the date you expect to graduate."
      error={error}
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

EducationForm.FieldOfStudyField = function FieldOfStudyField({
  defaultValue,
  error,
  name,
}: EducationFieldProps<Major>) {
  const { setIsOtherFieldOfStudy } = useContext(EducationFormContext);

  return (
    <Field error={error} label="Field of Study" labelFor={name} required>
      <MajorCombobox
        defaultDisplayValue={defaultValue && toTitleCase(defaultValue)}
        defaultValue={defaultValue}
        name={name}
        onSelect={(e) => {
          setIsOtherFieldOfStudy(e.currentTarget.value === 'other');
        }}
      />
    </Field>
  );
};

EducationForm.OtherFieldOfStudyField = ({
  defaultValue,
  error,
  name,
}: EducationFieldProps<string>) => {
  const { isOtherFieldOfStudy, setIsOtherFieldOfStudy } =
    useContext(EducationFormContext);

  useEffect(() => {
    setIsOtherFieldOfStudy(isOtherFieldOfStudy || !!defaultValue);
  }, []);

  if (!isOtherFieldOfStudy) {
    return null;
  }

  return (
    <Field error={error} label="Field of Study" labelFor={name} required>
      <Input defaultValue={defaultValue} id={name} name={name} required />
    </Field>
  );
};

EducationForm.OtherSchoolField = function OtherSchoolField({
  defaultValue,
  error,
  name,
}: EducationFieldProps<string>) {
  const { isOtherSchool, setIsOtherSchool } = useContext(EducationFormContext);

  useEffect(() => {
    setIsOtherSchool(isOtherSchool || !!defaultValue);
  }, []);

  if (!isOtherSchool) {
    return null;
  }

  return (
    <Field error={error} label="Other School" labelFor={name} required>
      <Input defaultValue={defaultValue} id={name} name={name} required />
    </Field>
  );
};

type MinimalSchool = Pick<School, 'id' | 'name'>;

EducationForm.SchoolField = function SchoolField({
  defaultValue = { name: '', id: '' },
  error,
  name,
}: EducationFieldProps<MinimalSchool>) {
  const { setIsOtherSchool } = useContext(EducationFormContext);

  return (
    <Field error={error} label="School" labelFor={name} required>
      <SchoolCombobox
        defaultValue={defaultValue}
        name={name}
        onSelect={(e) => setIsOtherSchool(e.currentTarget.value === 'other')}
      />
    </Field>
  );
};

EducationForm.StartDateField = function StartDateField({
  defaultValue,
  error,
  name,
}: EducationFieldProps<string>) {
  return (
    <Field
      description="Example: August 2020"
      error={error}
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
