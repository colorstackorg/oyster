import 'katex/dist/katex.min.css';

import React from 'react';
import { match } from 'ts-pattern';

import { cx, getTextCn, Text } from '@oyster/ui';
import {
  type Block,
  type InlineToken,
  parseAiMarkdown,
} from '@oyster/utils/ai-formatting';
import { safeKatexRender } from '@oyster/utils/katex';

type AiMarkdownProps = {
  className?: string;

  /**
   * Renders a `[ref:N]` citation (ie: a link to the Slack thread).
   */
  renderRef(number: number): React.ReactNode;

  text: string;
};

/**
 * Renders raw AI output (markdown with LaTeX math) as React elements.
 */
export function AiMarkdown({ className, renderRef, text }: AiMarkdownProps) {
  const blocks = parseAiMarkdown(text);

  return (
    <div className={cx('flex flex-col gap-3', getTextCn({ className }))}>
      {blocks.map((block, i) => {
        return <AiBlock block={block} key={i} renderRef={renderRef} />;
      })}
    </div>
  );
}

type AiBlockProps = Pick<AiMarkdownProps, 'renderRef'> & {
  block: Block;
};

function AiBlock({ block, renderRef }: AiBlockProps) {
  function inline(tokens: InlineToken[]) {
    return <AiInline renderRef={renderRef} tokens={tokens} />;
  }

  return match(block)
    .with({ type: 'code' }, ({ content }) => {
      return (
        <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-sm">
          <code>{content}</code>
        </pre>
      );
    })
    .with({ type: 'heading' }, ({ children, level }) => {
      return (
        <Text
          variant={level <= 1 ? 'xl' : level === 2 ? 'lg' : 'md'}
          weight="600"
        >
          {inline(children)}
        </Text>
      );
    })
    .with({ type: 'hr' }, () => {
      return <hr className="border-gray-200" />;
    })
    .with({ type: 'list' }, ({ items, ordered, start }) => {
      const List = ordered ? 'ol' : 'ul';

      return (
        <List
          className={cx(
            'flex flex-col gap-1 pl-6',
            ordered ? 'list-decimal' : 'list-disc'
          )}
          start={ordered ? start : undefined}
        >
          {items.map((item, i) => {
            return <li key={i}>{inline(item)}</li>;
          })}
        </List>
      );
    })
    .with({ type: 'math' }, ({ latex }) => {
      return (
        <div
          className="overflow-x-auto overflow-y-hidden text-center"
          dangerouslySetInnerHTML={{ __html: safeKatexRender(latex, true) }}
        />
      );
    })
    .with({ type: 'paragraph' }, ({ children }) => {
      return <p>{inline(children)}</p>;
    })
    .with({ type: 'quote' }, ({ lines }) => {
      return (
        <blockquote className="border-l-4 border-gray-200 pl-3 text-gray-500">
          {lines.map((line, i) => {
            return <p key={i}>{inline(line)}</p>;
          })}
        </blockquote>
      );
    })
    .with({ type: 'table' }, ({ header, rows }) => {
      const cellCn = 'border border-gray-200 px-2 py-1';

      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            {!!header.length && (
              <thead className="bg-gray-50">
                <tr>
                  {header.map((cell, i) => {
                    return (
                      <th className={cx(cellCn, 'font-semibold')} key={i}>
                        {inline(cell)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
            )}

            <tbody>
              {rows.map((row, i) => {
                return (
                  <tr key={i}>
                    {row.map((cell, j) => {
                      return (
                        <td className={cellCn} key={j}>
                          {inline(cell)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    })
    .exhaustive();
}

type AiInlineProps = Pick<AiMarkdownProps, 'renderRef'> & {
  tokens: InlineToken[];
};

function AiInline({ renderRef, tokens }: AiInlineProps) {
  return tokens.map((token, i) => {
    return (
      <React.Fragment key={i}>
        {match(token)
          .with({ type: 'bold' }, ({ children }) => {
            return (
              <strong className="font-semibold">
                <AiInline renderRef={renderRef} tokens={children} />
              </strong>
            );
          })
          .with({ type: 'code' }, ({ content }) => {
            return (
              <code className="rounded bg-gray-100 px-1 font-mono text-sm">
                {content}
              </code>
            );
          })
          .with({ type: 'italic' }, ({ content }) => {
            return <em>{content}</em>;
          })
          .with({ type: 'link' }, ({ text, url }) => {
            return (
              <a
                className="text-primary underline"
                href={url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {text}
              </a>
            );
          })
          .with({ type: 'math' }, ({ latex }) => {
            return (
              <span
                dangerouslySetInnerHTML={{
                  __html: safeKatexRender(latex, false),
                }}
              />
            );
          })
          .with({ type: 'ref' }, ({ number }) => {
            return renderRef(number);
          })
          .with({ type: 'text' }, ({ content }) => {
            return content;
          })
          .exhaustive()}
      </React.Fragment>
    );
  });
}
