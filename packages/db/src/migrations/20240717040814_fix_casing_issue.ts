import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  // Only using custom SQL to fix an issue with the database client - don't use
  // custom SQL for the most part.
  await sql`
    alter table students rename column address_line_1 to address_line1;
    alter table students rename column address_line_2 to address_line2;
    alter table resume_book_submissions rename column preferred_company_1 to preferred_company1;
    alter table resume_book_submissions rename column preferred_company_2 to preferred_company2;
    alter table resume_book_submissions rename column preferred_company_3 to preferred_company3;
  `.execute(db);
}

export async function down(db: Kysely<any>) {
  await sql`
    alter table students rename column address_line1 to address_line_1;
    alter table students rename column address_line2 to address_line_2;
    alter table resume_book_submissions rename column preferred_company1 to preferred_company_1;
    alter table resume_book_submissions rename column preferred_company2 to preferred_company_2;
    alter table resume_book_submissions rename column preferred_company3 to preferred_company_3;
  `.execute(db);
}
