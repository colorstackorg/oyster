import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { emojify } from 'node-emoji';

import { listSlackMessages } from '@oyster/core/slack/server';

import { getDateRange, Recap } from '@/routes/_profile.recap.$date';
import { SlackMessageCard } from '@/shared/components/slack-message';
import { ENV } from '@/shared/constants.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { endOfWeek, startOfWeek } = getDateRange(params.date);

  const messages = await listSlackMessages({
    include: { poster: true },
    pagination: { page: 1, limit: 10 },
    where: {
      channelId: ENV.SLACK_ANNOUNCEMENTS_CHANNEL_ID,
      threadId: null,
      sentAfter: startOfWeek,
      sentBefore: endOfWeek,
    },
  });

  const announcements = messages.map(({ createdAt, text, ...message }) => {
    return {
      ...message,
      postedAt: dayjs().to(createdAt),
      text: emojify(text || '', { fallback: '' }),
    };
  });

  return {
    announcements,
  };
}

export default function RecapAnnouncements() {
  const { announcements } = useLoaderData<typeof loader>();

  return (
    <Recap>
      <Recap.Header>
        <Recap.Title>Announcements 📣 ({announcements.length})</Recap.Title>
        <Recap.Description>
          Announcements from the ColorStack team this week in Slack.
        </Recap.Description>
      </Recap.Header>

      <ul className="flex flex-col gap-4">
        {announcements.map((announcement) => {
          return (
            <SlackMessageCard
              key={announcement.id}
              channelId={announcement.channelId}
              messageId={announcement.id}
              postedAt={announcement.postedAt}
              posterFirstName={announcement.posterFirstName || ''}
              posterLastName={announcement.posterLastName || ''}
              posterProfilePicture={announcement.posterProfilePicture || ''}
              text={announcement.text || ''}
            />
          );
        })}
      </ul>
    </Recap>
  );
}
