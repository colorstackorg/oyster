import React, { type PropsWithChildren, useContext, useState } from 'react';

import {
  type Demographic,
  FORMATTED_DEMOGRAPHICS,
  FORMATTED_GENDER,
  FORMATTED_OTHER_DEMOGRAPHICS,
  FORMATTED_RACE,
  type Gender,
  Major,
  type OtherDemographic,
  type Race,
} from '@oyster/types';
import {
  Checkbox,
  Field,
  type FieldProps,
  Input,
  Link,
  Radio,
  Select,
  Text,
  Textarea,
  type TextProps,
} from '@oyster/ui';
import { run, toTitleCase } from '@oyster/utils';

import {
  type EducationLevel,
  FORMATTED_EDUCATION_LEVEL,
} from '@/modules/education/education.types';
import {
  MajorCombobox,
  SchoolCombobox,
} from '@/modules/education/education.ui';

export {
  ApplicationStatus,
  ApplyInput,
} from '@/modules/applications/applications.types';

const ApplicationContext = React.createContext({
  isOtherMajor: false,
  isOtherSchool: false,
  readOnly: false,
  setIsOtherMajor: (_: boolean) => {},
  setIsOtherSchool: (_: boolean) => {},
});

export const Application = ({
  children,
  readOnly,
}: PropsWithChildren<{ readOnly: boolean }>) => {
  const [isOtherMajor, setIsOtherMajor] = useState(false);
  const [isOtherSchool, setIsOtherSchool] = useState(false);

  return (
    <ApplicationContext.Provider
      value={{
        isOtherMajor,
        isOtherSchool,
        readOnly,
        setIsOtherMajor,
        setIsOtherSchool,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
};

Application.ContributionField = function ContributionField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field
      description="As a member, you'll have access to our opportunities and resources, but we're committed to welcoming students who will actively contribute to and strengthen our community."
      error={error}
      label="Why are you interested in joining the ColorStack family? How do you plan to contribute to the community?"
      labelFor={name}
      required
    >
      <Textarea
        defaultValue={defaultValue}
        id={name}
        name={name}
        readOnly={readOnly}
        required
      />
    </Field>
  );
};

const EDUCATION_LEVELS_IN_ORDER: EducationLevel[] = [
  'undergraduate',
  'masters',
  'phd',
  'bootcamp',
];

Application.EducationLevelField = function EducationLevelField({
  defaultValue,
  error,
  name,
}: FieldProps<EducationLevel>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field error={error} label="Education Level" labelFor={name} required>
      <Radio.Group>
        {EDUCATION_LEVELS_IN_ORDER.map((value: EducationLevel) => {
          return (
            <Radio
              key={value}
              defaultChecked={defaultValue === value}
              id={name + value}
              label={FORMATTED_EDUCATION_LEVEL[value]}
              name={name}
              readOnly={readOnly}
              required
              value={value}
            />
          );
        })}
      </Radio.Group>
    </Field>
  );
};

Application.EmailField = function EmailField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field
      description="Must be a valid .edu email. If your email is invalid, your application will automatically be rejected. Please make sure to check for typos!"
      error={error}
      label="Email"
      labelFor={name}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        readOnly={readOnly}
        required
        type="email"
      />
    </Field>
  );
};

Application.FirstNameField = function FirstNameField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field error={error} label="First Name" labelFor={name} required>
      <Input
        autoFocus={!readOnly}
        defaultValue={defaultValue}
        id={name}
        name={name}
        readOnly={readOnly}
        required
      />
    </Field>
  );
};

const GENDERS_IN_ORDER: Gender[] = [
  'cisgender_man',
  'cisgender_woman',
  'transgender_man',
  'transgender_woman',
  'non_binary',
  'prefer_not_to_say',
];

