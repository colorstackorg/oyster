import crypto from 'crypto';
import express from 'express';
import { match } from 'ts-pattern';

import { job } from '@oyster/core/api';

import {
  type SlackRequestBody,
  SlackRequestHeaders,
} from './slack-event.types';
import { ENV } from '../shared/env';
import { type RawBodyRequest } from '../shared/types';

export const slackEventRouter = express.Router();

slackEventRouter.post('/slack/events', async (req: RawBodyRequest, res) => {
  const body = req.body as SlackRequestBody;

  const headersResult = SlackRequestHeaders.safeParse(req.headers);

  if (!headersResult.success) {
    return res.status(400).json({
      message: 'Failed to verify Slack request headers.',
    });
  }

  const verified = verifyRequest(req.rawBody, headersResult.data);

  if (!verified) {
    return res.status(400).json({
      message: 'Failed to verify Slack request.',
    });
  }

  if (body.type === 'url_verification') {
    return res.status(200).json({
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
    .with({ type: 'message' }, (event) => {
      job('slack.message.add', {
        channelId: event.channel!,
        createdAt: new Date(Number(event.ts) * 1000),
        id: event.ts!,
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

      job('slack.reaction.add', {
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
    .exhaustive();

  return res.status(200).json({});
});

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
