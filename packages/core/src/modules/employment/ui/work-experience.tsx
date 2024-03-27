import { Edit } from 'react-feather';

import { IconButton, Text } from '@colorstack/core-ui';
import { toTitleCase } from '@colorstack/utils';

type WorkExperienceItemProps = {
  experience: {
    companyImageUrl: string | null;
    companyName: string | null;
    date: string;
    id: string;
    locationCity: string | null;
    locationState: string | null;
    locationType: string;
    title: string;
  };
  onClickEdit?(): void;
};

export function WorkExperienceItem({
  experience,
  onClickEdit,
}: WorkExperienceItemProps) {
  return (
    <li className="flex flex-col gap-1 border-b border-b-gray-200 py-4 last:border-none">
      <div className="flex gap-4">
        {experience.companyImageUrl ? (
          <img
            alt={experience.companyName!}
            className="h-12 w-12 rounded-lg object-contain"
            src={experience.companyImageUrl}
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-gray-100" />
        )}

        <div>
          <Text variant="lg" weight="500">
            {experience.title}
          </Text>

          <Text>{experience.companyName}</Text>
          <Text color="gray-500">{experience.date}</Text>

          {experience.locationCity && experience.locationState && (
            <Text color="gray-500">
              {experience.locationCity}, {experience.locationState}
              {experience.locationType !== 'in_person' && (
                <span> &bull; {toTitleCase(experience.locationType)}</span>
              )}
            </Text>
          )}
        </div>

        {!!onClickEdit && (
          <IconButton
            backgroundColorOnHover="gray-100"
            className="ml-auto"
            onClick={onClickEdit}
            icon={<Edit />}
          />
        )}
      </div>
    </li>
  );
}
