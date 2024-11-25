import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  generatePath,
  Form as RemixForm,
  useActionData,
  useSearchParams,
} from '@remix-run/react';

import {
  addInternshipOffer,
  AddInternshipOfferInput,
} from '@oyster/core/offers';
import {
  OfferAdditionalNotesField,
  OfferBenefitsField,
  OfferCompanyField,
  OfferHourlyRateField,
  OfferLocationField,
  OfferNegotiatedField,
  OfferPastExperienceField,
  OfferRelocationField,
  OfferRoleField,
} from '@oyster/core/offers/ui';
import {
  Button,
  Divider,
  Form,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

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

  const { data, errors, ok } = await validateForm(
    request,
    AddInternshipOfferInput.omit({ postedBy: true })
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const result = await addInternshipOffer({
    ...data,
    postedBy: user(session),
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Added internship offer.',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/offers/internships/:id'], {
    id: result.data.id,
  });

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddInternshipOffer() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/offers/internships'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Add Internship Offer</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <OfferCompanyField error={errors.companyCrunchbaseId} />
        <OfferRoleField error={errors.role} />
        <OfferLocationField error={errors.location} />

        <Divider my="1" />

        <OfferHourlyRateField error={errors.hourlyRate} />
        <OfferRelocationField error={errors.relocation} />
        <OfferBenefitsField error={errors.benefits} />

        <Divider my="1" />

        <OfferPastExperienceField error={errors.pastExperience} />
        <OfferNegotiatedField error={errors.negotiated} />
        <OfferAdditionalNotesField error={errors.additionalNotes} />

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Add</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
