import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  generatePath,
  Outlet,
  useLoaderData,
  useNavigate,
} from '@remix-run/react';
import { Briefcase, Plus } from 'react-feather';

import { listWorkExperiences } from '@oyster/core/member-profile/server';
import { WorkExperienceItem } from '@oyster/core/member-profile/ui';
import { Button } from '@oyster/ui';

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
import { ensureUserAuthenticated, user } from '@/shared/session.server';

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

  const navigate = useNavigate();

  function onAddExperience() {
    navigate(Route['/profile/work/add']);
  }

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Work History</ProfileTitle>

        <Button.Group>
          <Button color="primary" onClick={onAddExperience} size="small">
            <Plus size={20} /> Add Experience
          </Button>
        </Button.Group>
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
                  editTo={generatePath(Route['/profile/work/:id/edit'], { id })}
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

            <Button color="primary" onClick={onAddExperience} size="small" fill>
              <Plus /> Add Experience
            </Button>
          </EmptyStateContainer>
        </>
      )}
    </ProfileSection>
  );
}
