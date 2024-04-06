import { generatePath, useNavigate } from '@remix-run/react';
import { Edit } from 'react-feather';

import { IconButton, Text } from '@oyster/ui';

import { Experience } from './profile';
import { Route } from '../constants';

type EducationExperienceItemProps = {
  education: {
    date: string;
    degreeType: string;
    id: string;
    location: string | null;
    major: string;
    school: string | null;
  };
  editable?: boolean;
};

export function EducationExperienceItem({
  editable,
  education,
}: EducationExperienceItemProps) {
  const navigate = useNavigate();

  function onClickEdit() {
    navigate(
      generatePath(Route['/profile/education/:id/edit'], {
        id: education.id,
      })
    );
  }

  return (
    <Experience>
      <div className="flex gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
          <img className="h-8 w-8" src="/images/university.png" />
        </div>

        <div>
          <div className="flex gap-4">
            <div>
              <Text className="inline" variant="lg" weight="500">
                {education.school}
              </Text>

              {education.location && (
                <Text className="inline">, {education.location}</Text>
              )}
            </div>

            {!!editable && (
              <div className="ml-auto">
                <IconButton
                  backgroundColorOnHover="gray-100"
                  onClick={onClickEdit}
                  icon={<Edit />}
                />
              </div>
            )}
          </div>

          <Text color="gray-500">
            {education.degreeType}, {education.major}
          </Text>

          <Text color="gray-500">{education.date}</Text>
        </div>
      </div>
    </Experience>
  );
}
