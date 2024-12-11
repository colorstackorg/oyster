import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

import {
  buildAttachmentsField,
  buildTagsField,
} from '@/modules/resources/shared';

type GetResourceOptions<Selection> = {
  select: Selection[];
  where: { id: string };
};

export async function getResource<
  Selection extends SelectExpression<DB, 'resources'>,
>({ select, where }: GetResourceOptions<Selection>) {
  const resource = await db
    .selectFrom('resources')
    .select([...select, buildAttachmentsField, buildTagsField])
    .where('resources.id', '=', where.id)
    .executeTakeFirst();

  return resource;
}
