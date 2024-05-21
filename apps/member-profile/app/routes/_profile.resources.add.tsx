import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form as RemixForm, useActionData, useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { z } from 'zod';

import {
  Button,
  Divider,
  Form,
  getActionErrors,
  Input,
  Modal,
  Select,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { AddResourceInput, ResourceType } from '@/member-profile.ui';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    AddResourceInput.omit({ postedBy: true }),
    Object.fromEntries(form)
  );

  return json({
    error: '',
    errors,
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
          label="Tags"
          labelFor={keys.tags}
          required
        >
          <Input id={keys.tags} name={keys.tags} required />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

function TagsInput() {
  const fetcher = useFetcher();

  return (
    <div>
      <button className="" type="button">
        + Add Tag
      </button>
    </div>
  );
}
