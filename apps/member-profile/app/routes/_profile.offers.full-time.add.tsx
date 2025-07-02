import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  useActionData,
  useSearchParams,
} from '@remix-run/react';

import { addFullTimeOffer, AddFullTimeOfferInput } from '@oyster/core/offers';
import {
  OfferAdditionalNotesField,
  OfferBaseSalaryField,
  OfferBenefitsField,
  OfferCompanyField,
  OfferLocationField,
  OfferNegotiatedField,
  OfferPastExperienceField,
  OfferPerformanceBonusField,
  OfferRelocationField,
  OfferRoleField,
  OfferSignOnBonusField,
  OfferTotalStockField,
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

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(
    request,
    AddFullTimeOfferInput.omit({ postedBy: true })
  );

  if (!result.ok) {
    return json({ errors: result.errors }, { status: 400 });
  }

  const addResult = await addFullTimeOffer({
    ...result.data,
    postedBy: user(session),
  });

  if (!addResult.ok) {
    return json({ error: addResult.error }, { status: addResult.code });
  }

  toast(session, {
    message: 'Added full-time offer.',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/offers/full-time/:id'], {
    id: addResult.data.id,
  });

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddFullTimeOffer() {
  const [searchParams] = useSearchParams();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/offers/full-time'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Add Full-Time Offer</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <OfferCompanyField error={errors.companyId} />
        <OfferRoleField error={errors.role} />
        <OfferLocationField error={errors.location} />

        <Divider my="1" />

        <div className="grid grid-cols-2 gap-[inherit]">
          <OfferBaseSalaryField error={errors.baseSalary} />
          <OfferTotalStockField error={errors.totalStock} />
          <OfferSignOnBonusField error={errors.signOnBonus} />
          <OfferPerformanceBonusField error={errors.performanceBonus} />
        </div>

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
