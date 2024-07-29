import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData, useNavigate } from '@remix-run/react';
import { BookOpen, Plus } from 'react-feather';

import { Button } from '@oyster/ui';

import { EducationExperienceItem } from '@/shared/components/education-experience';
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
import { getEducationExperiences } from '@/shared/queries';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const educationExperiences = await getEducationExperiences(id);

  return json({
    educationExperiences,
  });
}

export default function EducationHistoryPage() {
  return (
    <>
      <EducationHistorySection />
      <Outlet />
    </>
  );
}

function EducationHistorySection() {
  const { educationExperiences } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  function onAddExperience() {
    navigate(Route['/profile/education/add']);
  }

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Education History</ProfileTitle>

        <Button.Group>
          <Button color="primary" onClick={onAddExperience} size="small">
            <Plus size={20} /> Add Education
          </Button>
        </Button.Group>
      </ProfileHeader>

      {educationExperiences.length ? (
        <>
          <ExperienceList>
            {educationExperiences.map((education) => {
              return (
                <EducationExperienceItem
                  key={education.id}
                  education={education}
                  editable
                />
              );
            })}
          </ExperienceList>
        </>
      ) : (
        <EmptyStateContainer>
          <EmptyState icon={<BookOpen />} />

          <ProfileDescription>
            Please add your education history, starting after high school. This
            will help us track outcomes as well as connect you with alumni in
            the future.
          </ProfileDescription>

          <Button color="primary" onClick={onAddExperience} size="small" fill>
            <Plus /> Add Education
          </Button>
        </EmptyStateContainer>
      )}
    </ProfileSection>
  );
}
