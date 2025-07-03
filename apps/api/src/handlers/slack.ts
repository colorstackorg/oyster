import { type BunRequest } from 'bun';
import crypto from 'crypto';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { job } from '@oyster/core/bull';

import { BunResponse } from '../shared/bun-response';
import { ENV } from '../shared/env';

// Channel

type SlackChannelArchivedEvent = {
  channel: string;
  type: 'channel_archive';
};

type SlackChannelCreatedEvent = {
  channel: {
    created: number;
    id: string;
    name: string;
  };
  type: 'channel_created';
};

type SlackChannelDeletedEvent = {
  channel: string;
  type: 'channel_deleted';
};

type SlackChannelRenamedEvent = {
  channel: {
    id: string;
    name: string;
  };
  type: 'channel_rename';
};

type SlackChannelUnarchivedEvent = {
  channel: string;
  type: 'channel_unarchive';
};

// Emoji

type SlackEmojiChangedEvent = {
  type: 'emoji_changed';
  event_ts: string;
} & (
  | { subtype: 'add'; name: string; value: string }
  | { subtype: 'remove'; names: string[] }
  | { subtype: 'rename'; old_name: string; new_name: string; value: string }
);

// Message

type SlackMessageChangedEvent = {
  channel: string;
  message: {
    hidden?: boolean;
    text: string;
    ts: string;
  };
  subtype: 'message_changed';
  type: 'message';
};

type SlackMessageDeletedEvent = {
  channel: string;
  previous_message: {
    ts: string;
  };
  subtype: 'message_deleted';
  type: 'message';
};

/**
 * @see https://api.slack.com/events/message
 * @see https://api.slack.com/events/message/message_replied
 */
type SlackMessageSentEvent = {
  app_id?: string;
  bot_id?: string;
  channel: string;
  files?: unknown[];
  message?: {
    // Only present if the message is a reply.
    reply_count?: number;
  };
  subtype: undefined;
  text: string;
  thread_ts: string | undefined;
  ts: string;
  type: 'message';
  user: string;
};

// Reaction

type SlackReactionAddedEvent = {
  item: {
    channel: string;
    ts: string;
    type: 'file' | 'message' | 'file_comment';
  };
  reaction: string;
  type: 'reaction_added';
  user: string;
};

type SlackReactionRemovedEvent = {
  item: {
    channel: string;
    ts: string;
    type: 'file' | 'message' | 'file_comment';
  };
  reaction: string;
  type: 'reaction_removed';
  user: string;
};

// Team

type SlackTeamJoinEvent = {
  type: 'team_join';
  user: {
    id: string;
    profile: {
      email: string;
      real_name: string;
    };
  };
};

// User

type SlackUserProfileChangedEvent = {
  type: 'user_profile_changed';
  user: {
    id: string;
    profile: {
      is_custom_image: boolean;
      image_512: string;
    };
  };
};

// Body

type SlackRequestBody =
  | {
      challenge: string;
      token: string;
      type: 'url_verification';
    }
  | {
      event:
        | SlackChannelArchivedEvent
        | SlackChannelCreatedEvent
        | SlackChannelDeletedEvent
        | SlackChannelRenamedEvent
        | SlackChannelUnarchivedEvent
        | SlackEmojiChangedEvent
        | SlackMessageChangedEvent
        | SlackMessageDeletedEvent
        | SlackMessageSentEvent
        | SlackReactionAddedEvent
        | SlackReactionRemovedEvent
        | SlackTeamJoinEvent
        | SlackUserProfileChangedEvent;
      type: 'event_callback';
    };

// Headers

const SlackRequestHeaders = z.object({
  'x-slack-request-timestamp': z.coerce.number().positive(),
  'x-slack-signature': z.string().min(1),
});

type SlackRequestHeaders = z.infer<typeof SlackRequestHeaders>;

// Handlers

