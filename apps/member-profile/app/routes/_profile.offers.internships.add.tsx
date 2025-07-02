import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
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
  ErrorMessage,
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

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(
    request,
    AddInternshipOfferInput.omit({ postedBy: true })
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const addResult = await addInternshipOffer({
    ...result.data,
    postedBy: user(session),
  });

  if (!addResult.ok) {
    return data({ error: addResult.error }, { status: addResult.code });
  }

  toast(session, {
    message: 'Added internship offer.',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/offers/internships/:id'], {
    id: addResult.data.id,
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

      <Form className="form" method="post">
        <OfferCompanyField error={errors.companyId} />
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

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Add</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
