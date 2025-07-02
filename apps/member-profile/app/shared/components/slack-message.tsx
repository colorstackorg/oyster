import React from 'react';
import { Link } from 'react-router';
import parseSlackMessage, { type Node, NodeType } from 'slack-message-parser';
import { match } from 'ts-pattern';

import { Button, cx, ProfilePicture, Text, type TextProps } from '@oyster/ui';

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
          <Button.Slot
            className="border-gray-300 text-black hover:bg-gray-100 active:bg-gray-200"
            variant="secondary"
          >
            <Link
              target="_blank"
              to={SLACK_WORKSPACE_URL + `/archives/${channelId}/p${messageId}`}
            >
              <img
                alt="Slack Logo"
                className="h-5 w-5"
                src="/images/slack.svg"
              />{' '}
              View in Slack
            </Link>
          </Button.Slot>
        )}
      </header>

      <SlackMessage>{text}</SlackMessage>
    </Card>
  );
}

type SlackMessageProps = Pick<
  TextProps,
  'as' | 'children' | 'className' | 'color' | 'variant'
>;

export function SlackMessage({
  children,
  className,
  ...rest
}: SlackMessageProps) {
  return (
    <Text
      className={cx('whitespace-pre-wrap [word-break:break-word]', className)}
      {...rest}
    >
      {<>{toHTML(parseSlackMessage(children as string))}</>}
    </Text>
  );
}

// TODO: Need to add "key" for each rendered element.

function toHTML(node: Node, index?: number) {
  const key = node.source + index;

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
      return (
        <span className="font-semibold" key={key}>
          {children.map(toHTML)}
        </span>
      );
    })
    .with({ type: NodeType.ChannelLink }, ({ channelID, label }) => {
      return (
        <Link
          className="link"
          key={key}
          to={SLACK_WORKSPACE_URL + `/channels/${channelID}`}
        >
          {label ? label.map(toHTML) : channelID}
        </Link>
      );
    })
    .with({ type: NodeType.Command }, ({ label, name }) => {
      return (
        <span className="rounded bg-yellow-100 p-0.5 font-semibold" key={key}>
          {label ? label.map(toHTML) : `@${name}`}
        </span>
      );
    })
    .with({ type: NodeType.Italic }, ({ children }) => {
      return (
        <span className="italic" key={key}>
          {children.map(toHTML)}
        </span>
      );
    })
    .with({ type: NodeType.Root }, ({ children }) => {
      return <React.Fragment key={key}>{children.map(toHTML)}</React.Fragment>;
    })
    .with({ type: NodeType.Text }, ({ text }) => {
      return text;
    })
    .with({ type: NodeType.URL }, ({ label, url }) => {
      return (
        <Link className="link" key={key} to={url} target="_blank">
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
          key={key}
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

export function ViewInSlackButton({
  channelId,
  messageId,
}: Pick<SlackMessageCardProps, 'channelId' | 'messageId'>) {
  if (!channelId || !messageId) {
    return null;
  }

  return (
    <Button.Slot
      className="border-gray-300 text-black hover:bg-gray-100 active:bg-gray-200"
      variant="secondary"
    >
      <Link
        target="_blank"
        to={SLACK_WORKSPACE_URL + `/archives/${channelId}/p${messageId}`}
      >
        <img alt="Slack Logo" className="h-5 w-5" src="/images/slack.svg" />{' '}
        View in Slack
      </Link>
    </Button.Slot>
  );
}
