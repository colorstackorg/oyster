import {
  DollarInput,
  type FieldProps,
  Form,
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
    <Form.Field
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
    </Form.Field>
  );
}

export function OfferBaseSalaryField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      error={error}
      label="Base Salary"
      labelFor="baseSalary"
      required
    >
      <DollarInput
        defaultValue={defaultValue}
        id="baseSalary"
        name="baseSalary"
        required
      />
    </Form.Field>
  );
}

export function OfferBenefitsField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
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
    </Form.Field>
  );
}

export function OfferCompanyField({
  defaultValue,
  error,
}: Omit<FieldProps<{ crunchbaseId: string; name: string }>, 'name'>) {
  return (
    <Form.Field
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
    </Form.Field>
  );
}

export function OfferHourlyRateField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      error={error}
      label="Hourly Rate"
      labelFor="hourlyRate"
      required
    >
      <DollarInput
        defaultValue={defaultValue}
        id="hourlyRate"
        name="hourlyRate"
        required
      />
    </Form.Field>
  );
}

// TODO: Convert this to use the Google Places API.

export function OfferLocationField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      description='Please format the location as "City, State".'
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
    </Form.Field>
  );
}

export function OfferNegotiatedField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      description="Did you negotiate, and if so, what was the result?"
      error={error}
      label="Negotiated"
      labelFor="negotiated"
    >
      <Input defaultValue={defaultValue} id="negotiated" name="negotiated" />
    </Form.Field>
  );
}

export function OfferPastExperienceField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
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
    </Form.Field>
  );
}

export function OfferPerformanceBonusField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
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
    </Form.Field>
  );
}

export function OfferRelocationField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      description="Does this offer anything for relocation and/or housing?"
      error={error}
      label="Relocation / Housing"
      labelFor="relocation"
    >
      <Input defaultValue={defaultValue} id="relocation" name="relocation" />
    </Form.Field>
  );
}

export function OfferRoleField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field error={error} label="Role" labelFor="role" required>
      <Input
        defaultValue={defaultValue}
        id="role"
        name="role"
        placeholder="Software Engineer Intern"
        required
      />
    </Form.Field>
  );
}

export function OfferSignOnBonusField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
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
    </Form.Field>
  );
}

export function OfferTotalStockField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field error={error} label="Total Stock" labelFor="totalStock">
      <DollarInput
        defaultValue={defaultValue}
        id="totalStock"
        name="totalStock"
      />
    </Form.Field>
  );
}
