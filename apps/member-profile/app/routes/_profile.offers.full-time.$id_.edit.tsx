import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  Link,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';

import { editFullTimeOffer, EditFullTimeOfferInput } from '@oyster/core/offers';
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
import { db } from '@oyster/db';
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

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const offer = await db
    .selectFrom('fullTimeOffers')
    .leftJoin('companies', 'companies.id', 'fullTimeOffers.companyId')
    .select([
      'companies.imageUrl as companyLogo',
      'companies.name as companyName',
      'fullTimeOffers.additionalNotes',
      'fullTimeOffers.baseSalary',
      'fullTimeOffers.benefits',
      'fullTimeOffers.companyId',
      'fullTimeOffers.id',
      'fullTimeOffers.location',
      'fullTimeOffers.negotiated',
      'fullTimeOffers.relocation',
      'fullTimeOffers.role',
      'fullTimeOffers.pastExperience',
      'fullTimeOffers.performanceBonus',
      'fullTimeOffers.signOnBonus',
      'fullTimeOffers.totalStock',

      (eb) => {
        return eb
          .or([
            eb('fullTimeOffers.postedBy', '=', memberId),
            eb.exists(() => {
              return eb
                .selectFrom('admins')
                .where('admins.memberId', '=', memberId)
                .where('admins.deletedAt', 'is', null);
            }),
          ])
          .as('hasWritePermission');
      },
    ])
    .where('fullTimeOffers.id', '=', params.id as string)
    .executeTakeFirst();

  if (!offer) {
    throw new Response(null, {
      status: 404,
      statusText: 'The full-time offer you are trying to edit does not exist.',
    });
  }

  if (!offer.hasWritePermission) {
    throw new Response(null, {
      status: 403,
      statusText: 'You do not have permission to edit this full-time offer.',
    });
  }

  return json(offer);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, EditFullTimeOfferInput);

  if (!result.ok) {
    return json({ errors: result.errors }, { status: 400 });
  }

  const offerId = params.id as string;

  const editResult = await editFullTimeOffer(offerId, result.data);

  if (!editResult.ok) {
    return json({ error: editResult.error }, { status: editResult.code });
  }

  toast(session, {
    message: 'Edited full-time offer.',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/offers/full-time/:id'], {
    id: offerId,
  });

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function EditFullTimeOffer() {
  const {
    additionalNotes,
    baseSalary,
    benefits,
    companyId,
    companyName,
    id,
    location,
    negotiated,
    pastExperience,
    performanceBonus,
    relocation,
    role,
    signOnBonus,
    totalStock,
  } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/offers/full-time'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Edit Full-Time Offer</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <OfferCompanyField
          defaultValue={{ id: companyId || '', name: companyName || '' }}
          error={errors.companyId}
        />
        <OfferRoleField defaultValue={role} error={errors.role} />
        <OfferLocationField defaultValue={location} error={errors.location} />

        <Divider my="1" />

        <div className="grid grid-cols-2 gap-[inherit]">
          <OfferBaseSalaryField
            defaultValue={baseSalary}
            error={errors.baseSalary}
          />
          <OfferTotalStockField
            defaultValue={totalStock || undefined}
            error={errors.totalStock}
          />
          <OfferSignOnBonusField
            defaultValue={signOnBonus || undefined}
            error={errors.signOnBonus}
          />
          <OfferPerformanceBonusField
            defaultValue={performanceBonus || undefined}
            error={errors.performanceBonus}
          />
        </div>

        <OfferRelocationField
          defaultValue={relocation || undefined}
          error={errors.relocation}
        />
        <OfferBenefitsField
          defaultValue={benefits || undefined}
          error={errors.benefits}
        />

        <Divider my="1" />

        <OfferPastExperienceField
          defaultValue={pastExperience || undefined}
          error={errors.pastExperience}
        />
        <OfferNegotiatedField
          defaultValue={negotiated || undefined}
          error={errors.negotiated}
        />
        <OfferAdditionalNotesField
          defaultValue={additionalNotes || undefined}
          error={errors.additionalNotes}
        />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group flexDirection="row-reverse" spacing="between">
          <Button.Submit>Save</Button.Submit>

          <Button.Slot color="error" variant="secondary">
            <Link
              to={generatePath(Route['/offers/full-time/:id/delete'], { id })}
            >
              Delete
            </Link>
          </Button.Slot>
        </Button.Group>
      </Form>
    </Modal>
  );
}
