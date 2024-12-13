import dayjs from 'dayjs';
import { match } from 'ts-pattern';

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