Application.GenderField = function GenderField({
  defaultValue,
  error,
  name,
}: FieldProps<Gender>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field error={error} label="Gender" labelFor={name} required>
      <Radio.Group>
        {GENDERS_IN_ORDER.map((value: Gender) => {
          return (
            <Radio
              key={value}
              defaultChecked={defaultValue === value}
              id={name + value}
              label={FORMATTED_GENDER[value]}
              name={name}
              readOnly={readOnly}
              required
              value={value}
            />
          );
        })}
      </Radio.Group>
    </Field>
  );
};

// NOTE: This field is no longer used for "goals" but the renaming of the
// database field isn't implemented yet so we're keeping it here for now.
Application.GoalsField = function GoalsField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field
      error={error}
      label="In what ways have you helped create space, opportunity, or support for Black and Latinx communities? Please provide specific examples of your personal experience."
      labelFor={name}
      required
    >
      <Textarea
        defaultValue={defaultValue}
        id={name}
        name={name}
        readOnly={readOnly}
        required
      />
    </Field>
  );
};

const MONTHS_IN_ORDER = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEARS_IN_ORDER = run(() => {
  const years: number[] = [];

  const CURRENT_YEAR = new Date().getFullYear();

  for (let year = CURRENT_YEAR - 1; year <= CURRENT_YEAR + 5; year++) {
    years.push(year);
  }

  return years;
});

type GraduationDateFieldProps = {
  month: FieldProps<number>;
  year: FieldProps<number>;
};

Application.GraduationDateField = function GraduationDateField({
  month,
  year,
}: GraduationDateFieldProps) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <div className="grid gap-[inherit] sm:grid-cols-2 sm:gap-2">
      <Field
        error={month.error}
        label="Expected Graduation Month"
        labelFor={month.name}
        required
      >
        <Select
          defaultValue={month.defaultValue}
          id={month.name}
          name={month.name}
          readOnly={readOnly}
          required
        >
          {MONTHS_IN_ORDER.map((value, index) => {
            return (
              <option key={value} value={index + 1}>
                {value}
              </option>
            );
          })}
        </Select>
      </Field>

      <Field
        error={year.error}
        label="Expected Graduation Year"
        labelFor={year.name}
        required
      >
        <Select
          defaultValue={year.defaultValue}
          id={year.name}
          name={year.name}
          readOnly={readOnly}
          required
        >
          {YEARS_IN_ORDER.map((value) => {
            return (
              <option key={value} value={value}>
                {value}
              </option>
            );
          })}
        </Select>
      </Field>
    </div>
  );
};

Application.LastNameField = function LastNameField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field error={error} label="Last Name" labelFor={name} required>
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        readOnly={readOnly}
        required
      />
    </Field>
  );
};

Application.LinkedInField = function LinkedInField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field
      description={<LinkedInDescription />}
      error={error}
      label="LinkedIn Profile/URL"
      labelFor={name}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder="ex: https://www.linkedin.com/in/jehron"
        readOnly={readOnly}
        required
      />
    </Field>
  );
};

function LinkedInDescription(props: TextProps) {
  return (
    <Text {...props}>
      Please ensure that your LinkedIn is up to date as it is a determining
      factor for acceptance. Bonus points if your LinkedIn account is{' '}
      <Link
        href="https://www.linkedin.com/help/linkedin/answer/a1637071"
        target="_blank"
      >
        verified
      </Link>
      .
    </Text>
  );
}

Application.MajorField = function MajorField({
  defaultValue,
  error,
  name,
}: FieldProps<Major>) {
  const { readOnly, setIsOtherMajor } = useContext(ApplicationContext);

  function onSelect(e: React.MouseEvent<HTMLButtonElement>) {
    setIsOtherMajor(e.currentTarget.value === Major.OTHER);
  }

  return (
    <Field
      description="Please choose the option closest to your major. If your minor is more relevant to this community, please select that instead. If your major/minor is not listed, this might not be the right community for you."
      error={error}
      label="Major"
      labelFor={name}
      required
    >
      <MajorCombobox
        defaultDisplayValue={defaultValue && toTitleCase(defaultValue)}
        defaultValue={defaultValue}
        name={name}
        onSelect={onSelect}
        readOnly={readOnly}
      />
    </Field>
  );
};

