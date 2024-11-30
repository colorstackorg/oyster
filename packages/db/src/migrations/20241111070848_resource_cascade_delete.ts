import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // Drop current foreign key constraints
  await db.schema
    .alterTable('resource_attachments')
    .dropConstraint('resource_attachments_resource_id_fkey')
    .execute();

  await db.schema
    .alterTable('resource_tags')
    .dropConstraint('resource_tags_resource_id_fkey')
    .execute();

  await db.schema
    .alterTable('resource_upvotes')
    .dropConstraint('resource_upvotes_resource_id_fkey')
    .execute();

  await db.schema
    .alterTable('resource_views')
    .dropConstraint('resource_views_resource_id_fkey')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropConstraint('completed_activities_resource_id_fkey')
    .execute();

  // Add back constraints with cascade delete
  await db.schema
    .alterTable('resource_attachments')
    .addForeignKeyConstraint(
      'resource_attachments_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('resource_tags')
    .addForeignKeyConstraint(
      'resource_tags_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('resource_upvotes')
    .addForeignKeyConstraint(
      'resource_upvotes_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('resource_views')
    .addForeignKeyConstraint(
      'resource_views_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .addForeignKeyConstraint(
      'completed_activities_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .onDelete('cascade')
    .execute();
}

export async function down(db: Kysely<any>) {
  // Drop constraints that had cascade delete
  await db.schema
    .alterTable('resource_attachments')
    .dropConstraint('resource_attachments_resource_id_fkey')
    .execute();

  await db.schema
    .alterTable('resource_tags')
    .dropConstraint('resource_tags_resource_id_fkey')
    .execute();

  await db.schema
    .alterTable('resource_upvotes')
    .dropConstraint('resource_upvotes_resource_id_fkey')
    .execute();

  await db.schema
    .alterTable('resource_views')
    .dropConstraint('resource_views_resource_id_fkey')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropConstraint('completed_activities_resource_id_fkey')
    .execute();

  // Add back constraints with restrict delete

  await db.schema
    .alterTable('resource_attachments')
    .addForeignKeyConstraint(
      'resource_attachments_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .execute();

  await db.schema
    .alterTable('resource_tags')
    .addForeignKeyConstraint(
      'resource_tags_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .execute();

  await db.schema
    .alterTable('resource_upvotes')
    .addForeignKeyConstraint(
      'resource_upvotes_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .execute();

  await db.schema
    .alterTable('resource_views')
    .addForeignKeyConstraint(
      'resource_views_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .addForeignKeyConstraint(
      'completed_activities_resource_id_fkey',
      ['resource_id'],
      'resources',
      ['id']
    )
    .execute();
}
