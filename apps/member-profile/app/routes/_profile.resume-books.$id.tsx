import {
  type ActionFunctionArgs,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  type LoaderFunctionArgs,
  unstable_parseMultipartFormData as parseMultipartFormData,
  redirect,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';

import { SubmitResumeInput } from '@oyster/core/resume-books';
import {
  getResumeBook,
  listResumeBookSponsors,
  submitResume,
} from '@oyster/core/resume-books.server';
import { FORMATTED_RACE, Race, WorkAuthorizationStatus } from '@oyster/types';
import {
  Button,
  Checkbox,
  type DescriptionProps,
  Divider,
  type FieldProps,
  Form,
  getErrors,
  Input,
  Select,
  Text,
  validateForm,
} from '@oyster/ui';

import { HometownField } from '@/shared/components/profile.personal';
import { Route } from '@/shared/constants';
import { getMember } from '@/shared/queries';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = params.id as string;

  const [member, resumeBook, sponsors] = await Promise.all([
    getMember(user(session))
      .select([
        'email',
        'firstName',
        'hometown',
        'hometownCoordinates',
        'lastName',
        'linkedInUrl',
        'race',
        'workAuthorizationStatus',
      ])
      .executeTakeFirst(),

    getResumeBook(id),

    listResumeBookSponsors({
      where: { resumeBookId: id },
    }),
  ]);

  if (!member) {
    throw new Response(null, { status: 500 });
  }

  if (!resumeBook) {
    throw new Response(null, { status: 404 });
  }

  return json({
    member,
    resumeBook,
    sponsors,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler({ maxPartSize: 1_000_000 * 1 }),
    createMemoryUploadHandler()
  );

  let form: FormData;

  try {
    form = await parseMultipartFormData(request, uploadHandler);
  } catch (e) {
    return json(
      {
        errors: {
          resume: 'Attachment is too big. Must be less than 1 MB in size.',
        } as Record<keyof SubmitResumeInput, string>,
      },
      {
        status: 400,
      }
    );
  }

  const resumeBookId = params.id as string;

  form.set('memberId', user(session));
  form.set('resumeBookId', resumeBookId);

  const { data, errors, ok } = await validateForm(form, SubmitResumeInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await submitResume({
    firstName: data.firstName,
    lastName: data.lastName,
    hometown: data.hometown,
    hometownLatitude: data.hometownLatitude,
    hometownLongitude: data.hometownLongitude,
    linkedInUrl: data.linkedInUrl,
    memberId: data.memberId,
    preferredCompany1: data.preferredCompany1,
    preferredCompany2: data.preferredCompany2,
    preferredCompany3: data.preferredCompany3,
    race: data.race,
    resume: data.resume,
    resumeBookId: data.resumeBookId,
    workAuthorizationStatus: data.workAuthorizationStatus,
  });

  toast(session, {
    message: 'Resume submitted!',
    type: 'success',
  });

  return redirect(
    generatePath(Route['/resume-books/:id'], { id: resumeBookId }),
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

const keys = SubmitResumeInput.keyof().enum;

export default function ResumeBook() {
  const { member, resumeBook } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Text variant="2xl">Resume Book: {resumeBook.name}</Text>

        <Text color="gray-500">
          Before continuining, please ensure that your{' '}
          <Link className="link" target="_blank" to={Route['/profile/emails']}>
            primary email
          </Link>{' '}
          and{' '}
          <Link
            className="link"
            target="_blank"
            to={Route['/profile/education']}
          >
            education history
          </Link>{' '}
          is up to date.
        </Text>
      </div>

      <RemixForm
        className="form"
        data-gap="2rem"
        method="post"
        encType="multipart/form-data"
      >
        <Form.Field
          error={errors.firstName}
          label="First Name"
          labelFor={keys.firstName}
          required
        >
          <Input
            defaultValue={member.firstName}
            id={keys.firstName}
            name={keys.firstName}
            required
          />
        </Form.Field>

        <Form.Field
          error={errors.lastName}
          label="Last Name"
          labelFor={keys.lastName}
          required
        >
          <Input
            defaultValue={member.lastName}
            id={keys.lastName}
            name={keys.lastName}
            required
          />
        </Form.Field>

        <Form.Field
          description={
            <Text>
              If you would like to change your primary email, click{' '}
              <Link
                className="link"
                target="_blank"
                to={Route['/profile/emails']}
              >
                here
              </Link>
              .
            </Text>
          }
          label="Email"
          labelFor="email"
          required
        >
          <Input
            defaultValue={member.email}
            disabled
            id="email"
            name="email"
            required
          />
        </Form.Field>

        <Form.Field
          description="How do you identify?"
          error={errors.race}
          label="Race & Ethnicity"
          labelFor={keys.race}
          required
        >
          <Checkbox.Group>
            {[
              Race.BLACK,
              Race.HISPANIC,
              Race.NATIVE_AMERICAN,
              Race.MIDDLE_EASTERN,
              Race.WHITE,
              Race.ASIAN,
              Race.OTHER,
            ].map((value) => {
              return (
                <Checkbox
                  key={value}
                  defaultChecked={member.race.includes(value)}
                  id={keys.race + value}
                  label={FORMATTED_RACE[value]}
                  name={keys.race}
                  value={value}
                />
              );
            })}
          </Checkbox.Group>
        </Form.Field>

        <Form.Field
          error={error}
          label="LinkedIn Profile/URL"
          labelFor={keys.linkedInUrl}
          required
        >
          <Input
            defaultValue={member.linkedInUrl || undefined}
            id={keys.linkedInUrl}
            name={keys.linkedInUrl}
            required
          />
        </Form.Field>

        <Form.Field
          description="For reference, US and Canadian citizens are always authorized, while non-US citizens may be authorized if their immigration status allows them to work."
          error={errors.workAuthorizationStatus}
          label="Are you authorized to work in the US or Canada?"
          labelFor={keys.workAuthorizationStatus}
          required
        >
          <Select
            defaultValue={member.workAuthorizationStatus || undefined}
            id={keys.workAuthorizationStatus}
            name={keys.workAuthorizationStatus}
            required
          >
            <option value={WorkAuthorizationStatus.AUTHORIZED}>Yes</option>
            <option value={WorkAuthorizationStatus.NEEDS_SPONSORSHIP}>
              Yes, with visa sponsorship
            </option>
            <option value={WorkAuthorizationStatus.UNAUTHORIZED}>No</option>
            <option value={WorkAuthorizationStatus.UNSURE}>I'm not sure</option>
          </Select>
        </Form.Field>

        <HometownField
          defaultLatitude={member.hometownCoordinates?.y}
          defaultLongitude={member.hometownCoordinates?.x}
          defaultValue={member.hometown || undefined}
          description="Where did you grow up/attend high school?"
          error={errors.hometown}
          latitudeName={keys.hometownLatitude}
          longitudeName={keys.hometownLongitude}
          name={keys.hometown}
        />

        <Divider my="4" />

        <SponsorField
          defaultValue=""
          description="Which company would you accept an offer from right now?"
          error={errors.preferredCompany1}
          name={keys.preferredCompany1}
        />

        <SponsorField
          defaultValue=""
          description="Maybe not your #1, but which company is a close second?"
          error={errors.preferredCompany2}
          name={keys.preferredCompany2}
        />

        <SponsorField
          defaultValue=""
          description="Third?"
          error={errors.preferredCompany3}
          name={keys.preferredCompany3}
        />

        <Form.Field
          description="Must be a PDF less than 1 MB."
          error=""
          label="Resume"
          labelFor="resume"
          required
        >
          <input accept=".pdf" id="resume" name="resume" required type="file" />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Submit</Button.Submit>
        </Button.Group>
      </RemixForm>
    </section>
  );
}

function SponsorField({
  defaultValue,
  description,
  error,
  name,
}: FieldProps<string> & DescriptionProps) {
  const { sponsors } = useLoaderData<typeof loader>();

  return (
    <Form.Field
      description={description}
      error={error}
      label="Of all the ColorStack sponsors, which company are you most interested in working for?"
      labelFor={name}
      required
    >
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {sponsors.map((sponsor) => {
          return (
            <option key={sponsor.id} value={sponsor.id!}>
              {sponsor.name}
            </option>
          );
        })}
      </Select>
    </Form.Field>
  );
}
