import { sql, type Transaction } from 'kysely';
import readline from 'readline';
import { z } from 'zod';

import { db } from '../shared/db';
import { IS_PRODUCTION } from '../shared/env';
import { type DB } from '../shared/types';
import { migrate } from '../use-cases/migrate';
import { truncate } from '../use-cases/truncate';

if (IS_PRODUCTION) {
  throw new Error('Cannot seed database in non-development environment.');
}

async function main() {
  try {
    await setEmailFromCommandLine();
    console.log('(1/4) Email looks good. ✅');

    await migrate({ db });
    console.log('(2/4) Ran migrations and initialized tables. ✅');

    await db.transaction().execute(async (trx) => {
      await truncate(trx);
      await seed(trx);
    });

    console.log('(3/4) Wiped all data. ✅');
    console.log('(4/4) Seeded the database. ✅');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

let email = '';

async function seed(trx: Transaction<DB>) {
  const schoolId1 = id();
  const schoolId2 = id();
  const schoolId3 = id();

  await trx
    .insertInto('schools')
    .values([
      {
        addressCity: 'Pittsburgh',
        addressState: 'PA',
        addressZip: '15213',
        id: schoolId1,
        name: 'Carnegie Mellon University',
      },
      {
        addressCity: 'Ithaca',
        addressState: 'NY',
        addressZip: '14850',
        id: schoolId2,
        name: 'Cornell University',
      },
      {
        addressCity: 'Austin',
        addressState: 'TX',
        addressZip: '78712',
        id: schoolId3,
        name: 'University of Texas at Austin',
      },
      {
        addressCity: 'Washington',
        addressState: 'D.C.',
        addressZip: '20059',
        id: id(),
        name: 'Howard University',
      },
      {
        addressCity: 'Kennesaw',
        addressState: 'GA',
        addressZip: '30144',
        id: id(),
        name: 'Kennesaw State University',
      },
      {
        addressCity: 'Berkeley',
        addressState: 'CA',
        addressZip: '94720',
        id: id(),
        name: 'University of California, Berkeley',
      },
    ])
    .execute();

  await trx
    .insertInto('admins')
    .values([
      {
        email,
        id: id(),
        firstName: 'First',
        lastName: 'Last',
        role: 'owner',
      },
    ])
    .execute();

  await trx.insertInto('studentEmails').values([{ email }]).execute();

  const memberId = id();

  await trx
    .insertInto('students')
    .values([
      {
        acceptedAt: new Date(),
        currentLocation: 'New York, NY',
        currentLocationCoordinates: sql`point(-73.935242, 40.73061)`,
        educationLevel: 'undergraduate',
        email,
        firstName: 'First',
        gender: '',
        graduationYear: new Date().getFullYear().toString(),
        id: memberId,
        lastName: 'Last',
        major: 'computer_science',
        otherDemographics: [],
        race: [],
        schoolId: schoolId1,
      },
    ])
    .execute();

  await trx
    .updateTable('studentEmails')
    .set({ studentId: memberId })
    .where('email', '=', email)
    .execute();

  await trx
    .insertInto('applications')
    .values([
      {
        id: id(),
        email: 'student1@cornell.edu',
        contribution: 'Working on Oyster!',
        educationLevel: 'undergraduate',
        gender: '',
        goals: '',
        graduationYear: 2026,
        firstName: 'Big',
        lastName: 'Red',
        linkedInUrl: 'https://www.linkedin.com/',
        major: 'computer_science',
        otherDemographics: [],
        race: [],
        schoolId: schoolId2,
        status: 'pending',
      },
      {
        id: id(),
        email: 'student2@utexas.edu',
        contribution: 'Working on Oyster!',
        educationLevel: 'Bootcamp',
        gender: '',
        goals: '',
        graduationYear: 2024,
        firstName: 'Bevo',
        lastName: 'Longhorn',
        linkedInUrl: 'https://www.linkedin.com/',
        major: 'information_science',
        otherDemographics: [''],
        race: [''],
        schoolId: schoolId3,
        status: 'pending',
      },
    ])
    .execute();

  // Create additional students from different schools
  const additionalStudentIds = await Promise.all([
    trx
      .insertInto('students')
      .values({
        acceptedAt: new Date(),
        currentLocation: 'Berkeley, CA',
        currentLocationCoordinates: sql`point(-122.272747, 37.871899)`,
        educationLevel: 'undergraduate',
        email: 'student3@berkeley.edu',
        firstName: 'Cal',
        gender: '',
        graduationYear: (new Date().getFullYear() + 1).toString(),
        id: id(),
        lastName: 'Bear',
        major: 'computer_science',
        otherDemographics: [],
        race: [],
        schoolId: schoolId3,
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
    trx
      .insertInto('students')
      .values({
        acceptedAt: new Date(),
        currentLocation: 'Ithaca, NY',
        currentLocationCoordinates: sql`point(-76.473183, 42.453098)`,
        educationLevel: 'graduate',
        email: 'student4@cornell.edu',
        firstName: 'Big',
        gender: '',
        graduationYear: (new Date().getFullYear() + 2).toString(),
        id: id(),
        lastName: 'Red',
        major: 'information_science',
        otherDemographics: [],
        race: [],
        schoolId: schoolId2,
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
  ]);

  // Create sample companies
  const companies = await Promise.all([
    trx
      .insertInto('companies')
      .values({
        id: id(),
        name: 'TechCorp',
        description: 'Leading technology solutions provider',
        domain: 'techcorp.example.com',
        crunchbaseId: 'techcorp',
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
    trx
      .insertInto('companies')
      .values({
        id: id(),
        name: 'StartupHub',
        description: 'Innovative startup accelerator',
        domain: 'startuphub.example.com',
        crunchbaseId: 'startuphub',
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
  ]);

  // Create resources
  await trx
    .insertInto('resources')
    .values([
      {
        id: id(),
        title: 'Interview Preparation Guide',
        description: 'Comprehensive guide for technical interviews',
        type: 'file',
        link: null,
        postedBy: memberId,
        postedAt: new Date(),
      },
      {
        id: id(),
        title: 'Resume Writing Tips',
        description: 'Best practices for crafting your tech resume',
        type: 'url',
        link: 'https://example.com/resume-tips',
        postedBy: additionalStudentIds[0].id,
        postedAt: new Date(),
      },
    ])
    .execute();

  // Create opportunities
  const opportunities = await Promise.all([
    trx
      .insertInto('opportunities')
      .values({
        id: id(),
        title: 'Software Engineering Internship',
        description:
          'Summer internship opportunity working on cloud infrastructure',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        postedBy: memberId,
        companyId: companies[0].id,
        slackChannelId: 'C123456',
        slackMessageId: 'M123456',
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
    trx
      .insertInto('opportunities')
      .values({
        id: id(),
        title: 'Full Stack Developer',
        description: 'Full-time position for recent graduates',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        postedBy: additionalStudentIds[1].id,
        companyId: companies[1].id,
        slackChannelId: 'C234567',
        slackMessageId: 'M234567',
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
  ]);

  // Create opportunity bookmarks
  await trx
    .insertInto('opportunityBookmarks')
    .values([
      {
        opportunityId: opportunities[0].id,
        studentId: additionalStudentIds[0].id,
      },
      {
        opportunityId: opportunities[1].id,
        studentId: memberId,
      },
    ])
    .execute();

  // Create work experiences
  const workExperiences = await Promise.all([
    trx
      .insertInto('workExperiences')
      .values({
        id: id(),
        companyId: companies[0].id,
        studentId: memberId,
        title: 'Software Engineering Intern',
        employmentType: 'internship',
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        locationType: 'remote',
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
    trx
      .insertInto('workExperiences')
      .values({
        id: id(),
        companyId: companies[1].id,
        studentId: additionalStudentIds[1].id,
        title: 'Full Stack Engineer',
        employmentType: 'full_time',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        locationType: 'hybrid',
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
  ]);

  // Create company reviews linked to work experiences
  await trx
    .insertInto('companyReviews')
    .values([
      {
        id: id(),
        workExperienceId: workExperiences[0].id,
        studentId: memberId,
        rating: 9,
        recommend: true,
        text: 'Great work culture and learning opportunities. The team is very supportive and there are plenty of chances to work on impactful projects. The mentorship program is excellent and the work-life balance is respected.',
        anonymous: false,
      },
      {
        id: id(),
        workExperienceId: workExperiences[1].id,
        studentId: additionalStudentIds[1].id,
        rating: 8,
        recommend: true,
        text: 'Exciting startup environment with lots of opportunities for growth. Fast-paced work environment with cutting-edge technologies. Good compensation and benefits. Sometimes work-life balance can be challenging but overall a great place to work and learn.',
        anonymous: true,
      },
    ])
    .execute();

  // Create completed activities for gamification
  await trx
    .insertInto('completedActivities')
    .values([
      {
        id: id(),
        studentId: memberId,
        type: 'post_resource',
        points: 10,
        createdAt: new Date(),
        occurredAt: new Date(),
        description: 'Posted a helpful interview preparation guide',
      },
      {
        id: id(),
        studentId: additionalStudentIds[0].id,
        type: 'review_company',
        points: 15,
        createdAt: new Date(),
        occurredAt: new Date(),
        description: 'Shared detailed company review',
      },
    ])
    .execute();
}

async function setEmailFromCommandLine() {
  const answer = await question(
    'In order to log into the Member Profile and Admin Dashboard, you will need both a member record and an admin record. Please provide an email so we can create those for you.\n' +
      'Email: '
  );

  const result = z
    .string()
    .trim()
    .min(1)
    .email()
    .transform((value) => {
      return value.toLowerCase();
    })
    .safeParse(answer);

  if (!result.success) {
    throw new Error('The email you provided was invalid.');
  }

  email = result.data;
}

async function question(prompt: string) {
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    cli.question(prompt, (input) => {
      resolve(input);
      cli.close();
    });
  });
}

let counter = 0;

function id() {
  counter++;

  return counter.toString();
}

main();
