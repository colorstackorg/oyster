import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  // We're using custom SQL here b/c we now want to use the
  // "underscoreBeforeDigits" option with our database client, which affects
  // the column name "s3_key".
  await sql`
    alter table resource_attachments rename column s3_key to object_key;
  `.execute(db);
}

export async function down(db: Kysely<any>) {
  await sql`
    alter table resource_attachments rename column object_key to s3_key;
  `.execute(db);
}
