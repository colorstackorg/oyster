import { Link } from '@remix-run/react';
import React from 'react';
import parseSlackMessage, { type Node, NodeType } from 'slack-message-parser';
import { match } from 'ts-pattern';

import {
  cx,
  getButtonCn,
  ProfilePicture,
  Text,
  type TextProps,
} from '@oyster/ui';

import { Card } from '@/shared/components/card';

type SlackMessageCardProps = {
  channelId?: string;
  messageId?: string;
  postedAt?: string;
  posterFirstName?: string;
  posterLastName?: string;
  posterProfilePicture?: string;
  text: string;
};

const SLACK_WORKSPACE_URL = 'https://colorstack-family.slack.com';

export function SlackMessageCard({
  channelId,
  messageId,
  postedAt,
  posterFirstName = 'ColorStack',
  posterLastName = 'Member',
  posterProfilePicture,
  text,
}: SlackMessageCardProps) {
  return (
    <Card>
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <ProfilePicture
            initials={posterFirstName[0] + posterLastName[1]}
            size="48"
            src={posterProfilePicture}
          />

          <Text weight="600">
            {posterFirstName} {posterLastName}
          </Text>

          {postedAt && (
            <Text color="gray-500" variant="sm">
              {postedAt}
            </Text>
          )}
        </div>

        {channelId && messageId && (
          <Link
            className={cx(
              getButtonCn({ size: 'small', variant: 'secondary' }),
              'border-gray-300 text-black hover:bg-gray-100 active:bg-gray-200'
            )}
            target="_blank"
            to={SLACK_WORKSPACE_URL + `/archives/${channelId}/p${messageId}`}
          >
            <img alt="Slack Logo" className="h-5 w-5" src="/images/slack.svg" />{' '}
            View in Slack
          </Link>
        )}
      </header>

      <SlackMessage>{text}</SlackMessage>
    </Card>
  );
}

type SlackMessageProps = Pick<TextProps, 'children' | 'className' | 'color'>;

export function SlackMessage({
  children,
  className,
  ...rest
}: SlackMessageProps) {
  return (
    <Text className={cx('whitespace-pre-wrap', className)} {...rest}>
      {<>{toHTML(parseSlackMessage(children as string))}</>}
    </Text>
  );
}

function toHTML(node: Node) {
  const result = match(node)
    .with(
      { type: NodeType.Code },
      { type: NodeType.Emoji },
      { type: NodeType.PreText },
      { type: NodeType.Quote },
      { type: NodeType.Strike },
      ({ source }) => {
        return source;
      }
    )
    .with({ type: NodeType.Bold }, ({ children }) => {
      return <span className="font-semibold">{children.map(toHTML)}</span>;
    })
    .with({ type: NodeType.ChannelLink }, ({ channelID, label }) => {
      return (
        <Link
          className="link"
          to={SLACK_WORKSPACE_URL + `/channels/${channelID}`}
        >
          {label ? label.map(toHTML) : channelID}
        </Link>
      );
    })
    .with({ type: NodeType.Command }, ({ label, name }) => {
      return (
        <span className="rounded bg-yellow-100 p-0.5 font-semibold">
          {label ? label.map(toHTML) : `@${name}`}
        </span>
      );
    })
    .with({ type: NodeType.Italic }, ({ children }) => {
      return <span className="italic">{children.map(toHTML)}</span>;
    })
    .with({ type: NodeType.Root }, ({ children }) => {
      return <React.Fragment>{children.map(toHTML)}</React.Fragment>;
    })
    .with({ type: NodeType.Text }, ({ text }) => {
      return text;
    })
    .with({ type: NodeType.URL }, ({ label, url }) => {
      return (
        <Link className="link" to={url} target="_blank">
          {label ? label.map(toHTML) : url}
        </Link>
      );
    })
    .with({ type: NodeType.UserLink }, ({ label, userID }) => {
      return (
        <Link
          className={cx(
            'rounded bg-primary bg-opacity-10 p-0.5 font-normal text-primary',
            'hover:bg-opacity-20',
            'active:bg-opacity-30'
          )}
          to={SLACK_WORKSPACE_URL + `/team/${userID}`}
        >
          {label ? label.map(toHTML) : `@${userID}`}
        </Link>
      );
    })
    // @ts-expect-error b/c it's not recognizing the type for some reason.
    .exhaustive();

  return result;
}
