import { z } from 'zod';

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
 */
type SlackMessageSentEvent = {
  app_id?: string;
  bot_id?: string;
  channel: string;
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

export type SlackRequestBody =
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

export const SlackRequestHeaders = z.object({
  'x-slack-request-timestamp': z.coerce.number().positive(),
  'x-slack-signature': z.string().min(1),
});

export type SlackRequestHeaders = z.infer<typeof SlackRequestHeaders>;
