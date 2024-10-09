import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useFetcher,
  useSearchParams,
} from '@remix-run/react';
import { useEffect, useState } from 'react';

import {
  Button,
  ComboboxPopover,
  DatePicker,
  Form,
  getErrors,
  Input,
  Modal,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
  Pill,
  Select,
  Textarea,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  // params.id

  return json({});
}

export async function action() {
  return json({});
}

export default function EditOpportunity() {
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Edit Opportunity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <EditOpportunityForm />
    </Modal>
  );
}

function EditOpportunityForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field error="" label="Type" labelFor="type" required>
        <Select defaultValue="" id="type" name="type" required>
          <option value="job">Job (ie: Internship, Full-Time)</option>
          <option value="event">Event (ie: Conference, Workshop)</option>
          <option value="other">Other (ie: Program, Scholarship)</option>
        </Select>
      </Form.Field>

      <Form.Field error="" label="Title" labelFor="title" required>
        <Input defaultValue="" id="title" name="title" required />
      </Form.Field>

      <Form.Field error="" label="Description" labelFor="description">
        <Textarea
          defaultValue=""
          id="description"
          maxLength={200}
          minRows={2}
          name="description"
        />
      </Form.Field>

      <TagsField />

      <Form.Field
        description="This is the date that the opportunity will be marked as closed."
        error=""
        label="Close Date"
        labelFor="closeDate"
        required
      >
        <DatePicker
          defaultValue=""
          id="closeDate"
          name="closeDate"
          required
          type="date"
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

function TagsField() {
  const createFetcher = useFetcher<unknown>();
  const listFetcher = useFetcher<{
    tags: Array<{ id: string; name: string }>;
  }>();

  const [newTagId, setNewTagId] = useState<string>(id());
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    listFetcher.load('/api/opportunities/tags/search');
  }, []);

  const tags = listFetcher.data?.tags || [];

  function reset() {
    setNewTagId(id());
  }

  return (
    <Form.Field
      description="To categorize and help others find this opportunity."
      error=""
      label="Tags"
      labelFor="tags"
      required
    >
      <MultiCombobox defaultValues={[]}>
        {({ values }) => {
          const filteredTags = tags.filter((tag) => {
            return values.every((value) => {
              return value.value !== tag.id;
            });
          });

          return (
            <>
              <MultiComboboxDisplay>
                <MultiComboboxValues name="tags" />
                <MultiComboboxSearch
                  id="tags"
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);

                    listFetcher.submit(
                      { search: e.currentTarget.value },
                      {
                        action: '/api/opportunities/tags/search',
                        method: 'get',
                      }
                    );
                  }}
                />
              </MultiComboboxDisplay>

              {(!!filteredTags.length || !!search.length) && (
                <ComboboxPopover>
                  <ul>
                    {filteredTags.map((tag) => {
                      return (
                        <MultiComboboxItem
                          key={tag.id}
                          label={tag.name}
                          onSelect={reset}
                          value={tag.id}
                        >
                          <Pill color="pink-100">{tag.name}</Pill>
                        </MultiComboboxItem>
                      );
                    })}

                    {!!search.length && (
                      <MultiComboboxItem
                        label={search}
                        onSelect={(e) => {
                          createFetcher.submit(
                            { id: e.currentTarget.value, name: search },
                            {
                              action: '/api/opportunities/tags/add',
                              method: 'post',
                            }
                          );

                          reset();
                        }}
                        value={newTagId}
                      >
                        Create <Pill color="pink-100">{search}</Pill>
                      </MultiComboboxItem>
                    )}
                  </ul>
                </ComboboxPopover>
              )}
            </>
          );
        }}
      </MultiCombobox>
    </Form.Field>
  );
}
