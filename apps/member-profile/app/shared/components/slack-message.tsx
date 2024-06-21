import { Link } from '@remix-run/react';
import { get as getEmoji } from 'node-emoji';
import { type PropsWithChildren } from 'react';
import parseSlackMessage, { type Node, NodeType } from 'slack-message-parser';
import { match } from 'ts-pattern';

import { cx, Text } from '@oyster/ui';

import { Card } from '@/shared/components/card';

type SlackMessageProsp = PropsWithChildren<{
  border?: boolean;
}>;

export function SlackMessage({ border = true, children }: SlackMessageProsp) {
  return toHTML(parseSlackMessage(children as string), border);
}

const SLACK_WORKSPACE_URL = 'https://colorstack-family.slack.com';

function toHTML(node: Node, border: unknown = false) {
  const result = match(node)
    .with(
      { type: NodeType.Code },
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
    .with({ type: NodeType.Emoji }, ({ name }) => {
      return <span>{getEmoji(name)}</span>;
    })
    .with({ type: NodeType.Italic }, ({ children }) => {
      return <span className="italic">{children.map(toHTML)}</span>;
    })
    .with({ type: NodeType.Root }, ({ children }) => {
      const body = (
        <Text className="whitespace-pre-wrap">{children.map(toHTML)}</Text>
      );

      return border ? <Card>{body}</Card> : body;
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
