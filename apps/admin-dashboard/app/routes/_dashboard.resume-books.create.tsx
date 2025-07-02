import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useFetcher } from '@remix-run/react';
import { useEffect } from 'react';

import { createResumeBook } from '@oyster/core/resume-books';
import { CreateResumeBookInput } from '@oyster/core/resume-books/types';
import {
  ResumeBookEndDateField,
  ResumeBookHiddenField,
  ResumeBookNameField,
  ResumeBookStartDateField,
} from '@oyster/core/resume-books/ui';
import {
  Button,
  ComboboxPopover,
  Field,
  getErrors,
  Modal,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
  validateForm,
} from '@oyster/ui';

import { type SearchCompaniesResult } from '@/routes/api.companies.search';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, CreateResumeBookInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await createResumeBook(result.data);

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
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/resume-books']}>
      <Modal.Header>
        <Modal.Title>Create Resume Book</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <ResumeBookNameField error={errors.name} />
        <ResumeBookStartDateField error={errors.startDate} />
        <ResumeBookEndDateField error={errors.endDate} />
        <SponsorsField />
        <ResumeBookHiddenField error={errors.hidden} />
        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </Form>
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
    <Field
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
    </Field>
  );
}
