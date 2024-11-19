import { type PropsWithChildren } from 'react';

import { Text } from '@oyster/ui';

// Offer Detail

type OfferDetailProps = {
  label: string;
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
