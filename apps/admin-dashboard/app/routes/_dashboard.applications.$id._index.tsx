import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren, useState } from 'react';

import {
  Application as ApplicationType,
  type Gender,
  type Major,
  type OtherDemographic,
  type Race,
} from '@oyster/types';
import { Button, Text } from '@oyster/ui';

import { Route } from '../shared/constants';
import {
  acceptApplication,
  getApplication,
  rejectApplication,
} from '../shared/core.server';
import { Application, type EducationLevel } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  const application = await getApplication(
    params.id as string,
    [
      'applications.createdAt',
      'applications.contribution',
      'applications.educationLevel',
      'applications.email',
      'applications.firstName',
      'applications.gender',
      'applications.goals',
      'applications.graduationYear',
      'applications.lastName',
      'applications.linkedInUrl',
      'applications.major',
      'applications.otherDemographics',
      'applications.otherMajor',
      'applications.otherSchool',
      'applications.race',
      'applications.status',
    ],
    { withSchool: true }
  );

  if (!application) {
    throw new Response(null, { status: 404 });
  }

  return json({
    application,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  const adminId = user(session);

  const form = await request.formData();

  const { action } = Object.fromEntries(form);

  try {
    switch (action) {
      case 'accept': {
        await acceptApplication(params.id as string, adminId);

        toast(session, {
          message: 'Application has been accepted.',
          type: 'success',
        });

        break;
      }

      case 'reject': {
        await rejectApplication(params.id as string, adminId);

        toast(session, {
          message: 'Application has been rejected.',
          type: 'success',
        });

        break;
      }
    }

    return redirect(Route.APPLICATIONS, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({
      error: 'Something went wrong, please try again.',
    });
  }
}

const ApplyFormData = ApplicationType.pick({
  contribution: true,
  educationLevel: true,
  email: true,
  firstName: true,
  gender: true,
  goals: true,
  graduationYear: true,
  lastName: true,
  linkedInUrl: true,
  major: true,
  otherDemographics: true,
  otherMajor: true,
  otherSchool: true,
  race: true,
  schoolId: true,
});

export default function ApplicationPage() {
  const [showAll, setShowAll] = useState<boolean>(false);

  const { formData, state } = useNavigation();

  const acceptButtonLoading =
    state === 'submitting' && formData?.get('action') === 'accept';

  const rejectButtonLoading =
    state === 'submitting' && formData?.get('action') === 'reject';

  const { application } = useLoaderData<typeof loader>();

  function onToggleVisibility() {
    setShowAll((value) => !value);
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Text variant="2xl">
              {application.firstName} {application.lastName}
            </Text>

            <a
              href={application.linkedInUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <img
                alt="LinkedIn Icon"
                height={20}
                src="/images/linkedin.png"
                width={20}
              />
            </a>
          </div>

          <Text color="gray-500" variant="sm">
            Applied on{' '}
            {dayjs(application.createdAt).format('MM/DD/YY @ h:mm A')}
          </Text>
        </div>

        {application.status === 'pending' && (
          <RemixForm method="post">
            <Button.Group>
              <Button
                color="success"
                loading={acceptButtonLoading}
                name="action"
                type="submit"
                value="accept"
              >
                Accept
              </Button>

              <Button
                color="error"
                loading={rejectButtonLoading}
                name="action"
                type="submit"
                value="reject"
              >
                Reject
              </Button>
            </Button.Group>
          </RemixForm>
        )}
      </header>

      <button
        className="w-fit text-sm text-gray-500 underline"
        onClick={onToggleVisibility}
        type="button"
      >
        {showAll ? 'Show Important Fields Only' : 'Show All Fields'}
      </button>

      <div className="form" data-gap="2rem">
        <ApplicationFieldGroup showAll={showAll} />
      </div>
    </div>
  );
}

const ApplicationKey = ApplyFormData.keyof().enum;

function ApplicationFieldGroup({
  showAll,
}: PropsWithChildren<{ showAll: boolean }>) {
  const { application } = useLoaderData<typeof loader>();

  return showAll ? (
    <Application readOnly>
      <Application.FirstNameField
        defaultValue={application.firstName}
        name={ApplicationKey.firstName}
      />

      <Application.LastNameField
        defaultValue={application.lastName}
        name={ApplicationKey.lastName}
      />

      <Application.EmailField
        defaultValue={application.email}
        name={ApplicationKey.email}
      />

      <Application.LinkedInField
        defaultValue={application.linkedInUrl}
        name={ApplicationKey.linkedInUrl}
      />

      <Application.SchoolField
        defaultValue={application.school || 'Other'}
        name={ApplicationKey.schoolId}
      />

      <Application.OtherSchoolField
        defaultValue={application.otherSchool || undefined}
        name={ApplicationKey.otherSchool}
      />

      <Application.MajorField
        defaultValue={(application.major as Major) || undefined}
        name={ApplicationKey.major}
      />

      <Application.OtherMajorField
        defaultValue={application.otherMajor || undefined}
        name={ApplicationKey.otherMajor}
      />

      <Application.EducationLevelField
        defaultValue={
          (application.educationLevel as EducationLevel) || undefined
        }
        name={ApplicationKey.educationLevel}
      />

      <Application.GraduationYearField
        defaultValue={application.graduationYear}
        name={ApplicationKey.graduationYear}
      />

      <Application.RaceField
        defaultValue={(application.race as Race[]) || undefined}
        name={ApplicationKey.race}
      />

      <Application.GenderField
        defaultValue={(application.gender as Gender) || undefined}
        name={ApplicationKey.gender}
      />

      <Application.OtherDemographicsField
        defaultValue={
          (application.otherDemographics as OtherDemographic[]) || undefined
        }
        name={ApplicationKey.otherDemographics}
      />

      <Application.GoalsField
        defaultValue={application.goals}
        name={ApplicationKey.goals}
      />

      <Application.ContributionField
        defaultValue={application.contribution}
        name={ApplicationKey.contribution}
      />
    </Application>
  ) : (
    <Application readOnly>
      <Application.SchoolField
        defaultValue={application.school || 'Other'}
        name={ApplicationKey.schoolId}
      />

      <Application.OtherSchoolField
        defaultValue={application.otherSchool || undefined}
        name={ApplicationKey.otherSchool}
      />

      <Application.MajorField
        defaultValue={(application.major as Major) || undefined}
        name={ApplicationKey.major}
      />

      <Application.OtherMajorField
        defaultValue={application.otherMajor || undefined}
        name={ApplicationKey.otherMajor}
      />

      <Application.EducationLevelField
        defaultValue={
          (application.educationLevel as EducationLevel) || undefined
        }
        name={ApplicationKey.educationLevel}
      />

      <Application.GraduationYearField
        defaultValue={application.graduationYear}
        name={ApplicationKey.graduationYear}
      />

      <Application.RaceField
        defaultValue={(application.race as Race[]) || undefined}
        name={ApplicationKey.race}
      />
    </Application>
  );
}

export function ErrorBoundary() {
  return <></>;
}
