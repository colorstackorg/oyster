import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData, useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

import {
  Button,
  ComboboxPopover,
  Divider,
  Form,
  getActionErrors,
  Input,
  type InputProps,
  Modal,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
  Pill,
  Select,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { addResource } from '@/member-profile.server';
import { AddResourceInput, ResourceType } from '@/member-profile.ui';
import { type SearchTagsResult } from '@/routes/api.tags.search';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    AddResourceInput.omit({ postedBy: true }),
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await addResource({
    description: data.description,
    link: data.link,
    tags: data.tags,
    postedBy: user(session),
    title: data.title,
    type: data.type,
  });

  toast(session, {
    message: 'Added resource!',
    type: 'success',
  });

  return redirect(Route['/resources'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = AddResourceInput.keyof().enum;

export default function AddResourceModal() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const [type, setType] = useState<ResourceType | null>(null);

  return (
    <Modal onCloseTo={Route['/resources']}>
      <Modal.Header>
        <Modal.Title>Add Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <Form.Field
          description="What kind of type is this resource?"
          label="Type"
          labelFor={keys.type}
          required
        >
          <Select
            id={keys.type}
            name={keys.type}
            onChange={(e) => {
              setType(e.currentTarget.value as ResourceType);
            }}
            required
          >
            <option value={ResourceType.URL}>URL</option>
            <option value={ResourceType.ATTACHMENT}>
              Attachment (ie: PDF, PNG)
            </option>
          </Select>
        </Form.Field>

        {type === 'attachment' && <></>}

        {type === 'url' && (
          <Form.Field
            description="Please include the full URL."
            error={errors.link}
            label="URL"
            labelFor={keys.link}
            required
          >
            <Input id={keys.link} name={keys.link} required />
          </Form.Field>
        )}

        <Divider />

        <Form.Field
          error={errors.title}
          label="Title"
          labelFor={keys.title}
          required
        >
          <Input id={keys.title} name={keys.title} required />
        </Form.Field>

        <Form.Field
          error={errors.description}
          label="Description"
          labelFor={keys.description}
          required
        >
          <Textarea
            id={keys.description}
            minRows={2}
            name={keys.description}
            required
          />
        </Form.Field>

        <Form.Field
          description="To categorize and help others find this resource."
          error={errors.tags}
          label="Tags"
          labelFor={keys.tags}
          required
        >
          <TagsCombobox name={keys.tags} />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

function TagsCombobox({ name }: Pick<InputProps, 'name'>) {
  const createFetcher = useFetcher<unknown>();
  const listFetcher = useFetcher<SearchTagsResult>();

  const [newTagId, setNewTagId] = useState<string>(id());
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    listFetcher.load('/api/tags/search');
  }, []);

  const tags = listFetcher.data?.tags || [];

  function reset() {
    setNewTagId(id());
    setSearch('');
  }

  return (
    <MultiCombobox>
      <MultiComboboxDisplay>
        <MultiComboboxValues name={name} />
        <MultiComboboxSearch
          id={name}
          onChange={(e) => {
            setSearch(e.currentTarget.value);

            listFetcher.submit(
              { search: e.currentTarget.value },
              {
                action: '/api/tags/search',
                method: 'get',
              }
            );
          }}
        />
      </MultiComboboxDisplay>

      {(!!tags.length || !!search.length) && (
        <ComboboxPopover>
          <ul>
            {tags.map((tag) => {
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
                      action: '/api/tags/add',
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
    </MultiCombobox>
  );
}