const DEMOGRAPHICS_IN_ORDER: Demographic[] = [
  'disability',
  'first_generation',
  'low_income',
];

const OTHER_DEMOGRAPHICS_IN_ORDER: OtherDemographic[] = [
  'none_of_the_above',
  'prefer_not_to_say',
];

Application.OtherDemographicsField = function OtherDemographicsField({
  defaultValue,
  error,
  name,
}: FieldProps<string[]>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field error={error} label="Quality of Life" labelFor={name} required>
      <Checkbox.Group>
        {DEMOGRAPHICS_IN_ORDER.map((value: Demographic) => {
          return (
            <Checkbox
              key={value}
              defaultChecked={defaultValue?.includes(value)}
              id={name + value}
              label={FORMATTED_DEMOGRAPHICS[value]}
              name={name}
              readOnly={readOnly}
              value={value}
            />
          );
        })}

        {OTHER_DEMOGRAPHICS_IN_ORDER.map((value: OtherDemographic) => {
          return (
            <Checkbox
              key={value}
              defaultChecked={defaultValue?.includes(value)}
              id={name + value}
              label={FORMATTED_OTHER_DEMOGRAPHICS[value]}
              name={name}
              readOnly={readOnly}
              value={value}
            />
          );
        })}
      </Checkbox.Group>
    </Field>
  );
};

Application.OtherMajorField = function OtherMajorField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { isOtherMajor, readOnly } = useContext(ApplicationContext);

  if (!isOtherMajor && !defaultValue) {
    return null;
  }

  return (
    <Field error={error} label="Other Major" labelFor={name} required>
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        readOnly={readOnly}
        required
      />
    </Field>
  );
};

Application.OtherSchoolField = function OtherSchoolField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { isOtherSchool, readOnly } = useContext(ApplicationContext);

  if (!isOtherSchool && !defaultValue) {
    return null;
  }

  return (
    <Field
      description="Please use the full name of your school."
      error={error}
      label="Other School"
      labelFor={name}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        readOnly={readOnly}
        required
      />
    </Field>
  );
};

const RACES_IN_ORDER: Race[] = [
  'black',
  'hispanic',
  'native_american',
  'other',
  'white',
  'asian',
  'middle_eastern',
];

Application.RaceField = function RaceField({
  defaultValue,
  error,
  name,
}: FieldProps<Race[]>) {
  const { readOnly } = useContext(ApplicationContext);

  return (
    <Field
      description="Our community is designed to support racially underrepresented students in tech. "
      error={error}
      label="Race & Ethnicity"
      labelFor={name}
      required
    >
      <Checkbox.Group>
        {RACES_IN_ORDER.map((value: Race) => {
          return (
            <Checkbox
              key={value}
              defaultChecked={defaultValue?.includes(value)}
              id={name + value}
              label={FORMATTED_RACE[value]}
              name={name}
              readOnly={readOnly}
              value={value}
            />
          );
        })}
      </Checkbox.Group>
    </Field>
  );
};

Application.SchoolField = function SchoolField({
  defaultValue = '',
  error,
  name,
}: FieldProps<string>) {
  const { readOnly, setIsOtherSchool } = useContext(ApplicationContext);

  function onSelect(e: React.MouseEvent<HTMLButtonElement>) {
    setIsOtherSchool(e.currentTarget.value === 'other');
  }

  return (
    <Field
      description='If you do not see your school listed, please choose the "Other" option.'
      error={error}
      label="School"
      labelFor={name}
      required
    >
      <SchoolCombobox
        defaultValue={{ id: '', name: defaultValue }}
        name={name}
        onSelect={onSelect}
        readOnly={readOnly}
      />
    </Field>
  );
};
