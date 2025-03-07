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

  const memberId1 = id();
  const memberId2 = id();
  const memberId3 = id();

  const memberEmail1 = email;
  const memberEmail2 = 'savannah@james.com';
  const memberEmail3 = 'lebron@james.com';

  await trx
    .insertInto('studentEmails')
    .values([
      { email: memberEmail1 },
      { email: memberEmail2 },
      { email: memberEmail3 },
    ])
    .execute();

  await trx
    .insertInto('students')
    .values([
      {
        acceptedAt: new Date(),
        currentLocation: 'New York, NY',
        currentLocationCoordinates: sql`point(-73.935242, 40.73061)`,
        educationLevel: 'undergraduate',
        email: memberEmail1,
        firstName: 'First',
        gender: '',
        graduationYear: new Date().getFullYear().toString(),
        id: memberId1,
        lastName: 'Last',
        major: 'computer_science',
        otherDemographics: [],
        race: [],
        schoolId: schoolId1,
      },
      {
        acceptedAt: new Date(),
        currentLocation: 'New York, NY',
        currentLocationCoordinates: sql`point(-73.935242, 40.73061)`,
        educationLevel: 'undergraduate',
        email: memberEmail2,
        firstName: 'LeBron',
        gender: '',
        graduationYear: new Date().getFullYear().toString(),
        id: memberId2,
        lastName: 'James',
        joinedMemberDirectoryAt: new Date(),
        major: 'computer_science',
        otherDemographics: [],
        race: [],
        schoolId: schoolId2,
      },
      {
        acceptedAt: new Date(),
        currentLocation: 'New York, NY',
        currentLocationCoordinates: sql`point(-73.935242, 40.73061)`,
        educationLevel: 'undergraduate',
        email: memberEmail3,
        firstName: 'Savannah',
        gender: '',
        graduationYear: new Date().getFullYear().toString(),
        id: memberId3,
        lastName: 'James',
        joinedMemberDirectoryAt: new Date(),
        major: 'computer_science',
        otherDemographics: [],
        race: [],
        schoolId: schoolId2,
      },
    ])
    .execute();

  await trx
    .updateTable('studentEmails')
    .set({ studentId: memberId1 })
    .where('email', '=', memberEmail1)
    .execute();

  await trx
    .updateTable('studentEmails')
    .set({ studentId: memberId2 })
    .where('email', '=', memberEmail2)
    .execute();

  await trx
    .updateTable('studentEmails')
    .set({ studentId: memberId3 })
    .where('email', '=', memberEmail3)
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

  // Companies

  const companyId1 = id();
  const companyId2 = id();
  const companyId3 = id();
  const companyId4 = id();
  const companyId5 = id();

  await trx
    .insertInto('companies')
    .values([
      {
        createdAt: new Date(),
        crunchbaseId: '172a34b4-9edd-b0ae-c768-cbfa8e1ab52c',
        description:
          'Adobe is a software company that provides its users with digital marketing and media solutions.',
        domain: 'adobe.com',
        id: companyId1,
        imageUrl:
          'https://images.crunchbase.com/image/upload/t_cb-default-original/qnbpcajqvlw8bkul1tru',
        leetcodeSlug: 'adobe',
        levelsFyiSlug: 'adobe',
        name: 'Adobe',
        stockSymbol: 'NASDAQ:ADBE',
      },
      {
        createdAt: new Date(),
        crunchbaseId: '05554f65-6aa9-4dd1-6271-8ce2d60f10c4',
        description:
          'Amazon is an e-commerce website for consumers, sellers, and content creators.',
        domain: 'amazon.com',
        id: companyId2,
        imageUrl:
          'https://images.crunchbase.com/image/upload/t_cb-default-original/mwsza2s38epb8olssp3j',
        leetcodeSlug: 'amazon',
        levelsFyiSlug: 'amazon',
        name: 'Amazon',
        stockSymbol: 'NASDAQ:AMZN',
      },
      {
        createdAt: new Date(),
        crunchbaseId: '6acfa7da-1dbd-936e-d985-cf07a1b27711',
        description:
          'Google is a multinational corporation that specializes in Internet-related services and products.',
        domain: 'google.com',
        id: companyId3,
        imageUrl:
          'https://images.crunchbase.com/image/upload/t_cb-default-original/fa8nmvofinznny6rkwvf',
        leetcodeSlug: 'google',
        levelsFyiSlug: 'google',
        name: 'Google',
        stockSymbol: 'NASDAQ:GOOG',
      },
      {
        createdAt: new Date(),
        crunchbaseId: 'df662812-7f97-0b43-9d3e-12f64f504fbb',
        description:
          'Meta is a social technology company that enables people to connect, find communities, and grow businesses.',
        domain: 'meta.com',
        id: companyId4,
        imageUrl:
          'https://images.crunchbase.com/image/upload/t_cb-default-original/whm4ed1rrc8skbdi3biv',
        leetcodeSlug: 'facebook',
        levelsFyiSlug: 'facebook',
        name: 'Meta',
        stockSymbol: 'NASDAQ:META',
      },
      {
        createdAt: new Date(),
        crunchbaseId: 'fd80725f-53fc-7009-9878-aeecf1e9ffbb',
        description:
          'Microsoft is a software corporation that develops, manufactures, licenses, supports, and sells a range of software products and services.',
        domain: 'microsoft.com',
        id: companyId5,
        imageUrl:
          'https://images.crunchbase.com/image/upload/t_cb-default-original/v1501613147',
        leetcodeSlug: 'microsoft',
        levelsFyiSlug: 'microsoft',
        name: 'Microsoft',
        stockSymbol: 'NASDAQ:MSFT',
      },
    ])
    .execute();

  // Opportunities

  const opportunityId1 = id();
  const opportunityId2 = id();
  const opportunityId3 = id();
  const opportunityId4 = id();
  const opportunityId5 = id();

  await trx
    .insertInto('opportunities')
    .values([
      {
        companyId: companyId1,
        createdAt: new Date(),
        description: `Join Adobe Experience Cloud as a web front-end engineer on a mobile experience team. Develop UI components using JavaScript, TypeScript, and React. Collaborate with engineers, product managers, and designers. Requires 1-3 years of experience. Salary range: $93,200 - $170,600 annually, varies by location.`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        id: opportunityId1,
        lastExpirationCheck: undefined,
        link: 'https://careers.adobe.com/us/en/job/R152882/Software-Development-Engineer-Front-end',
        postedBy: memberId1,
        refinedAt: new Date(),
        slackChannelId: undefined,
        slackMessageId: undefined,
        title: 'Software Development Engineer, Frontend',
      },
      {
        companyId: companyId2,
        createdAt: new Date(),
        description: `12-week summer internship at Amazon Web Services (AWS) for students pursuing a Bachelor's or Master's in Engineering. Work on data center design, troubleshooting, and support operational issues. Gain experience in power systems, HVAC, and innovative solutions for AWS data centers.`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        id: opportunityId2,
        lastExpirationCheck: undefined,
        link: 'https://amazon.jobs/en/jobs/2847022/data-center-infrastructure-engineer-intern',
        postedBy: memberId2,
        refinedAt: new Date(),
        slackChannelId: undefined,
        slackMessageId: undefined,
        title: 'Data Center Infrastructure Engineer Intern',
      },
      {
        companyId: companyId3,
        createdAt: new Date(),
        description: `Google seeks a UX Designer for their Searchbox and Suggest team. The role involves creating intuitive user experiences, from concept to execution, for consumer-facing digital products. Candidates should have a Bachelor's degree in Design or related field, 1 year of UX design experience, and proficiency in design tools.`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        id: opportunityId3,
        lastExpirationCheck: undefined,
        link: 'https://www.google.com/about/careers/applications/jobs/results/109175665332232902-user-experience-designer-early-career-search',
        postedBy: memberId3,
        refinedAt: new Date(),
        slackChannelId: undefined,
        slackMessageId: undefined,
        title: 'User Experience Designer, Early Career, Search',
      },
      {
        companyId: companyId4,
        createdAt: new Date(),
        description: `Shape the future of Meta's products by applying technical skills and analytical mindset to one of the world's richest data sets. Collaborate with cross-functional teams, influence product strategy, and solve product development challenges. Opportunity for recent graduates with experience in data analysis and programming.`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        id: opportunityId4,
        lastExpirationCheck: undefined,
        link: 'https://www.metacareers.com/jobs/1132866414844525/',
        postedBy: memberId1,
        refinedAt: new Date(),
        slackChannelId: undefined,
        slackMessageId: undefined,
        title: 'Data Scientist, Product Analytics',
      },
      {
        companyId: companyId5,
        createdAt: new Date(),
        description: `Microsoft offers 55 scholarships totaling $150,000 for Black and African American high school seniors planning to pursue technology-related degrees. Awards range from $2,500 to $5,000, with some renewable. Applicants must demonstrate leadership, financial need, and a passion for technology.`,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        id: opportunityId5,
        lastExpirationCheck: undefined,
        link: 'https://www.microsoft.com/en-us/diversity/programs/bam-scholarship?oneroute=true',
        postedBy: memberId2,
        refinedAt: new Date(),
        slackChannelId: undefined,
        slackMessageId: undefined,
        title: 'Black at Microsoft (BAM) Scholarships',
      },
    ])
    .execute();

  const aiTagId = id();
  const earlyCareerTagId = id();
  const hardwareTagId = id();
  const internshipTagId = id();
  const pmTagId = id();
  const quantTagId = id();
  const scholarshipTagId = id();
  const sweTagId = id();
  const uxTagId = id();

  await trx
    .insertInto('opportunityTags')
    .values([
      { color: 'amber-100', id: aiTagId, name: 'AI/ML' },
      { color: 'purple-100', id: earlyCareerTagId, name: 'Early Career' },
      { color: 'orange-100', id: hardwareTagId, name: 'Hardware' },
      { color: 'blue-100', id: internshipTagId, name: 'Internship' },
      { color: 'red-100', id: pmTagId, name: 'PM' },
      { color: 'cyan-100', id: quantTagId, name: 'Quantitative' },
      { color: 'amber-100', id: scholarshipTagId, name: 'Scholarship' },
      { color: 'lime-100', id: sweTagId, name: 'SWE' },
      { color: 'orange-100', id: uxTagId, name: 'UI/UX Design' },
    ])
    .execute();

  await trx
    .insertInto('opportunityTagAssociations')
    .values([
      { opportunityId: opportunityId1, tagId: earlyCareerTagId },
      { opportunityId: opportunityId1, tagId: sweTagId },
      { opportunityId: opportunityId2, tagId: internshipTagId },
      { opportunityId: opportunityId2, tagId: hardwareTagId },
      { opportunityId: opportunityId3, tagId: earlyCareerTagId },
      { opportunityId: opportunityId3, tagId: uxTagId },
      { opportunityId: opportunityId4, tagId: aiTagId },
      { opportunityId: opportunityId4, tagId: earlyCareerTagId },
      { opportunityId: opportunityId5, tagId: scholarshipTagId },
    ])
    .execute();

  // Resources

  const resourceId1 = id();
  const resourceId2 = id();
  const resourceId3 = id();

  await trx
    .insertInto('resources')
    .values([
      {
        description: `Here's a curated list of tagged LeetCode questions, all for free without the need for LeetCode Premium.`,
        id: resourceId1,
        link: 'https://github.com/krishnadey30/LeetCode-Questions-CompanyWise',
        postedAt: new Date(),
        postedBy: memberId1,
        title: 'Tagged Leetcode Questions',
        type: 'url',
      },
      {
        description: `A session from our May '23 Fam Friday: Do You, held on 5/26/23. Hosted by Bloomberg.`,
        id: resourceId2,
        link: 'https://www.youtube.com/watch?v=mz2xcQ6KjF0',
        postedAt: new Date(),
        postedBy: memberId2,
        title: 'How to Succeed in Your Internship',
        type: 'url',
      },
      {
        description: `CodeSignal's course paths offer structured learning in coding, covering topics like data structures, algorithms, and web development for all skill levels.`,
        id: resourceId3,
        link: 'https://codesignal.com/learn',
        postedAt: new Date(),
        postedBy: memberId3,
        title: 'CodeSignal Learn',
        type: 'url',
      },
    ])
    .execute();

  const academicTagId = id();
  const careerAdviceTagId = id();
  const interviewPrepTagId = id();
  const learningTagId = id();
  const videoTagId = id();

  await trx
    .insertInto('tags')
    .values([
      { id: academicTagId, name: 'Academic' },
      { id: careerAdviceTagId, name: 'Career Advice' },
      { id: interviewPrepTagId, name: 'Interview Prep' },
      { id: learningTagId, name: 'Learning' },
      { id: videoTagId, name: 'Video' },
    ])
    .execute();

  await trx
    .insertInto('resourceTags')
    .values([
      { resourceId: resourceId1, tagId: interviewPrepTagId },
      { resourceId: resourceId1, tagId: learningTagId },
      { resourceId: resourceId2, tagId: careerAdviceTagId },
      { resourceId: resourceId2, tagId: videoTagId },
      { resourceId: resourceId3, tagId: academicTagId },
      { resourceId: resourceId3, tagId: learningTagId },
    ])
    .execute();

  await trx
    .insertInto('resourceUpvotes')
    .values([
      { resourceId: resourceId1, studentId: memberId1 },
      { resourceId: resourceId1, studentId: memberId2 },
      { resourceId: resourceId1, studentId: memberId3 },
      { resourceId: resourceId2, studentId: memberId1 },
      { resourceId: resourceId2, studentId: memberId3 },
      { resourceId: resourceId3, studentId: memberId2 },
    ])
    .execute();

  // Slack Channels

  const slackChannelId1 = id();
  const slackChannelId2 = id();
  const slackChannelId3 = id();

  await trx
    .insertInto('slackChannels')
    .values([
      { id: slackChannelId1, name: 'announcements', type: 'public' },
      { id: slackChannelId2, name: 'general', type: 'public' },
      { id: slackChannelId3, name: 'random', type: 'public' },
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
