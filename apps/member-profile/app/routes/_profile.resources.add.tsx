import { type FileUpload, parseFormData } from '@mjackson/form-data-parser';
import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useSearchParams,
} from 'react-router';

import { track } from '@oyster/core/mixpanel';
import { AddResourceInput } from '@oyster/core/resources';
import { addResource } from '@oyster/core/resources/server';
import {
  Button,
  Divider,
  ErrorMessage,
  getErrors,
  MB_IN_BYTES,
  Modal,
  validateForm,
} from '@oyster/ui';

import {
  ResourceAttachmentField,
  ResourceDescriptionField,
  ResourceLinkField,
  ResourceProvider,
  ResourceSearchConfirmationField,
  ResourceTagsField,
  ResourceTitleField,
  ResourceTypeField,
} from '@/shared/components/resource-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  async function uploadHandler(fileUpload: FileUpload) {
    if (
      fileUpload.fieldName === 'attachments' &&
      ['application/pdf', 'image/jpeg', 'image/png'].includes(fileUpload.type)
    ) {
      return fileUpload;
    }
  }

  const form = await parseFormData(
    request,
    { maxFileSize: MB_IN_BYTES * 20 },
    uploadHandler
  );

  form.set('postedBy', user(session));

  const result = await validateForm(
    {
      ...Object.fromEntries(form),
      attachments: form.getAll('attachments'),
    },
    AddResourceInput
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const addResult = await addResource(result.data);

  if (!addResult.ok) {
    return data(
      { duplicateResourceId: addResult.context!.duplicateResourceId },
      { status: addResult.code }
    );
  }

  track({
    event: 'Resource Added',
    properties: undefined,
    request,
    user: user(session),
  });

  toast(session, {
    message: 'Added resource!',
    type: 'success',
  });

  // TODO: Include query params...

  return redirect(Route['/resources'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = AddResourceInput.keyof().enum;

export default function AddResourceModal() {
  const { error, errors, ...rest } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/resources'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Add Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post" encType="multipart/form-data">
        <ResourceProvider>
          <ResourceSearchConfirmationField name="confirmation" />
          <ResourceTitleField error={errors.title} name={keys.title} />
          <ResourceDescriptionField
            error={errors.description}
            name={keys.description}
          />
          <ResourceTagsField error={errors.tags} name={keys.tags} />
          <Divider />
          <ResourceTypeField error={errors.type} name={keys.type} />
          <ResourceAttachmentField
            error={errors.attachments}
            name={keys.attachments}
          />
          <ResourceLinkField
            duplicateResourceId={
              'duplicateResourceId' in rest && rest.duplicateResourceId
            }
            error={errors.link}
            name={keys.link}
          />
        </ResourceProvider>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
