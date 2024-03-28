import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigation,
} from '@remix-run/react';

import {
  Address,
  Button,
  Form,
  getActionErrors,
  Modal,
  Text,
  validateForm,
} from '@oyster/core-ui';

import { Route } from '../shared/constants';
import { claimSwagPack, db, reportError } from '../shared/core.server';
import { ClaimSwagPackInput } from '../shared/core.ui';
import { ensureUserAuthenticated, user } from '../shared/session.server';

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

  return json({});
}

const ClaimSwagPackFormData = ClaimSwagPackInput.omit({
  studentId: true,
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    ClaimSwagPackFormData,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the issues above.',
      errors,
    });
  }

  if (data.addressState === 'PR') {
    return json({
      error: `Unfortunately, our swag pack provider, SwagUp, does not support shipments to Puerto Rico. Please reach out to membership@colorstack.org for further assistance.`,
      errors,
    });
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

    return redirect(Route.CLAIM_SWAG_PACK_CONFIRMATION);
  } catch (e) {
    reportError(e);

    return json({
      error: `Something went wrong. Please double check that you have a valid address. If you are still having trouble, reach out to membership@colorstack.org for further assistance.`,
      errors,
    });
  }
}

const keys = ClaimSwagPackFormData.keyof().enum;

export default function ClaimSwagPack() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <>
      <Modal.Header>
        <Modal.Title>Claim Your Swag Pack 🎁</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

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
          <Button loading={submitting} type="submit">
            Claim Swag Pack
          </Button>
        </Button.Group>
      </RemixForm>
    </>
  );
}

export function ErrorBoundary() {
  return <></>;
}
