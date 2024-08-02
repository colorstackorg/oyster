import { generatePath, Link } from '@remix-run/react';
import { type PropsWithChildren, useState } from 'react';
import { ChevronDown, ChevronUp, Edit } from 'react-feather';

import { cx, getTextCn, ProfilePicture, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

import { Card } from '@/shared/components/card';
import { Route } from '@/shared/constants';

type InterviewReviewProps = {
  interviewReviewId: string;
  company?: {
    id: string;
    image: string;
    name: string;
  };
  reviewerFirstName: string;
  reviewerLastName: string;
  reviewerId: string;
  reviewerProfilePicture: string | null;
  reviewedAt: string;
  text: string;
  title: string;
};

export const InterviewReview = ({
  company,
  text,
  reviewerFirstName,
  reviewerId,
  reviewerLastName,
  reviewerProfilePicture,
  reviewedAt,
  title,
  interviewReviewId,
}: InterviewReviewProps) => {
  return (
    <Card>
      <header className="flex items-center gap-1">
        <CompanyReviewer
          reviewerFirstName={reviewerFirstName}
          reviewerLastName={reviewerLastName}
          reviewerId={reviewerId}
          reviewerProfilePicture={reviewerProfilePicture}
        />
        <Text color="gray-500" variant="sm">
          &bull;
        </Text>
        <Text color="gray-500" variant="sm">
          {reviewedAt}
        </Text>

        <div className="ml-auto">
          <Tooltip>
            <TooltipTrigger aria-label="Edit Review">
              <Link
                to={generatePath(
                  Route['/companies/interview-reviews/:id/edit'],
                  {
                    id: interviewReviewId,
                  }
                )}
              >
                <Edit />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <TooltipText>Edit Review</TooltipText>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex items-start gap-4">
        {company?.id && (
          <div className="h-10 w-10 rounded-lg border border-gray-200 p-1">
            <img
              alt={company.name}
              className="aspect-square h-full w-full rounded-md"
              src={company.image}
            />
          </div>
        )}

        <div>
          <Text weight="500">{title}</Text>
          {company?.name && <Text variant="sm">{company.name}</Text>}
        </div>
      </div>

      <InterviewReviewText text={text} />
    </Card>
  );
};

function CompanyReviewer({
  reviewerFirstName,
  reviewerId,
  reviewerLastName,
  reviewerProfilePicture,
}: Pick<
  InterviewReviewProps,
  | 'reviewerFirstName'
  | 'reviewerLastName'
  | 'reviewerId'
  | 'reviewerProfilePicture'
>) {
  return (
    <div className="flex w-fit items-center gap-2">
      <ProfilePicture
        initials={reviewerFirstName![0] + reviewerLastName![0]}
        size="32"
        src={reviewerProfilePicture || undefined}
      />

      <Link
        className={cx(
          getTextCn({ color: 'gray-500', variant: 'sm' }),
          'hover:underline'
        )}
        to={generatePath(Route['/directory/:id'], { id: reviewerId })}
      >
        {reviewerFirstName} {reviewerLastName}
      </Link>
    </div>
  );
}

function InterviewReviewText({ text }: Pick<InterviewReviewProps, 'text'>) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <Text
        className={cx('whitespace-pre-wrap', !open && 'line-clamp-6', 'mb-4')}
      >
        {text}
      </Text>

      <button
        className="flex items-center gap-1 text-primary"
        onClick={() => {
          setOpen((value) => !value);
        }}
        type="button"
      >
        {open ? (
          <>
            Show Less <ChevronUp />
          </>
        ) : (
          <>
            Show More <ChevronDown />
          </>
        )}
      </button>
    </>
  );
}

InterviewReview.List = function List({ children }: PropsWithChildren) {
  return <ul className="flex flex-col gap-4">{children}</ul>;
};
