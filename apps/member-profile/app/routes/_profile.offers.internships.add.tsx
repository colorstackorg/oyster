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
} from '@oyster/core/job-offers';
import {
  Button,
  Divider,
  DollarInput,
  Form,
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

      <AddInternshipOfferForm />
    </Modal>
  );
}

function AddInternshipOfferForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.companyCrunchbaseId}
        label="Company"
        labelFor="companyCrunchbaseId"
        required
      >
        <CompanyCombobox name="companyCrunchbaseId" />
      </Form.Field>

      <Form.Field error={errors.role} label="Role" labelFor="role" required>
        <Input id="role" name="role" required />
      </Form.Field>

      <Form.Field
        description='Please format the location as "City, State".'
        error={errors.location}
        label="Location"
        labelFor="location"
        required
      >
        <Input id="location" name="location" required />
      </Form.Field>

      <Divider my="1" />

      <div className="grid grid-cols-2 gap-[inherit]">
        <Form.Field
          error={errors.hourlyRate}
          label="Hourly Rate"
          labelFor="hourlyRate"
          required
        >
          <DollarInput id="hourlyRate" name="hourlyRate" required />
        </Form.Field>

        <Form.Field
          error={errors.signOnBonus}
          label="Sign-On Bonus"
          labelFor="signOnBonus"
        >
          <DollarInput id="signOnBonus" name="signOnBonus" />
        </Form.Field>
      </div>

      <Form.Field
        description="Does this offer anything for relocation and/or housing?"
        error={errors.relocation}
        label="Relocation / Housing"
        labelFor="relocation"
      >
        <Input id="relocation" name="relocation" />
      </Form.Field>

      <Form.Field
        description="Does this job offer any benefits? (e.g. health insurance, 401k, etc.)"
        error={errors.benefits}
        label="Benefits"
        labelFor="benefits"
      >
        <Textarea id="benefits" minRows={2} name="benefits" />
      </Form.Field>

      <Divider my="1" />

      <Form.Field
        description="How many years of experience and/or internships do you have?"
        error={errors.pastExperience}
        label="Past Experience"
        labelFor="pastExperience"
        required
      >
        <Input id="pastExperience" name="pastExperience" required />
      </Form.Field>

      <Form.Field
        description="Did you negotiate, and if so, what was the result?"
        error={errors.negotiated}
        label="Negotiated"
        labelFor="negotiated"
      >
        <Input id="negotiated" name="negotiated" />
      </Form.Field>

      <Form.Field
        description="Any additional notes about this offer?"
        error={errors.additionalNotes}
        label="Additional Notes"
        labelFor="additionalNotes"
      >
        <Textarea id="additionalNotes" minRows={2} name="additionalNotes" />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
