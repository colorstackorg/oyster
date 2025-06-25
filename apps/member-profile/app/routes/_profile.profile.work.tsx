import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { generatePath, Link, Outlet, useLoaderData } from '@remix-run/react';
import { Briefcase, MoreVertical, RefreshCw } from 'react-feather';

import { job } from '@oyster/core/bull';
import { listWorkExperiences } from '@oyster/core/member-profile/server';
import { WorkExperienceItem } from '@oyster/core/member-profile/ui';
import { Dropdown, IconButton } from '@oyster/ui';

import {
  EmptyState,
  EmptyStateContainer,
} from '@/shared/components/empty-state';
import {
  ExperienceList,
  ProfileDescription,
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const workExperiences = await listWorkExperiences(id, {
    include: ['hasReviewed'],
  });

  return json({
    workExperiences,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  job('student.linkedin.sync', {
    memberIds: [user(session)],
  });

  toast(session, {
    message:
      "We'll notify you on Slack when we've synced your LinkedIn profile.",
  });

  return json(
    {},
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function WorkHistoryPage() {
  return (
    <>
      <WorkHistorySection />
      <Outlet />
    </>
  );
}

function WorkHistorySection() {
  const { workExperiences } = useLoaderData<typeof loader>();

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Work History</ProfileTitle>

        <Dropdown.Root>
          <Dropdown.Trigger>
            <IconButton
              backgroundColorOnHover="gray-100"
              icon={<MoreVertical />}
            />
          </Dropdown.Trigger>

          <Dropdown>
            <Dropdown.List>
              <Dropdown.Item>
                <Link to={Route['/profile/work/sync']}>
                  <RefreshCw /> Sync LinkedIn Profile
                </Link>
              </Dropdown.Item>
            </Dropdown.List>
          </Dropdown>
        </Dropdown.Root>
      </ProfileHeader>

      {workExperiences.length ? (
        <>
          <ExperienceList>
            {workExperiences.map((experience) => {
              const id = experience.id;
              const hasReviewed = !!experience.hasReviewed;

              return (
                <WorkExperienceItem
                  key={experience.id}
                  deleteTo={generatePath(Route['/profile/work/:id/delete'], {
                    id,
                  })}
                  hasReviewed={hasReviewed}
                  experience={experience}
                  reviewTo={generatePath(
                    hasReviewed
                      ? Route['/profile/work/:id/review/edit']
                      : Route['/profile/work/:id/review/add'],
                    { id }
                  )}
                  showOptions={true}
                />
              );
            })}
          </ExperienceList>
        </>
      ) : (
        <>
          <EmptyStateContainer>
            <EmptyState icon={<Briefcase />} />

            <ProfileDescription>
              Please add your work history, including internships and full-time
              jobs. This will help us track outcomes as well as connect you with
              job opportunities via community connections in the future.
            </ProfileDescription>
          </EmptyStateContainer>
        </>
      )}
    </ProfileSection>
  );
}
