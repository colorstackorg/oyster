import {
  ComboboxPopover,
  Field,
  type FieldProps,
  Input,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
} from '@oyster/ui';

const keys = {
  domain: 'domain',
  imageUrl: 'imageUrl',
  linkedinSlug: 'linkedinSlug',
  name: 'name',
} as const;

export function CompanyLinkedInSlugField({
  defaultValue,
  error,
  required = false,
}: Omit<FieldProps<string>, 'name'> & { required?: boolean }) {
  return (
    <Field
      description={
        required
          ? 'Example: "google" or "https://www.linkedin.com/company/google". Requires APIFY_API_TOKEN.'
          : 'Optional. Syncs the logo from LinkedIn when APIFY_API_TOKEN is configured.'
      }
      error={error}
      label="LinkedIn Company"
      labelFor={keys.linkedinSlug}
      required={required}
    >
      <Input
        defaultValue={defaultValue}
        id={keys.linkedinSlug}
        name={keys.linkedinSlug}
        placeholder="google"
        required={required}
      />
    </Field>
  );
}

export function CompanyNameField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field error={error} label="Name" labelFor={keys.name} required>
      <Input
        defaultValue={defaultValue}
        id={keys.name}
        name={keys.name}
        required
      />
    </Field>
  );
}

export function CompanyDomainField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description='Example: "google.com" (without "https://").'
      error={error}
      label="Domain"
      labelFor={keys.domain}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={keys.domain}
        name={keys.domain}
        required
      />
    </Field>
  );
}

type CompanyLogoPreviewProps = {
  imageUrl?: string | null;
};

export function CompanyLogoPreview({ imageUrl }: CompanyLogoPreviewProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <Field label="Current Logo">
      <div className="flex items-center gap-3">
        <img
          alt="Current company logo"
          className="h-10 w-10 rounded-lg border border-gray-200 p-1"
          src={imageUrl}
        />
      </div>
    </Field>
  );
}

export function CompanyImageUrlField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="Public image URL for the company logo. Example: a LinkedIn or Crunchbase CDN URL."
      error={error}
      label="Logo URL"
      labelFor={keys.imageUrl}
    >
      <Input
        defaultValue={defaultValue}
        id={keys.imageUrl}
        name={keys.imageUrl}
        placeholder="https://..."
      />
    </Field>
  );
}

type CompanyResumeBooksFieldProps = {
  defaultValue?: string[];
  error?: FieldProps<string>['error'];
  resumeBooks: { id: string; name: string }[];
};

export function CompanyResumeBooksField({
  defaultValue = [],
  error,
  resumeBooks,
}: CompanyResumeBooksFieldProps) {
  const defaultValues = defaultValue
    .map((resumeBookId) => {
      const resumeBook = resumeBooks.find((book) => book.id === resumeBookId);

      if (!resumeBook) {
        return null;
      }

      return {
        label: resumeBook.name,
        value: resumeBook.id,
      };
    })
    .filter(Boolean) as { label: string; value: string }[];

  return (
    <Field
      description="Select which resume books this company should sponsor."
      error={error}
      label="Resume Book Sponsorships"
      labelFor="resumeBookIds"
    >
      <MultiCombobox defaultValues={defaultValues}>
        <MultiComboboxDisplay>
          <MultiComboboxValues name="resumeBookIds" />
          <MultiComboboxSearch id="resumeBookIds" />
        </MultiComboboxDisplay>

        <ComboboxPopover>
          <ul>
            {resumeBooks.map((resumeBook) => {
              return (
                <MultiComboboxItem
                  key={resumeBook.id}
                  label={resumeBook.name}
                  value={resumeBook.id}
                >
                  {resumeBook.name}
                </MultiComboboxItem>
              );
            })}
          </ul>
        </ComboboxPopover>
      </MultiCombobox>
    </Field>
  );
}
