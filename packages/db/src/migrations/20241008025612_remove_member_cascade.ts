import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // Drop all the constraints, then we'll re-add them with the cascade.

  await db.schema
    .alterTable('census_responses')
    .dropConstraint('census_responses_student_id_fkey')
    .execute();

  await db.schema
    .alterTable('company_reviews')
    .dropConstraint('company_reviews_student_id_fkey')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .dropConstraint('completed_activities_resource_upvoted_by_fkey')
    .execute();

  await db.schema
    .alterTable('company_review_upvotes')
    .dropConstraint('company_review_upvotes_student_id_fkey')
    .execute();

  await db.schema
    .alterTable('referrals')
    .dropConstraint('referrals_referrer_id_fkey')
    .execute();

  await db.schema
    .alterTable('resources')
    .dropConstraint('resources_posted_by_fkey')
    .execute();

  await db.schema
    .alterTable('resource_upvotes')
    .dropConstraint('resource_upvotes_student_id_fkey')
    .execute();

  await db.schema
    .alterTable('resource_views')
    .dropConstraint('resource_views_student_id_fkey')
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .dropConstraint('resume_book_submissions_member_id_fkey')
    .execute();

  // Add the constraints back w/ the cascade.

  await db.schema
    .alterTable('census_responses')
    .addForeignKeyConstraint(
      'census_responses_student_id_fkey',
      ['student_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('company_reviews')
    .addForeignKeyConstraint(
      'company_reviews_student_id_fkey',
      ['student_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('completed_activities')
    .addForeignKeyConstraint(
      'completed_activities_resource_upvoted_by_fkey',
      ['resource_upvoted_by'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('company_review_upvotes')
    .addForeignKeyConstraint(
      'company_review_upvotes_student_id_fkey',
      ['student_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('referrals')
    .addForeignKeyConstraint(
      'referrals_referrer_id_fkey',
      ['referrer_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('resources')
    .addForeignKeyConstraint(
      'resources_posted_by_fkey',
      ['posted_by'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('resource_upvotes')
    .addForeignKeyConstraint(
      'resource_upvotes_student_id_fkey',
      ['student_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('resource_views')
    .addForeignKeyConstraint(
      'resource_views_student_id_fkey',
      ['student_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();

  await db.schema
    .alterTable('resume_book_submissions')
    .addForeignKeyConstraint(
      'resume_book_submissions_member_id_fkey',
      ['member_id'],
      'students',
      ['id']
    )
    .onDelete('cascade')
    .execute();
}

export async function down() {}
