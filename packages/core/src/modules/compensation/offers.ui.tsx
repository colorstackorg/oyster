import {
  DollarInput,
  Field,
  type FieldProps,
  Input,
  Textarea,
} from '@oyster/ui';

import { CompanyCombobox } from '@/modules/employment/ui/company-field';

// Components

export function OfferAdditionalNotesField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="Any additional notes about this offer?"
      error={error}
      label="Additional Notes"
      labelFor="additionalNotes"
    >
      <Textarea
        defaultValue={defaultValue}
        id="additionalNotes"
        minRows={2}
        name="additionalNotes"
      />
    </Field>
  );
}

export function OfferBaseSalaryField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field error={error} label="Base Salary" labelFor="baseSalary" required>
      <DollarInput
        defaultValue={defaultValue}
        id="baseSalary"
        name="baseSalary"
        required
      />
    </Field>
  );
}

export function OfferBenefitsField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="Does this job offer any benefits? (e.g. health insurance, 401k, etc.)"
      error={error}
      label="Benefits"
      labelFor="benefits"
    >
      <Textarea
        defaultValue={defaultValue}
        id="benefits"
        minRows={2}
        name="benefits"
      />
    </Field>
  );
}

export function OfferCompanyField({
  defaultValue,
  error,
}: Omit<FieldProps<{ crunchbaseId: string; name: string }>, 'name'>) {
  return (
    <Field
      error={error}
      label="Company"
      labelFor="companyCrunchbaseId"
      required
    >
      <CompanyCombobox
        defaultCompanyName={defaultValue?.name}
        defaultCrunchbaseId={defaultValue?.crunchbaseId}
        name="companyCrunchbaseId"
        showDescription={false}
      />
    </Field>
  );
}

export function OfferHourlyRateField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field error={error} label="Hourly Rate" labelFor="hourlyRate" required>
      <DollarInput
        defaultValue={defaultValue}
        id="hourlyRate"
        name="hourlyRate"
        required
      />
    </Field>
  );
}

export function OfferLocationField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description='Please format the location as "City, State". For remote positions, write "Remote".'
      error={error}
      label="Location"
      labelFor="location"
      required
    >
      <Input
        defaultValue={defaultValue}
        id="location"
        name="location"
        placeholder="San Francisco, CA"
        required
      />
    </Field>
  );
}

export function OfferNegotiatedField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="Did you negotiate, and if so, what was the result?"
      error={error}
      label="Negotiated"
      labelFor="negotiated"
    >
      <Input defaultValue={defaultValue} id="negotiated" name="negotiated" />
    </Field>
  );
}

export function OfferPastExperienceField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="How many years of experience and/or internships do you have?"
      error={error}
      label="Past Experience"
      labelFor="pastExperience"
    >
      <Input
        defaultValue={defaultValue}
        id="pastExperience"
        name="pastExperience"
      />
    </Field>
  );
}

export function OfferPerformanceBonusField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="The maximum performance/annual bonus you can receive."
      error={error}
      label="Performance Bonus"
      labelFor="performanceBonus"
    >
      <DollarInput
        defaultValue={defaultValue}
        id="performanceBonus"
        name="performanceBonus"
      />
    </Field>
  );
}

export function OfferRelocationField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="Does this offer anything for relocation and/or housing?"
      error={error}
      label="Relocation / Housing"
      labelFor="relocation"
    >
      <Input defaultValue={defaultValue} id="relocation" name="relocation" />
    </Field>
  );
}

export function OfferRoleField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field error={error} label="Role" labelFor="role" required>
      <Input
        defaultValue={defaultValue}
        id="role"
        name="role"
        placeholder="Software Engineer Intern"
        required
      />
    </Field>
  );
}

export function OfferSignOnBonusField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="The amount of money you will receive upfront."
      error={error}
      label="Sign-On Bonus"
      labelFor="signOnBonus"
    >
      <DollarInput
        defaultValue={defaultValue}
        id="signOnBonus"
        name="signOnBonus"
      />
    </Field>
  );
}

export function OfferTotalStockField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field error={error} label="Total Stock" labelFor="totalStock">
      <DollarInput
        defaultValue={defaultValue}
        id="totalStock"
        name="totalStock"
      />
    </Field>
  );
}
