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
  acceptApplication,
  rejectApplication,
} from '@oyster/core/applications';
import { getApplication } from '@oyster/core/applications';
import {
  Application as ApplicationType,
  type Gender,
  type Major,
  type OtherDemographic,
  type Race,
} from '@oyster/types';
import { Button, Text } from '@oyster/ui';

import { Application, type EducationLevel } from '@/admin-dashboard.ui';
import { Route } from '@/shared/constants';
import {
  admin,
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

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

  const form = await request.formData();

  const { action } = Object.fromEntries(form);

  try {
    switch (action) {
      case 'accept': {
        await acceptApplication(params.id as string, admin(session));

        toast(session, {
          message: 'Application has been accepted.',
        });

        break;
      }

      case 'reject': {
        await rejectApplication(params.id as string, admin(session));

        toast(session, {
          message: 'Application has been rejected.',
        });

        break;
      }
    }

    return redirect(Route['/applications'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json(
      { error: 'Something went wrong, please try again.' },
      { status: 500 }
    );
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

  const acceptButtonSubmitting =
    state === 'submitting' && formData?.get('action') === 'accept';

  const rejectButtonSubmitting =
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
                name="action"
                submitting={acceptButtonSubmitting}
                type="submit"
                value="accept"
              >
                Accept
              </Button>

              <Button
                color="error"
                name="action"
                submitting={rejectButtonSubmitting}
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

const keys = ApplyFormData.keyof().enum;

function ApplicationFieldGroup({
  showAll,
}: PropsWithChildren<{ showAll: boolean }>) {
  const { application } = useLoaderData<typeof loader>();

  return showAll ? (
    <Application readOnly>
      <Application.FirstNameField
        defaultValue={application.firstName}
        name={keys.firstName}
      />

      <Application.LastNameField
        defaultValue={application.lastName}
        name={keys.lastName}
      />

      <Application.EmailField
        defaultValue={application.email}
        name={keys.email}
      />

      <Application.LinkedInField
        defaultValue={application.linkedInUrl}
        name={keys.linkedInUrl}
      />

      <Application.SchoolField
        defaultValue={application.school || 'Other'}
        name={keys.schoolId}
      />

      <Application.OtherSchoolField
        defaultValue={application.otherSchool || undefined}
        name={keys.otherSchool}
      />

      <Application.MajorField
        defaultValue={(application.major as Major) || undefined}
        name={keys.major}
      />

      <Application.OtherMajorField
        defaultValue={application.otherMajor || undefined}
        name={keys.otherMajor}
      />

      <Application.EducationLevelField
        defaultValue={
          (application.educationLevel as EducationLevel) || undefined
        }
        name={keys.educationLevel}
      />

      <Application.GraduationYearField
        defaultValue={application.graduationYear}
        name={keys.graduationYear}
      />

      <Application.RaceField
        defaultValue={(application.race as Race[]) || undefined}
        name={keys.race}
      />

      <Application.GenderField
        defaultValue={(application.gender as Gender) || undefined}
        name={keys.gender}
      />

      <Application.OtherDemographicsField
        defaultValue={
          (application.otherDemographics as OtherDemographic[]) || undefined
        }
        name={keys.otherDemographics}
      />

      <Application.GoalsField
        defaultValue={application.goals}
        name={keys.goals}
      />

      <Application.ContributionField
        defaultValue={application.contribution}
        name={keys.contribution}
      />
    </Application>
  ) : (
    <Application readOnly>
      <Application.SchoolField
        defaultValue={application.school || 'Other'}
        name={keys.schoolId}
      />

      <Application.OtherSchoolField
        defaultValue={application.otherSchool || undefined}
        name={keys.otherSchool}
      />

      <Application.MajorField
        defaultValue={(application.major as Major) || undefined}
        name={keys.major}
      />

      <Application.OtherMajorField
        defaultValue={application.otherMajor || undefined}
        name={keys.otherMajor}
      />

      <Application.EducationLevelField
        defaultValue={
          (application.educationLevel as EducationLevel) || undefined
        }
        name={keys.educationLevel}
      />

      <Application.GraduationYearField
        defaultValue={application.graduationYear}
        name={keys.graduationYear}
      />

      <Application.RaceField
        defaultValue={(application.race as Race[]) || undefined}
        name={keys.race}
      />
    </Application>
  );
}

export function ErrorBoundary() {
  return <></>;
}
