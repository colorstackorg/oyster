import { Check, Edit, MoreVertical, Plus, Trash } from 'react-feather';
import { Link } from 'react-router';
import { match } from 'ts-pattern';

import { Dropdown, IconButton, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { toTitleCase } from '@oyster/utils';

type WorkExperienceMenuProps = {
  deleteTo: string;
  hasReviewed: boolean;
  reviewTo: string;
};

type WorkExperienceItemProps = {
  experience: {
    companyId: string | null;
    companyImageUrl: string | null;
    companyName: string | null;
    date: string;
    description: string | null;
    duration: string;
    employmentType: string | null;
    id: string;
    locationCity: string | null;
    locationCountry: string | null;
    locationState: string | null;
    locationType: string | null;
    title: string;
  };
} & (
  | ({ showOptions: true } & WorkExperienceMenuProps)
  | { showOptions?: undefined }
);

export function WorkExperienceItem({
  experience,
  ...rest
}: WorkExperienceItemProps) {
  const employmentType = match(experience.employmentType)
    .with('full_time', () => 'Full-time')
    .with('part_time', () => 'Part-time')
    .otherwise((value) => {
      return value ? toTitleCase(value) : null;
    });

  const locationElements: string[] = [];

  if (experience.locationState) {
    const elements = [experience.locationCity, experience.locationState];

    if (experience.locationCountry && experience.locationCountry !== 'US') {
      elements.push(experience.locationCountry);
    }

    locationElements.push(elements.join(', '));
  }

  if (experience.locationType) {
    locationElements.push(
      match(experience.locationType)
        .with('in_person', () => 'On-site')
        .otherwise(() => toTitleCase(experience.locationType!))
    );
  }

  return (
    <li className="flex flex-col gap-1 border-b border-b-gray-200 py-4 last:border-none">
      <div className="flex gap-3">
        {experience.companyImageUrl ? (
          <img
            alt={experience.companyName!}
            className="h-12 w-12 flex-shrink-0 rounded-lg object-contain"
            src={experience.companyImageUrl}
          />
        ) : (
          <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-gray-100" />
        )}

        <div>
          <div className="flex items-center gap-1">
            <Text weight="500">{experience.title}</Text>

            {!!rest.showOptions && (
              <Tooltip>
                <TooltipTrigger cursor="default">
                  <Check
                    className="text-gray-300 data-[reviewed=true]:text-success"
                    data-reviewed={!!rest.hasReviewed}
                    size="20"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {rest.hasReviewed ? (
                    <TooltipText>
                      You reviewed this work experience. 🎉
                    </TooltipText>
                  ) : (
                    <TooltipText>
                      You haven't reviewed this work experience yet. Add a
                      review{' '}
                      <Link
                        className="underline"
                        to={rest.showOptions ? rest.reviewTo : ''}
                      >
                        here
                      </Link>
                      .
                    </TooltipText>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <Text variant="sm">
            {experience.companyId ? (
              <Link
                className="hover:text-primary hover:underline"
                target="_blank"
                to={`/companies/${experience.companyId}`}
              >
                {experience.companyName}
              </Link>
            ) : (
              experience.companyName
            )}
            {employmentType && ` • ${employmentType}`}
          </Text>

          <Text color="gray-500" variant="sm">
            {experience.date} • {experience.duration}
          </Text>

          {!!locationElements.length && (
            <Text color="gray-500" variant="sm">
              {locationElements.join(' • ')}
            </Text>
          )}

          {experience.description && (
            <div className="mt-4">
              <Text
                className="whitespace-pre-line"
                color="gray-500"
                variant="sm"
              >
                {experience.description}
              </Text>
            </div>
          )}
        </div>

        {!!rest.showOptions && (
          <div className="ml-auto">
            <WorkExperienceDropdown
              deleteTo={rest.deleteTo}
              hasReviewed={rest.hasReviewed}
              reviewTo={rest.reviewTo}
            />
          </div>
        )}
      </div>
    </li>
  );
}

function WorkExperienceDropdown({
  deleteTo,
  hasReviewed,
  reviewTo,
}: WorkExperienceMenuProps) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger>
        <IconButton backgroundColorOnHover="gray-100" icon={<MoreVertical />} />
      </Dropdown.Trigger>

      <Dropdown>
        <Dropdown.List>
          <Dropdown.Item>
            <Link preventScrollReset to={reviewTo}>
              {hasReviewed ? (
                <>
                  <Edit /> Edit Review
                </>
              ) : (
                <>
                  <Plus /> Add Review
                </>
              )}
            </Link>
          </Dropdown.Item>

          <Dropdown.Item>
            <Link preventScrollReset to={deleteTo}>
              <Trash /> Delete Experience
            </Link>
          </Dropdown.Item>
        </Dropdown.List>
      </Dropdown>
    </Dropdown.Root>
  );
}
