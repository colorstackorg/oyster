import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';

import {
  editInternshipOffer,
  EditInternshipOfferInput,
} from '@oyster/core/job-offers';
import { db } from '@oyster/db';
import {
  Button,
  Form,
  getButtonCn,
  getErrors,
  Input,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { CompanyCombobox } from '@/shared/components/company-combobox';
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
    .selectFrom('internshipJobOffers as internshipOffers')
    .leftJoin('companies', 'companies.id', 'internshipOffers.companyId')
    .select([
      'companies.crunchbaseId as companyCrunchbaseId',
      'companies.imageUrl as companyLogo',
      'companies.name as companyName',
      'internshipOffers.additionalNotes',
      'internshipOffers.benefits',
      'internshipOffers.hourlyRate',
      'internshipOffers.id',
      'internshipOffers.location',
      'internshipOffers.negotiated',
      'internshipOffers.relocation',
      'internshipOffers.role',
      'internshipOffers.pastExperience',
      'internshipOffers.signOnBonus',

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

  return json(offer);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    EditInternshipOfferInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const offerId = params.id as string;

  const result = await editInternshipOffer(offerId, data);

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
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

      <EditInternshipOfferForm />
    </Modal>
  );
}

function EditInternshipOfferForm() {
  const {
    additionalNotes,
    benefits,
    companyCrunchbaseId,
    companyName,
    hourlyRate,
    id,
    location,
    negotiated,
    pastExperience,
    relocation,
    role,
    signOnBonus,
  } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.companyCrunchbaseId}
        label="Company"
        labelFor="companyCrunchbaseId"
        required
      >
        <CompanyCombobox
          defaultValue={{
            crunchbaseId: companyCrunchbaseId || '',
            name: companyName || '',
          }}
          name="companyCrunchbaseId"
        />
      </Form.Field>

      <Form.Field error={errors.role} label="Role" labelFor="role" required>
        <Input
          defaultValue={role || undefined}
          id="role"
          name="role"
          required
        />
      </Form.Field>

      <Form.Field
        description='Please format the location as "City, State".'
        error={errors.location}
        label="Location"
        labelFor="location"
        required
      >
        <Input defaultValue={location} id="location" name="location" required />
      </Form.Field>

      <div className="grid grid-cols-2 gap-[inherit]">
        <Form.Field
          error={errors.hourlyRate}
          label="Hourly Rate"
          labelFor="hourlyRate"
          required
        >
          <Input
            defaultValue={hourlyRate}
            id="hourlyRate"
            name="hourlyRate"
            required
            type="number"
          />
        </Form.Field>

        <Form.Field
          error={errors.signOnBonus}
          label="Sign-On Bonus"
          labelFor="signOnBonus"
        >
          <Input
            defaultValue={signOnBonus || undefined}
            id="signOnBonus"
            name="signOnBonus"
            type="number"
          />
        </Form.Field>
      </div>

      <Form.Field
        description="Does this offer anything for relocation and/or housing?"
        error={errors.relocation}
        label="Relocation / Housing"
        labelFor="relocation"
      >
        <Input
          defaultValue={relocation || undefined}
          id="relocation"
          name="relocation"
        />
      </Form.Field>

      <Form.Field
        description="How many year of experience and/or internships do you have?"
        error={errors.pastExperience}
        label="Past Experience"
        labelFor="pastExperience"
        required
      >
        <Input
          defaultValue={pastExperience || undefined}
          id="pastExperience"
          name="pastExperience"
          required
        />
      </Form.Field>

      <Form.Field
        description="Did you negotiate, and if so, what was the result?"
        error={errors.negotiated}
        label="Negotiated"
        labelFor="negotiated"
      >
        <Input
          defaultValue={negotiated || undefined}
          id="negotiated"
          name="negotiated"
        />
      </Form.Field>

      <Form.Field
        description="Does this job offer any benefits? (e.g. health insurance, 401k, etc.)"
        error={errors.benefits}
        label="Benefits"
        labelFor="benefits"
      >
        <Textarea
          defaultValue={benefits || undefined}
          id="benefits"
          minRows={2}
          name="benefits"
        />
      </Form.Field>

      <Form.Field
        description="Any additional notes about this offer?"
        error={errors.additionalNotes}
        label="Additional Notes"
        labelFor="additionalNotes"
      >
        <Textarea
          defaultValue={additionalNotes || undefined}
          id="additionalNotes"
          minRows={2}
          name="additionalNotes"
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group flexDirection="row-reverse" spacing="between">
        <Button.Submit>Edit</Button.Submit>

        <Link
          className={getButtonCn({ color: 'error', variant: 'secondary' })}
          to={generatePath(Route['/offers/internships/:id/delete'], { id })}
        >
          Delete
        </Link>
      </Button.Group>
    </RemixForm>
  );
}
