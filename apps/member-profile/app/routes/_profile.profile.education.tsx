import { type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { BookOpen, MoreVertical, Repeat } from 'react-feather';

import { Button, Dropdown, IconButton } from '@oyster/ui';

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

  return {
    educationExperiences,
  };
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

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Education History</ProfileTitle>

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
                <Link to={Route['/profile/education/sync']}>
                  <Repeat /> Sync LinkedIn Profile
                </Link>
              </Dropdown.Item>
            </Dropdown.List>
          </Dropdown>
        </Dropdown.Root>
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

          <Button.Slot color="primary" fill>
            <Link to={Route['/profile/education/sync']}>
              <Repeat /> Sync LinkedIn Profile
            </Link>
          </Button.Slot>
        </EmptyStateContainer>
      )}
    </ProfileSection>
  );
}