export async function handleSlackEvent(req: BunRequest) {
  const json = await req.json();
  const body = json as SlackRequestBody;

  const headersResult = SlackRequestHeaders.safeParse(req.headers);

  if (!headersResult.success) {
    return BunResponse.json(
      { message: 'Failed to verify Slack request headers.' },
      { status: 400 }
    );
  }

  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const verified = verifyRequest(buffer, headersResult.data);

  if (!verified) {
    return BunResponse.json(
      { message: 'Failed to verify Slack request.' },
      { status: 400 }
    );
  }

  if (body.type === 'url_verification') {
    return BunResponse.json({
      challenge: body.challenge,
    });
  }

  match(body.event)
    .with({ type: 'channel_archive' }, (event) => {
      job('slack.channel.archive', {
        id: event.channel,
      });
    })
    .with({ type: 'channel_created' }, (event) => {
      job('slack.channel.create', {
        createdAt: new Date(event.channel.created * 1000),
        id: event.channel.id,
        name: event.channel.name,
        type: 'public_channel',
      });
    })
    .with({ type: 'channel_deleted' }, (event) => {
      job('slack.channel.delete', {
        id: event.channel,
      });
    })
    .with({ type: 'channel_rename' }, (event) => {
      job('slack.channel.rename', {
        id: event.channel.id,
        name: event.channel.name,
      });
    })
    .with({ type: 'channel_unarchive' }, (event) => {
      job('slack.channel.unarchive', {
        id: event.channel,
      });
    })
    .with({ type: 'emoji_changed' }, (event) => {
      if (event.subtype !== 'add') {
        return;
      }

      job('slack.emoji.changed', {
        event_ts: event.event_ts,
        name: event.name,
        subtype: event.subtype,
        value: event.value,
      });
    })
    .with({ type: 'message', subtype: 'message_changed' }, (event) => {
      job('slack.message.change', {
        channelId: event.channel,
        deletedAt: event.message.hidden ? new Date() : undefined,
        id: event.message.ts,
        text: event.message.text,
      });
    })
    .with({ type: 'message', subtype: 'message_deleted' }, (event) => {
      job('slack.message.delete', {
        channelId: event.channel,
        id: event.previous_message.ts,
      });
    })
    .with({ type: 'message', channel_type: 'im' }, (event) => {
      // Ignore any message sent by a Slack app or bot.
      if (event.app_id || event.bot_id) {
        return;
      }

      // If the channel is not a direct message, ignore it.
      if (!event.channel.startsWith('D')) {
        return;
      }

      job('slack.chatbot.message', {
        channelId: event.channel!,
        id: event.ts!,
        text: event.text!,
        threadId: event.thread_ts,
        userId: event.user!,
      });
    })
    .with({ type: 'message' }, (event) => {
      job('slack.message.add', {
        channelId: event.channel!,
        createdAt: new Date(Number(event.ts) * 1000),
        hasFile: !!event.files && !!event.files.length,
        id: event.ts!,
        isBot: !!event.app_id || !!event.bot_id,
        replyCount: event.message?.reply_count,
        text: event.text!,
        threadId:
          event.ts && event.thread_ts && event.ts !== event.thread_ts
            ? event.thread_ts
            : undefined,
        userId: event.user!,
      });
    })
    .with({ type: 'reaction_added' }, (event) => {
      if (event.item.type !== 'message') {
        return;
      }

      job('slack.reaction.added', {
        channelId: event.item.channel,
        messageId: event.item.ts,
        reaction: event.reaction,
        userId: event.user,
      });
    })
    .with({ type: 'reaction_removed' }, (event) => {
      if (event.item.type !== 'message') {
        return;
      }

      job('slack.reaction.remove', {
        channelId: event.item.channel,
        messageId: event.item.ts,
        reaction: event.reaction,
        userId: event.user,
      });
    })
    .with({ type: 'team_join' }, (event) => {
      job('slack.joined', {
        email: event.user.profile.email,
        slackId: event.user.id,
      });
    })
    .with({ type: 'user_profile_changed' }, (event) => {
      if (event.user.profile.is_custom_image) {
        job('slack.profile_picture.changed', {
          profilePicture: event.user.profile.image_512,
          slackId: event.user.id,
        });
      }
    })
    .otherwise(() => {
      console.error('Unknown event type!', body.event);
    });

  return BunResponse.json({});
}

type SlackShortcutPayload = {
  callback_id: 'ask_colorstack_ai';
  channel: { id: string };
  message: { text: string; thread_ts?: string; ts: string };
  type: 'message_action';
  user: { id: string };
};

export async function handleSlackShortcut(req: BunRequest) {
  const headersResult = SlackRequestHeaders.safeParse(req.headers);

  if (!headersResult.success) {
    return BunResponse.json(
      { message: 'Failed to verify Slack request headers.' },
      { status: 400 }
    );
  }

  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const verified = verifyRequest(buffer, headersResult.data);

  if (!verified) {
    return BunResponse.json(
      { message: 'Failed to verify Slack request.' },
      { status: 400 }
    );
  }

  const body = await req.json();

  try {
    const payload = JSON.parse(body.payload) as SlackShortcutPayload;

    match(payload)
      .with(
        { type: 'message_action', callback_id: 'ask_colorstack_ai' },
        (payload) => {
          job('slack.message.answer', {
            channelId: payload.channel.id,
            text: payload.message.text,
            threadId: payload.message.thread_ts || payload.message.ts,
            userId: payload.user.id,
          });
        }
      )
      .otherwise(() => {
        console.error('Unknown interactivity type!', payload);
      });

    return BunResponse.json(null);
  } catch (e) {
    return BunResponse.json(
      { message: 'Failed to process Slack request.' },
      { status: 500 }
    );
  }
}

// Helpers

/**
 * We need to verify that the Slack request is actually coming from Slack and
 * not a bad actor.
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * @param headers - Headers from the Slack event request.
 */
function verifyRequest(
  rawBody: Buffer | undefined,
  headers: SlackRequestHeaders
): boolean {
  const {
    'x-slack-request-timestamp': requestTimestamp,
    'x-slack-signature': requestSignature,
  } = headers;

  const requestTimestampInMs = requestTimestamp * 1000;
  const fiveMinutesInMs = 1000 * 60 * 5;

  // We'll deem the request as "expired" if it is older than 5 minutes ago.
  const expired =
    new Date().getTime() - requestTimestampInMs * 1000 > fiveMinutesInMs;

  if (expired) {
    return false;
  }

  if (!ENV.SLACK_SIGNING_SECRET) {
    return false;
  }

  const hashedSignature = crypto
    .createHmac('sha256', ENV.SLACK_SIGNING_SECRET)
    .update(`v0:${requestTimestamp}:${rawBody}`, 'utf8')
    .digest('hex');

  const expectedSignature = `v0=${hashedSignature}`;

  return expectedSignature === requestSignature;
}
