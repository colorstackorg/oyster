import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { Text } from '@oyster/ui';

import { EducationExperienceItem } from '@/shared/components/education-experience';
import {
  ExperienceList,
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
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

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Education History</ProfileTitle>
      </ProfileHeader>

      {educationExperiences.length ? (
        <>
          <ExperienceList>
            {educationExperiences.map((education) => {
              return (
                <EducationExperienceItem
                  key={education.id}
                  education={education}
                />
              );
            })}
          </ExperienceList>
        </>
      ) : (
        <Text color="gray-500" variant="sm">
          No education experiences found.
        </Text>
      )}
    </ProfileSection>
  );
}
