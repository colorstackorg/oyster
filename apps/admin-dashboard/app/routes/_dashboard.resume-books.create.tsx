import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData, useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

import { createResumeBook } from '@oyster/core/resumes';
import { CreateResumeBookInput } from '@oyster/core/resumes/types';
import {
  ResumeBookEndDateField,
  ResumeBookHiddenField,
  ResumeBookNameField,
  ResumeBookStartDateField,
} from '@oyster/core/resumes/ui';
import {
  Button,
  ComboboxPopover,
  Form,
  getErrors,
  Modal,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxList,
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
    endDate: data.endDate,
    hidden: data.hidden,
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
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/resume-books']}>
      <Modal.Header>
        <Modal.Title>Create Resume Book</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <ResumeBookNameField error={errors.name} />
        <ResumeBookStartDateField error={errors.startDate} />
        <ResumeBookEndDateField error={errors.endDate} />
        <SponsorsField />
        <ResumeBookHiddenField error={errors.hidden} />
        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

function SponsorsField() {
  const [search, setSearch] = useState('');
  const fetcher = useFetcher<SearchCompaniesResult>();
  const { errors } = getErrors(useActionData<typeof action>());

  useEffect(() => {
    fetcher.load('/api/companies/search');
  }, []);

  const companies = fetcher.data?.companies || [];

  const parsedCompanies = companies.map((item) => {
    return {
      name: item.name,
      id: item.id,
    };
  });

  return (
    <Form.Field
      description="Please choose all of the companies that are sponsoring this resume book."
      error={errors.sponsors}
      label="Sponsors"
      labelFor={keys.sponsors}
      required
    >
      <MultiCombobox>
        {({ values }) => {
          const filteredCompanies = parsedCompanies.filter((item) => {
            return values.every((value) => value.value !== item.id);
          });

          return (
            <>
              <MultiComboboxDisplay>
                <MultiComboboxValues name={keys.sponsors} />
                <MultiComboboxSearch
                  id={keys.sponsors}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);

                    fetcher.submit(
                      { search: e.currentTarget.value },
                      {
                        action: '/api/companies/search',
                        method: 'get',
                      }
                    );
                  }}
                  items={filteredCompanies}
                />
              </MultiComboboxDisplay>

              {(!!filteredCompanies.length || !!search.length) && (
                <ComboboxPopover>
                  <MultiComboboxList items={filteredCompanies} />
                </ComboboxPopover>
              )}
            </>
          );
        }}
      </MultiCombobox>
    </Form.Field>
  );
}
