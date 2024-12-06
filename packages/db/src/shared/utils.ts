import { type RawBuilder, sql } from 'kysely';

// Point

type Point = {
  x: number;
  y: number;
};

export function point({ x, y }: Point): RawBuilder<Point> {
  return sql<Point>`point(${x}, ${y})`;
}

// Relative Time

type TimeOperator = '+' | '-';

type TimeUnit =
  | 'hour'
  | 'hours'
  | 'day'
  | 'days'
  | 'week'
  | 'weeks'
  | 'month'
  | 'months'
  | 'year'
  | 'years';

type TimeFromNow = `now() ${TimeOperator} interval '${number} ${TimeUnit}'`;

export function relativeTime(input: TimeFromNow): RawBuilder<Date> {
  return sql<Date>`${input}`;
}
