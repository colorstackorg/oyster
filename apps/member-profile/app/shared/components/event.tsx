import dayjs from 'dayjs';
import { PropsWithChildren } from 'react';
import { Calendar } from 'react-feather';
import { match } from 'ts-pattern';

import { Text } from '@colorstack/core-ui';

// Components

export function EventSection({ children }: PropsWithChildren) {
  return <section className="flex flex-col gap-4">{children}</section>;
}

export function EventList({ children }: PropsWithChildren) {
  return (
    <ul className="@[1440px]:grid-cols-4 @[1080px]:grid-cols-3 @[720px]:grid-cols-2 grid grid-cols-1 gap-4">
      {children}
    </ul>
  );
}

export function EventName({ name }: { name: string }) {
  return (
    <Text className="mb-auto" variant="lg" weight="600">
      {name}
    </Text>
  );
}

export function EventDate({ date }: { date: string }) {
  return (
    <div className="flex gap-2">
      <Calendar className="h-5 w-5 text-gray-500" />
      <Text color="gray-500" variant="sm">
        {date}
      </Text>
    </div>
  );
}

// Utilities

type FormatEventDateArgs = {
  endTime: Date;
  startTime: Date;
};

type FormatEventDateOptions = {
  format: 'short' | 'long';
  timezone: string;
};

export function formatEventDate(
  { endTime, startTime }: FormatEventDateArgs,
  { format, timezone }: FormatEventDateOptions
) {
  const startTimeObject = dayjs(startTime).tz(timezone);
  const endTimeObject = dayjs(endTime).tz(timezone);

  let start = '';
  let end = '';

  match({
    isSameDate: startTimeObject.date() === endTimeObject.date(),
    format,
  })
    .with({ format: 'short', isSameDate: true }, () => {
      start = startTimeObject.format('ddd, MMM D, YYYY, h:mm A');
      end = endTimeObject.format('h:mm A');
    })
    .with({ format: 'long', isSameDate: true }, () => {
      start = startTimeObject.format('dddd, MMMM D, YYYY, h:mm A');
      end = endTimeObject.format('h:mm A');
    })
    .with({ format: 'short', isSameDate: false }, () => {
      start = startTimeObject.format('ddd, MMM D, YYYY, h:mm A');
      end = endTimeObject.format('ddd, MMM D, YYYY, h:mm A');
    })
    .with({ format: 'long', isSameDate: false }, () => {
      start = startTimeObject.format('dddd, MMMM D, YYYY, h:mm A');
      end = endTimeObject.format('dddd, MMMM D, YYYY, h:mm A');
    })
    .exhaustive();

  return `${start} - ${end}`;
}
