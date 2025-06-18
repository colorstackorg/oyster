import { generatePath, Link } from '@remix-run/react';
import { Edit } from 'react-feather';

import { IconButton, Text } from '@oyster/ui';

import { Experience } from '@/shared/components/profile';
import { Route } from '@/shared/constants';

type EducationExperienceItemProps = {
  education: {
    date?: string;
    degreeType: string;
    id: string;
    logoUrl?: string | null;
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
  return (
    <Experience>
      <div className="flex gap-3">
        {education.logoUrl ? (
          <img
            alt={education.school!}
            className="h-12 w-12 rounded-lg object-contain"
            src={education.logoUrl}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
            <img className="h-8 w-8" src="/images/university.png" />
          </div>
        )}

        <div>
          <Text weight="500">{education.school}</Text>

          <Text variant="sm">
            {education.degreeType}, {education.major}
          </Text>

          {!!education.date && (
            <Text color="gray-500" variant="sm">
              {education.date}
            </Text>
          )}

          {education.location && (
            <Text color="gray-500" variant="sm">
              {education.location}
            </Text>
          )}
        </div>

        {!!editable && (
          <div className="ml-auto">
            <IconButton.Slot backgroundColorOnHover="gray-100">
              <Link
                to={generatePath(Route['/profile/education/:id/edit'], {
                  id: education.id,
                })}
              >
                <Edit />
              </Link>
            </IconButton.Slot>
          </div>
        )}
      </div>
    </Experience>
  );
}
