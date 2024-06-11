import { Link } from '@remix-run/react';
import { useState } from 'react';
import { Check, Edit, MoreVertical, Plus } from 'react-feather';

import { Dropdown, IconButton, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { toTitleCase } from '@oyster/utils';

type WorkExperienceMenuProps = {
  editTo: string;
  hasReviewed: boolean;
  reviewTo: string;
};

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
} & (
  | ({ showOptions: true } & WorkExperienceMenuProps)
  | { showOptions?: undefined }
);

export function WorkExperienceItem({
  experience,
  ...rest
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
          <div className="flex items-center gap-1">
            <Text variant="lg" weight="500">
              {experience.title}
            </Text>

            {!!rest.showOptions && (
              <Tooltip>
                <TooltipTrigger>
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

        {!!rest.showOptions && (
          <div className="ml-auto">
            <WorkExperienceDropdown
              editTo={rest.editTo}
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
  editTo,
  hasReviewed,
  reviewTo,
}: WorkExperienceMenuProps) {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onClick() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      <IconButton
        backgroundColorOnHover="gray-100"
        icon={<MoreVertical />}
        onClick={onClick}
      />

      {open && (
        <Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link to={editTo}>
                <Edit /> Edit Experience
              </Link>
            </Dropdown.Item>
            <Dropdown.Item>
              <Link to={reviewTo}>
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
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}
