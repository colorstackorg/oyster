import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema.dropTable('email_campaign_opens').execute();
  await db.schema.dropTable('email_campaign_clicks').execute();
  await db.schema.dropTable('email_campaign_links').execute();
  await db.schema.dropTable('email_campaigns').execute();
  await db.schema.dropTable('email_lists').execute();
}

export async function down() {}
