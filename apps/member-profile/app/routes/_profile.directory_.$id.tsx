import { json, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import dayjs from 'dayjs';
import React, { PropsWithChildren } from 'react';
import { BookOpen, Calendar, Globe, Home, Link, MapPin } from 'react-feather';

import { cx, getButtonCn, ProfilePicture, Text, TextProps } from '@oyster/ui';

import { Card } from '../shared/components/card';
import { EducationExperienceItem } from '../shared/components/education-experience';
import { ExperienceList } from '../shared/components/profile';
import { ENV } from '../shared/constants.server';
import {
  countMessagesSent,
  getActiveStreak,
  getEventsAttendedCount,
  getIcebreakerResponses,
  getTotalPoints,
  job,
  listWorkExperiences,
} from '../shared/core.server';
import { WorkExperienceItem } from '../shared/core.ui';
import {
  getEducationExperiences,
  getMember,
  getMemberEthnicities,
} from '../shared/queries';
import { ensureUserAuthenticated, user } from '../shared/session.server';
import { formatHeadline, formatName } from '../shared/utils/format.utils';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = params.id as string;

  const [
    activeStreak,
    educationExperiences,
    eventsAttendedCount,
    icebreakerResponses,
    _member,
    _ethnicities,
    messagesSentCount,
    points,
    workExperiences,
  ] = await Promise.all([
    getActiveStreak(memberId),
    getEducationExperiences(memberId),
    getEventsAttendedCount(memberId),
    getIcebreakerResponses(memberId, [
      'icebreakerResponses.promptId',
      'icebreakerResponses.text',
    ]),
    getMember(memberId, { school: true })
      .select([
        'students.acceptedAt',
        'students.calendlyUrl',
        'students.currentLocation',
        'students.firstName',
        'students.genderPronouns',
        'students.githubUrl',
        'students.graduationYear',
        'students.headline',
        'students.hometown',
        'students.id',
        'students.instagramHandle',
        'students.lastName',
        'students.linkedInUrl',
        'students.number',
        'students.personalWebsiteUrl',
        'students.preferredName',
        'students.profilePicture',
        'students.slackId',
        'students.twitterHandle',
      ])
      .executeTakeFirstOrThrow(),
    getMemberEthnicities(memberId),
    countMessagesSent(memberId),
    getTotalPoints(memberId),
    listWorkExperiences(memberId),
  ]);

  const member = {
    ..._member,
    ...(!!_member.slackId && {
      slackUrl: `slack://user?team=${ENV.SLACK_TEAM_ID}&id=${_member.slackId}`,
    }),
    acceptedAt: dayjs(_member.acceptedAt).format('MMMM YYYY'),
    graduated: parseInt(_member.graduationYear) <= dayjs().year(),
    headline: formatHeadline({
      graduationYear: _member.graduationYear,
      headline: _member.headline,
      school: _member.school,
    }),
  };

  const ethnicities = _ethnicities
    .map((country) => `${country.flagEmoji} ${country.demonym}`)
    .join(', ');

  job('student.profile.viewed', {
    profileViewedId: memberId,
    viewerId: user(session),
  });

  return json({
    activeStreak,
    educationExperiences,
    ethnicities,
    eventsAttendedCount,
    icebreakerResponses,
    member,
    messagesSentCount,
    points,
    workExperiences,
  });
}

export default function MemberPage() {
  const { educationExperiences, icebreakerResponses, member, workExperiences } =
    useLoaderData<typeof loader>();

  const navigate = useNavigate();

  return (
    <>
      <CoreSection>
        <MemberHeader />
        <MemberName />
        {!!member.linkedInUrl && <MemberSocials />}
        <MemberOverview />
        <MemberStatistics />
        {!!icebreakerResponses.length && <MemberIcebreakerResponses />}
      </CoreSection>

      {!!workExperiences.length && (
        <CoreSection>
          <Text variant="xl">Work Experiences</Text>
          <ExperienceList>
            {workExperiences.map((experience) => {
              return (
                <WorkExperienceItem
                  key={experience.id}
                  experience={experience}
                />
              );
            })}
          </ExperienceList>
        </CoreSection>
      )}

      {!!educationExperiences.length && (
        <CoreSection>
          <Text variant="xl">Education</Text>
          <ExperienceList>
            {educationExperiences.map((experience) => {
              return (
                <EducationExperienceItem
                  key={experience.id}
                  education={experience}
                />
              );
            })}
          </ExperienceList>
        </CoreSection>
      )}
    </>
  );
}

function CoreSection({ children }: PropsWithChildren) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-gray-200 p-4">
      {children}
    </section>
  );
}

function MemberHeader() {
  const { member } = useLoaderData<typeof loader>();

  return (
    <header className="flex items-center justify-between gap-[inherit]">
      <ProfilePicture
        initials={member.firstName[0] + member.lastName[0]}
        src={member.profilePicture || undefined}
        size="96"
      />

      {!!member.slackUrl && (
        <a
          // TODO: Move this button style to `ui`.
          className={cx(
            getButtonCn({ size: 'small', variant: 'secondary' }),
            'border-gray-300 text-black hover:bg-gray-100 active:bg-gray-200'
          )}
          href={member.slackUrl}
        >
          <img alt="Slack Logo" className="h-5 w-5" src="/images/slack.svg" />{' '}
          DM on Slack
        </a>
      )}
    </header>
  );
}

