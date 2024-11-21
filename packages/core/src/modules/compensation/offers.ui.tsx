import { Form as RemixForm } from '@remix-run/react';

import {
  Button,
  Divider,
  DollarInput,
  type FieldProps,
  Form,
  Input,
  Textarea,
} from '@oyster/ui';

import { CompanyCombobox } from '@/modules/employment/ui/company-field';
import {
  type AddInternshipOfferInput,
  type EditInternshipOfferInput,
} from './offers';

// Add Internship Offer Form

type AddInternshipOfferFormProps = {
  error?: string;
  errors: Partial<Record<keyof AddInternshipOfferInput, string>>;
};

export function AddInternshipOfferForm({
  error,
  errors,
}: AddInternshipOfferFormProps) {
  return (
    <RemixForm className="form" method="post">
      <OfferCompanyField error={errors.companyCrunchbaseId} />
      <OfferRoleField error={errors.role} />
      <OfferLocationField error={errors.location} />

      <Divider my="1" />

      <OfferHourlyRateField error={errors.hourlyRate} />
      <OfferRelocationField error={errors.relocation} />
      <OfferBenefitsField error={errors.benefits} />

      <Divider my="1" />

      <OfferPastExperienceField error={errors.pastExperience} />
      <OfferNegotiatedField error={errors.negotiated} />
      <OfferAdditionalNotesField error={errors.additionalNotes} />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

// Edit Internship Offer Form

type EditInternshipOfferFormProps = {
  error?: string;
  errors: Partial<Record<keyof EditInternshipOfferInput, string>>;
  offer: EditInternshipOfferInput & { companyName: string };
};

export function EditInternshipOfferForm({
  error,
  errors,
  offer,
}: EditInternshipOfferFormProps) {
  return (
    <RemixForm className="form" method="post">
      <OfferCompanyField
        defaultValue={{
          crunchbaseId: offer.companyCrunchbaseId || '',
          name: offer.companyName || '',
        }}
        error={errors.companyCrunchbaseId}
      />
      <OfferRoleField defaultValue={offer.role} error={errors.role} />
      <OfferLocationField
        defaultValue={offer.location}
        error={errors.location}
      />

      <Divider my="1" />

      <OfferHourlyRateField
        defaultValue={offer.hourlyRate.toString()}
        error={errors.hourlyRate}
      />
      <OfferRelocationField
        defaultValue={offer.relocation || undefined}
        error={errors.relocation}
      />
      <OfferBenefitsField
        defaultValue={offer.benefits || undefined}
        error={errors.benefits}
      />

      <Divider my="1" />

      <OfferPastExperienceField
        defaultValue={offer.pastExperience || undefined}
        error={errors.pastExperience}
      />
      <OfferNegotiatedField
        defaultValue={offer.negotiated || undefined}
        error={errors.negotiated}
      />
      <OfferAdditionalNotesField
        defaultValue={offer.additionalNotes || undefined}
        error={errors.additionalNotes}
      />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

// Components

function OfferAdditionalNotesField({
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

function OfferBenefitsField({
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

function OfferCompanyField({
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

function OfferHourlyRateField({
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

function OfferLocationField({
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
        required
      />
    </Form.Field>
  );
}

function OfferNegotiatedField({
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

function OfferPastExperienceField({
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

function OfferRelocationField({
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

function OfferRoleField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field error={error} label="Role" labelFor="role" required>
      <Input defaultValue={defaultValue} id="role" name="role" required />
    </Form.Field>
  );
}
