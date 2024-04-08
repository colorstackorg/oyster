import { sql, type RawBuilder } from 'kysely';

type Point = {
  x: number;
  y: number;
};

export function point({ x, y }: Point): RawBuilder<Point> {
  return sql<Point>`(${x}, ${y})`;
}