function MemberName() {
  const { member } = useLoaderData<typeof loader>();

  const name = formatName({
    firstName: member.firstName,
    lastName: member.lastName,
    preferredName: member.preferredName,
  });

  return (
    <section className="flex flex-col gap-1 sm:gap-0">
      <div className="flex items-center gap-2">
        <Text variant="2xl">{name}</Text>
        <MemberPronouns className="mt-1 hidden sm:flex" />
      </div>

      <MemberPronouns className="flex sm:hidden" />
      <Text color="gray-500">{member.headline}</Text>
    </section>
  );
}

function MemberPronouns({ className }: { className: string }) {
  const { member } = useLoaderData<typeof loader>();

  const props: TextProps = {
    color: 'gray-500',
    variant: 'sm',
  };

  return (
    <div className={cx('items-center gap-1', className)}>
      {member.genderPronouns && (
        <>
          <Text {...props}>{member.genderPronouns}</Text>
          <Text {...props}>&bull;</Text>
        </>
      )}

      <Text {...props}>#{member.number}</Text>
    </div>
  );
}

function MemberSocials() {
  const { member } = useLoaderData<typeof loader>();

  const className = 'h-5 w-5';

  return (
    <section>
      <ul className="mb-1 flex items-center gap-2">
        {!!member.linkedInUrl && (
          <li>
            <a href={member.linkedInUrl} target="_blank">
              <img
                alt="LinkedIn Logo"
                className={className}
                src="/images/linkedin.png"
              />
            </a>
          </li>
        )}

        {!!member.instagramHandle && (
          <li>
            <a
              // The Instagram URL cannot have the @ symbol in it, so we remove it.
              href={`https://instagram.com/${member.instagramHandle.replace(
                '@',
                ''
              )}`}
              target="_blank"
            >
              <img
                alt="Instagram Logo"
                className={className}
                src="/images/instagram.svg"
              />
            </a>
          </li>
        )}

        {!!member.twitterHandle && (
          <li>
            <a
              href={`https://twitter.com/${member.twitterHandle}`}
              target="_blank"
            >
              <img
                alt="Twitter Logo"
                className={className}
                src="/images/x.png"
              />
            </a>
          </li>
        )}

        {!!member.githubUrl && (
          <li>
            <a href={member.githubUrl} target="_blank">
              <img
                alt="GitHub Logo"
                className={className}
                src="/images/github.svg"
              />
            </a>
          </li>
        )}

        {!!member.calendlyUrl && (
          <li>
            <a href={member.calendlyUrl} target="_blank">
              <img
                alt="Calendly Logo"
                className={className}
                src="/images/calendly.svg"
              />
            </a>
          </li>
        )}

        {!!member.personalWebsiteUrl && (
          <li>
            <a href={member.personalWebsiteUrl} target="_blank">
              <Link className={className} />
            </a>
          </li>
        )}
      </ul>
    </section>
  );
}

function MemberOverview() {
  const { ethnicities, member } = useLoaderData<typeof loader>();

  return (
    <section>
      <ul className="flex flex-col flex-wrap gap-2">
        <OverviewItem
          icon={<Calendar />}
          label="Joined"
          value={member.acceptedAt}
        />
        <OverviewItem
          icon={<BookOpen />}
          label={member.graduated ? 'Studied at' : 'Studies at'}
          value={member.school!}
        />
        <OverviewItem icon={<MapPin />} label="From" value={member.hometown} />
        <OverviewItem
          icon={<Home />}
          label="Lives in"
          value={member.currentLocation}
        />
        <OverviewItem icon={<Globe />} label="Ethnically" value={ethnicities} />
      </ul>
    </section>
  );
}

type OverviewItemProps = {
  icon: React.ReactElement;
  label: string;
  value: string | null;
};

function OverviewItem({ icon, label, value }: OverviewItemProps) {
  if (!value) {
    return null;
  }

  icon = React.cloneElement(icon, {
    className: 'text-gray-500',
    size: '1.25rem',
  });

  return (
    <li className="mr-2 flex items-center gap-1">
      {icon}
      <Text color="gray-500" variant="sm">
        {label} <span className="font-semibold">{value}</span>
      </Text>
    </li>
  );
}

function MemberStatistics() {
  const { activeStreak, eventsAttendedCount, messagesSentCount, points } =
    useLoaderData<typeof loader>();

  return (
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <StatisticItem label="All-Time Points" value={points} />
      <StatisticItem
        label="Active Streak"
        value={
          <>
            {activeStreak} <span className="text-base">Weeks</span>
          </>
        }
      />
      <StatisticItem
        label="Messages Sent"
        value={messagesSentCount.toLocaleString('en-US')}
      />
      <StatisticItem label="Events Attended" value={eventsAttendedCount} />
    </section>
  );
}

function StatisticItem({
  label,
  value,
}: {
  label: string;
  value: string | number | React.ReactElement;
}) {
  return (
    <Card>
      <Card.Title>{label}</Card.Title>
      <Text variant="4xl">{value}</Text>
    </Card>
  );
}

function MemberIcebreakerResponses() {
  const { icebreakerResponses } = useLoaderData<typeof loader>();

  return (
    <section>
      <ul className="flex flex-col gap-2">
        {icebreakerResponses.map((response) => {
          return (
            <li
              className="rounded-xl border border-gray-200 p-4"
              key={response.promptId}
            >
              <div className="mb-1">
                <Text color="gray-500">{response.prompt}</Text>
              </div>

              <Text className="whitespace-pre-wrap" variant="lg">
                {response.text}
              </Text>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
