import {
  type ActionFunctionArgs,
  data,
  Form,
  generatePath,
  Link,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
  useSearchParams,
} from 'react-router';

import {
  editInternshipOffer,
  EditInternshipOfferInput,
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
    .selectFrom('internshipOffers')
    .leftJoin('companies', 'companies.id', 'internshipOffers.companyId')
    .select([
      'companies.imageUrl as companyLogo',
      'companies.name as companyName',
      'internshipOffers.additionalNotes',
      'internshipOffers.benefits',
      'internshipOffers.companyId',
      'internshipOffers.hourlyRate',
      'internshipOffers.id',
      'internshipOffers.location',
      'internshipOffers.negotiated',
      'internshipOffers.relocation',
      'internshipOffers.role',
      'internshipOffers.pastExperience',

      (eb) => {
        return eb
          .or([
            eb('internshipOffers.postedBy', '=', memberId),
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
    .where('internshipOffers.id', '=', params.id as string)
    .executeTakeFirst();

  if (!offer) {
    throw new Response(null, {
      status: 404,
      statusText: 'The internship offer you are trying to edit does not exist.',
    });
  }

  if (!offer.hasWritePermission) {
    throw new Response(null, {
      status: 403,
      statusText: 'You do not have permission to edit this internship offer.',
    });
  }

  return offer;
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, EditInternshipOfferInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const offerId = params.id as string;

  const editResult = await editInternshipOffer(offerId, result.data);

  if (!editResult.ok) {
    return data({ error: editResult.error }, { status: editResult.code });
  }

  toast(session, {
    message: 'Edited internship offer.',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/offers/internships/:id'], {
    id: offerId,
  });

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function EditInternshipOffer() {
  const {
    additionalNotes,
    benefits,
    companyId,
    companyName,
    hourlyRate,
    id,
    location,
    negotiated,
    pastExperience,
    relocation,
    role,
  } = useLoaderData<typeof loader>();
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
        <Modal.Title>Edit Internship Offer</Modal.Title>
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

        <OfferHourlyRateField
          defaultValue={hourlyRate}
          error={errors.hourlyRate}
        />
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
              to={generatePath(Route['/offers/internships/:id/delete'], { id })}
            >
              Delete
            </Link>
          </Button.Slot>
        </Button.Group>
      </Form>
    </Modal>
  );
}
