import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';

import { listSlackMessages } from '@/modules/slack/index.server';
import { getDateRange, RecapPage } from '@/routes/_profile.weekly-recap.$date';
import { SlackMessage } from '@/shared/components/slack-message';
import { ensureUserAuthenticated } from '@/shared/session.server';

const fakeAnnouncementMessages: {
  id: string;
  channelId: string;
  createdAt: Date;
  posterFirstName: string;
  posterLastName: string;
  posterProfilePicture: string;
  text: string | null;
}[] = [
  {
    id: '1',
    channelId: 'C06PXL47X5L',
    createdAt: new Date(),
    posterFirstName: 'Jehron',
    posterLastName: 'Bryant',
    posterProfilePicture:
      'https://avatars.slack-edge.com/2023-12-30/6408102035074_92a4a5448d92d1b4acb4_512.jpg',
    text: `<!channel> Hey fam.

As promised, I wanted to address yesterday’s events regarding ColorStack and the termination of a now former employee.

Yesterday, we had to make the difficult decision to part ways with one of our team members. I believe in handling these matters confidentially, but unfortunately, they chose to share details of a private conversation, including an audio recording, on LinkedIn.

I want to reassure you that while this situation is unfortunate, it does not reflect any change in our team’s focus. Every decision that I’ve made up until this point has been with you all in mind, to build the team that will help us fulfill our mission effectively. We remain fully dedicated to this.

We are addressing this matter internally, but rest assured there will be no disruptions to any of our programs and upcoming events. We have a coverage plan in place to continue to attract and retain corporate partners that want to hire you all until we backfill the role.

Building a company is hard. There is always a lesson to be learned or an area for growth. This will only make us better as an organization moving forward.

Thank you for your understanding and continued trust in ColorStack.

-Jehron`,
  },
  {
    id: '2',
    channelId: 'C06PXL47X5L',
    createdAt: new Date(),
    posterFirstName: 'Jehron',
    posterLastName: 'Bryant',
    posterProfilePicture:
      'https://avatars.slack-edge.com/2023-12-30/6408102035074_92a4a5448d92d1b4acb4_512.jpg',
    text: ` <!channel> Hey Y'all! Happy Friday!! Keeping this one short and sweet!

*Father's Day Celebration!* :green_heart: :fist::skin-tone-4:
:sparkles: With Dad's Day this Sunday, we wondered if we have any Dads in our ColorStack Family?!
We want to celebrate you!
:arrow_right: *<https://docs.google.com/forms/d/e/1FAIpQLSc4kcMfg2YWhkC701iJQpEWBzeVHiTkfGNqJTEkhufhEnKncw/viewform|Fill out this short form >*to share how ColorStack has impacted your journey as a student/young professional and a father!

*Member Profile New Releases!* :colorstack_logo:
:sparkles: If you are wondering if other ColorStack'ers work at or have had a good experience with a company you're interested in, check out our:
:arrow_right: <https://app.colorstack.io/companies|Companies Feature>

:sparkles: Don't forget about our <https://app.colorstack.io/resources|Resource Database>! There is so much useful information, tools, and resources to guide and support you on your journeys in ColorStack, at your workplaces, during your job search, or in your classroom endeavors!
:arrow_right: <https://app.colorstack.io/resources|Resource Database>

*QOTD: Where do you dream of living after graduating college?*- <@U0730BL4HQE>
Itching to ask the ColorStack Community something? <https://forms.gle/mVFZoWo2XW8z39HYA|Submit a QOTD here>`,
  },
  {
    id: '3',
    channelId: 'C06PXL47X5L',
    createdAt: new Date(),
    posterFirstName: 'Jehron',
    posterLastName: 'Bryant',
    posterProfilePicture:
      'https://avatars.slack-edge.com/2023-12-30/6408102035074_92a4a5448d92d1b4acb4_512.jpg',
    text: `<!channel> Happy Fridayyy!! Happy first end of week to those who started your internships or full-time roles this week! :party_blob: :party_blob:
This is a long one, but lots of *GOOD* info below!

*Alumni Channels Launch!*
:sparkles: Y'all have asked and asked....they are finally HERE! Alumni channels have launched and are ready for you to join! These channels are v1 of a MUCH larger alumni strategy still in the works. However, to give our alumni members places to chat, connect, and support one another in transitions- we are releasing channels today!

<#C06PXL47X5L|alumni-announcements> <#C07750LMRSN|alumni-coding-help>, <#C0774SBJPQB|alumni-finance>, <#C07750JGHM0|alumni-housing>, <#C076YBA33SA|alumni-office-culture>, <#C06QGUH5GP3|alumni-questions>, <#C06QGUE6TJM|alumni-random> are ready for you to join and share!

Currently, these channels are public and not restricted to only alumni. However, let's respect their purpose and give our alumni these spaces for connection and growth.

*Why Alumni Channels?- Doesn't this divide the community?*
:heavy_check_mark: Yes, it does. But this division is strategic. As ColorStack members transition into full-time opportunities, staying active in the community has become challenging. We have former members doing incredible things in the industry and their lives, and we're missing out.
:handshake::skin-tone-4: _The alumni channels are designed to bridge this gap and keep us connected._

:sparkles: We want to create a world WITHIN the ColorStack community, where our alums can be active, engaged, and plugged into one another without the noise and disruption of our larger Slack community.

Remember, this is just the beginning. Launching these channels is the first phase of a much larger alumni strategy. In the future, we plan to provide opportunities for alumni to give back to the community and be valuable resources.
:party_blob: _Stay tuned; exciting things are on the horizon!_

*Opportunities!!* :moneybag: :moneybag:
Several opportunities & events from our partners were shared in our channels this week! SO many ColorStack members have gotten their roles or flown to all-expense paid events because of opportunities they've learned about in this community just like these. Don't miss your chance!!

• Apply, and be sure to let them know ColorStack sent you!! :saluting_face:
1. <https://colorstack-family.slack.com/archives/C011H0EFU14/p1717689602203669|Bill 2025 Opportunities>
2. <https://colorstack-family.slack.com/archives/C011H0EFU14/p1717624800382459|Salesforce Tech Equality Summit>  :rotating_light: Deadline *TODAY*
3. <https://colorstack-family.slack.com/archives/C011H0EFU14/p1717614000393319|Jane Street>  :rotating_light: Deadline *TODAY*
*QOTD: What is the best 2 snack combo out there? <@U074DVD3QUR>*
Itching to ask the ColorStack Community something? <https://forms.gle/mVFZoWo2XW8z39HYA|Submit a QOTD here>`,
  },
];

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { endOfWeek, startOfWeek } = getDateRange(params.date);

  const _announcements = await listSlackMessages({
    includePoster: true,
    includeReactions: true,
    pagination: {
      page: 1,
      limit: 10,
    },
    select: [
      'messages.channelId',
      'messages.createdAt',
      'messages.id',
      'messages.text',
    ],
    where: {
      channelId: '', // Announcements Channel ID
      sentAfter: startOfWeek,
      sentBefore: endOfWeek,
    },
  });

  const announcements = (fakeAnnouncementMessages || _announcements).map(
    ({ createdAt, ...announcement }) => {
      return {
        ...announcement,
        postedAt: dayjs().to(createdAt),
      };
    }
  );

  return json({
    announcements,
  });
}

export default function AnnouncementsInWeek() {
  const { announcements } = useLoaderData<typeof loader>();

  return (
    <RecapPage
      description="Announcements from the ColorStack team this week in #announcements."
      title={`Announcements 📣 (${announcements.length})`}
    >
      <ul className="flex flex-col gap-4">
        {announcements.map((announcement) => {
          return (
            <SlackMessage
              key={announcement.id}
              channelId={announcement.channelId}
              messageId={announcement.id}
              postedAt={announcement.postedAt}
              posterFirstName={announcement.posterFirstName}
              posterLastName={announcement.posterLastName}
              posterProfilePicture={announcement.posterProfilePicture}
            >
              {announcement.text}
            </SlackMessage>
          );
        })}
      </ul>
    </RecapPage>
  );
}
