import { type Kysely } from 'kysely';

const ACCENT_COLORS = [
  'amber-100',
  'blue-100',
  'cyan-100',
  'green-100',
  'lime-100',
  'orange-100',
  'pink-100',
  'purple-100',
  'red-100',
];

function getRandomAccentColor() {
  return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];
}

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('resource_tags')
    .renameTo('resource_tag_associations')
    .execute();

  await db.schema.alterTable('tags').renameTo('resource_tags').execute();

  await db.schema
    .alterTable('resource_tags')
    .addColumn('color', 'text')
    .execute();

  const tags = await db.selectFrom('resource_tags').select('id').execute();

  for (const tag of tags) {
    await db
      .updateTable('resource_tags')
      .set({ color: getRandomAccentColor() })
      .where('id', '=', tag.id)
      .execute();
  }

  await db.schema
    .alterTable('resource_tags')
    .alterColumn('color', (column) => {
      return column.setNotNull();
    })
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('resource_tags').dropColumn('color').execute();

  await db.schema.alterTable('resource_tags').renameTo('tags').execute();

  await db.schema
    .alterTable('resource_tag_associations')
    .renameTo('resource_tags')
    .execute();
}
