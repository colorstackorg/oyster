import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData, useFetcher } from '@remix-run/react';
import { useEffect } from 'react';

import {
  Button,
  ComboboxPopover,
  DatePicker,
  Divider,
  Form,
  getErrors,
  Input,
  Modal,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
  validateForm,
} from '@oyster/ui';

import { createResumeBook } from '@/member-profile.server';
import { CreateResumeBookInput } from '@/member-profile.ui';
import { type SearchCompaniesResult } from '@/routes/api.companies.search';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    CreateResumeBookInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await createResumeBook({
    airtableBaseId: data.airtableBaseId,
    airtableTableId: data.airtableTableId,
    endDate: data.endDate,
    name: data.name,
    sponsors: data.sponsors,
    startDate: data.startDate,
  });

  toast(session, {
    message: 'Created resume book.',
    type: 'success',
  });

  return redirect(Route['/resume-books'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = CreateResumeBookInput.keyof().enum;

export default function CreateResumeBookModal() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/resume-books']}>
      <Modal.Header>
        <Modal.Title>Create Resume Book</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <Form.Field
          description="Example: Spring '24"
          error={errors.name}
          label="Name"
          labelFor={keys.name}
          required
        >
          <Input id={keys.name} name={keys.name} required />
        </Form.Field>

        <Form.Field
          description="The date that the resume book should start accepting responses."
          error={errors.startDate}
          label="Start Date"
          labelFor={keys.startDate}
          required
        >
          <DatePicker
            id={keys.startDate}
            name={keys.startDate}
            type="date"
            required
          />
        </Form.Field>

        <Form.Field
          description="The date that the resume book should stop accepting responses."
          error={errors.endDate}
          label="End Date"
          labelFor={keys.endDate}
          required
        >
          <DatePicker
            id={keys.endDate}
            name={keys.endDate}
            type="date"
            required
          />
        </Form.Field>

        <SponsorsField />

        <Divider />

        <Form.Field
          description="This is the ID of the Airtable base that the resume book responses will be sent to."
          error={errors.airtableBaseId}
          label="Airtable Base ID"
          labelFor={keys.airtableBaseId}
          required
        >
          <Input id={keys.airtableBaseId} name={keys.airtableBaseId} required />
        </Form.Field>

        <Form.Field
          description="This is the ID of the Airtable table that the resume book responses will be sent to."
          error={errors.airtableTableId}
          label="Airtable Table ID"
          labelFor={keys.airtableTableId}
          required
        >
          <Input
            id={keys.airtableTableId}
            name={keys.airtableTableId}
            required
          />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

function SponsorsField() {
  const fetcher = useFetcher<SearchCompaniesResult>();
  const { errors } = getErrors(useActionData<typeof action>());

  useEffect(() => {
    fetcher.load('/api/companies/search');
  }, []);

  const companies = fetcher.data?.companies || [];

  return (
    <Form.Field
      description="Please choose all of the companies that are sponsoring this resume book."
      error={errors.sponsors}
      label="Sponsors"
      labelFor={keys.sponsors}
      required
    >
      <MultiCombobox>
        <MultiComboboxDisplay>
          <MultiComboboxValues name={keys.sponsors} />
          <MultiComboboxSearch
            id="search"
            onChange={(e) => {
              fetcher.submit(
                { search: e.currentTarget.value },
                {
                  action: '/api/companies/search',
                  method: 'get',
                }
              );
            }}
          />
        </MultiComboboxDisplay>

        <ComboboxPopover>
          <ul>
            {companies.map((company) => {
              return (
                <MultiComboboxItem
                  key={company.id}
                  label={company.name}
                  value={company.id}
                >
                  {company.name}
                </MultiComboboxItem>
              );
            })}
          </ul>
        </ComboboxPopover>
      </MultiCombobox>
    </Form.Field>
  );
}
