import { Link, useLocation, useSearchParams } from '@remix-run/react';
import { type PropsWithChildren } from 'react';
import { Edit, Info, Plus } from 'react-feather';

import { Button, getIconButtonCn, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

import { Card } from '@/shared/components/card';
import { Route } from '@/shared/constants';

// Add Offer Button

export function AddOfferButton() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const pathname = location.pathname.includes('/internships')
    ? Route['/offers/internships/add']
    : Route['/offers/full-time/add'];

  return (
    <Button.Slot size="small">
      <Link
        to={{
          pathname,
          search: searchParams.toString(),
        }}
      >
        <Plus size={20} /> Add Offer
      </Link>
    </Button.Slot>
  );
}

// Edit Offer Button

type EditOfferButtonProps = {
  hasWritePermission: boolean;
  pathname: string;
};

export function EditOfferButton({
  hasWritePermission,
  pathname,
}: EditOfferButtonProps) {
  const [searchParams] = useSearchParams();

  if (!hasWritePermission) {
    return null;
  }

  return (
    <>
      <Link
        className={getIconButtonCn({
          backgroundColor: 'gray-100',
          backgroundColorOnHover: 'gray-200',
        })}
        to={{
          pathname,
          search: searchParams.toString(),
        }}
      >
        <Edit />
      </Link>

      <div className="h-6 w-[1px] bg-gray-100" />
    </>
  );
}

// Offer Aggregation

type OfferAggregationProps = {
  label: string | React.ReactNode;
  value: string | number | null | undefined;
};

export function OfferAggregation({ label, value }: OfferAggregationProps) {
  return (
    <Card className="gap-1">
      <Text color="gray-500" variant="sm">
        {label}
      </Text>
      <Text variant="2xl">{value}</Text>
    </Card>
  );
}

export function OfferAggregationGroup({ children }: PropsWithChildren) {
  return (
    <div className="grid grid-cols-1 gap-2 @lg:grid-cols-2 @3xl:grid-cols-3">
      {children}
    </div>
  );
}

// Offer Detail

type OfferDetailProps = {
  label: string | React.ReactNode;
  value: string | number | null | undefined;
};

export function OfferDetail({ label, value }: OfferDetailProps) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <Text color="gray-500" variant="sm">
        {label}
      </Text>

      <Text>{value}</Text>
    </div>
  );
}

// Offer Section

export function OfferSection({ children }: PropsWithChildren) {
  return <section className="grid gap-4 sm:grid-cols-2">{children}</section>;
}

// Offer Title

type OfferTitleProps = {
  postedAt: string;
  role: string;
};

export function OfferTitle({ postedAt, role }: OfferTitleProps) {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="lg">{role}</Text>

      <Text color="gray-500" variant="sm">
        Posted {postedAt} ago
      </Text>
    </div>
  );
}

// Total Compensation Tooltip

export function TotalCompensationTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger className="align-text-bottom">
        <Info size={16} />
      </TooltipTrigger>

      <TooltipContent>
        <div className="flex flex-col gap-2 p-1">
          <TooltipText>We calculate total compensation as follows:</TooltipText>

          <TooltipText>
            <code>
              TC = Base Salary + (Stock / 4) + Performance Bonus + (Sign-On
              Bonus / 4)
            </code>
          </TooltipText>

          <ul className="list-disc ps-6 text-white">
            <li>
              <TooltipText>
                We assume a 4-year vesting period for stock.
              </TooltipText>
            </li>
            <li>
              <TooltipText>
                We annualize the sign-on bonus over 4 years to ensure that TC is
                the same throughout 4 years.
              </TooltipText>
            </li>
            <li>
              <TooltipText>
                We do not include relocation bonuses, given that there's
                typically optionality (ie: relocation stipend vs. corporate
                housing).
              </TooltipText>
            </li>
            <li>
              <TooltipText>
                If a range is specified for the performance/annual bonus, we
                assume the upper bound.
              </TooltipText>
            </li>
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
