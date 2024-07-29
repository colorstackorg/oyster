import {
  type ActionFunctionArgs,
  defer,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Await,
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { Suspense } from 'react';

import { db } from '@oyster/db';
import {
  Address,
  Button,
  Form,
  getErrors,
  Modal,
  Spinner,
  Text,
  validateForm,
} from '@oyster/ui';

import {
  claimSwagPack,
  getSwagPackInventory,
  reportException,
} from '@/member-profile.server';
import { ClaimSwagPackInput } from '@/member-profile.ui';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const student = await db
    .selectFrom('students')
    .select(['activatedAt', 'claimedSwagPackAt'])
    .where('id', '=', user(session))
    .executeTakeFirst();

  if (!student || student.claimedSwagPackAt || !student.activatedAt) {
    throw new Response(null, { status: 404 });
  }

  const inventoryPromise = getSwagPackInventory();

  return defer({
    inventoryPromise,
  });
}

const ClaimSwagPackFormData = ClaimSwagPackInput.omit({
  studentId: true,
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    ClaimSwagPackFormData
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  try {
    await claimSwagPack({
      addressCity: data.addressCity,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      addressState: data.addressState,
      addressZip: data.addressZip,
      studentId: user(session),
    });

    return redirect(Route['/home/claim-swag-pack/confirmation']);
  } catch (e) {
    reportException(e);

    return json({
      error: `Something went wrong. Please double check that you have a valid address. If you are still having trouble, reach out to membership@colorstack.org for further assistance.`,
      errors,
    });
  }
}

const keys = ClaimSwagPackFormData.keyof().enum;

export default function ClaimSwagPack() {
  const { inventoryPromise } = useLoaderData<typeof loader>();

  return (
    <>
      <Modal.Header>
        <Modal.Title>Claim Your Swag Pack 🎁</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Suspense fallback={<LoadingState />}>
        <Await resolve={inventoryPromise}>
          {(inventory) => {
            return inventory > 0 ? (
              <ClaimSwagPackForm />
            ) : (
              <Modal.Description>
                Unfortunately, we ran out of swag pack inventory. However, we're
                restocking ASAP and you should be able to claim a pack in the
                next 2-4 weeks. Sorry about any inconvenience and thank you for
                your patience!
              </Modal.Description>
            );
          }}
        </Await>
      </Suspense>
    </>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-2">
      <Spinner />
      <Text color="gray-500" variant="sm">
        Checking our swag pack inventory...
      </Text>
    </div>
  );
}

function ClaimSwagPackForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Text color="gray-500">Let us know where to send your swag pack!</Text>

      <Address>
        <Form.Field
          error={errors.addressLine1}
          label="Street Address"
          labelFor={keys.addressLine1}
          required
        >
          <Address.Line1
            id={keys.addressLine1}
            name={keys.addressLine1}
            required
          />
        </Form.Field>

        <Form.Field
          error={errors.addressLine2}
          label="Apartment/Suite #"
          labelFor={keys.addressLine2}
        >
          <Address.Line2 id={keys.addressLine2} name={keys.addressLine2} />
        </Form.Field>

        <Address.HalfGrid>
          <Form.Field
            error={errors.addressCity}
            label="City"
            labelFor={keys.addressCity}
            required
          >
            <Address.City
              id={keys.addressCity}
              name={keys.addressCity}
              required
            />
          </Form.Field>

          <Form.Field
            error={errors.addressState}
            label="State"
            labelFor={keys.addressState}
            required
          >
            <Address.State
              id={keys.addressState}
              name={keys.addressState}
              required
            />
          </Form.Field>

          <Form.Field
            error={errors.addressZip}
            label="ZIP Code"
            labelFor={keys.addressZip}
            required
          >
            <Address.PostalCode
              id={keys.addressZip}
              name={keys.addressZip}
              required
            />
          </Form.Field>
        </Address.HalfGrid>
      </Address>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Claim Swag Pack</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

export function ErrorBoundary() {
  return <></>;
}
