import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  // We're using custom SQL here b/c we now want to use the
  // "underscoreBeforeDigits" option with our database client, but it's using
  // that even in migrations which causes an error.
  await sql`
    alter table students rename column address_line1 to address_line_1;
    alter table students rename column address_line2 to address_line_2;
  `.execute(db);
}

export async function down(db: Kysely<any>) {
  await sql`
    alter table students rename column address_line_1 to address_line1;
    alter table students rename column address_line_2 to address_line2;
  `.execute(db);
}
