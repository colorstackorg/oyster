import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import dedent from 'dedent';

import { slack } from '@/modules/slack/instances';
import {
  type ChatbotAnswerSegment,
  parseAnswerForMemberProfile,
} from '@/modules/slack/slack';

const METADATA = dedent`
  {
    "threads": [
      { "channelId": "C123", "threadId": "1700000000.000100", "number": 1 },
      { "channelId": "C456", "threadId": "1700000000.000200", "number": 2 }
    ],
    "ok": true
  }
`;

const ANSWER =
  'Quant firms usually recruit in the summer [ref:1]. ' +
  'Some open applications in July [ref:2].';

const PERMALINK = 'https://colorstack-family.slack.com/archives/C123/p1';

const EXPECTED_SEGMENTS: ChatbotAnswerSegment[] = [
  { type: 'text', content: 'Quant firms usually recruit in the summer ' },
  { type: 'reference', number: 1 },
  { type: 'text', content: '. Some open applications in July ' },
  { type: 'reference', number: 2 },
  { type: 'text', content: '.' },
];

beforeEach(() => {
  spyOn(slack.chat, 'getPermalink').mockResolvedValue({
    ok: true,
    permalink: PERMALINK,
  });

  // Silences the error reports from the failure cases.
  spyOn(console, 'error').mockImplementation(() => {});
});

describe(parseAnswerForMemberProfile.name, () => {
  test('Should parse the documented format.', async () => {
    const result = await parseAnswerForMemberProfile(
      `${METADATA}\n---\n${ANSWER}`
    );

    expect(result).toEqual({
      ok: true,
      data: {
        answerSegments: EXPECTED_SEGMENTS,
        threads: [
          {
            authorFirstName: '',
            authorLastName: '',
            authorProfilePicture: '',
            createdAt: '',
            number: 1,
            replyCount: 0,
            text: '',
            url: PERMALINK,
          },
          {
            authorFirstName: '',
            authorLastName: '',
            authorProfilePicture: '',
            createdAt: '',
            number: 2,
            replyCount: 0,
            text: '',
            url: PERMALINK,
          },
        ],
      },
    });
  });

  test('Should parse metadata wrapped in a code fence.', async () => {
    const expected = await parseAnswerForMemberProfile(
      `${METADATA}\n---\n${ANSWER}`
    );

    const result = await parseAnswerForMemberProfile(
      '```json\n' + METADATA + '\n```\n---\n' + ANSWER
    );

    expect(result).toEqual(expected);
  });

  // This is the shape that the LLM returned for "What can you tell me about
  // the P&G It Security Internship OA?" when no thread was relevant.
  test('Should parse fenced metadata with no threads.', async () => {
    const result = await parseAnswerForMemberProfile(
      '```json\n{\n  "threads": [],\n  "ok": true\n}\n```\n---\n\n' +
        "I wasn't able to find any specific information about the P&G IT " +
        'Security Internship OA in our Slack history.'
    );

    expect(result).toEqual({
      ok: true,
      data: {
        answerSegments: [
          {
            type: 'text',
            content:
              "I wasn't able to find any specific information about the P&G " +
              'IT Security Internship OA in our Slack history.',
          },
        ],
        threads: [],
      },
    });
  });

  test('Should parse a delimiter with surrounding whitespace.', async () => {
    const expected = await parseAnswerForMemberProfile(
      `${METADATA}\n---\n${ANSWER}`
    );

    const result = await parseAnswerForMemberProfile(
      `${METADATA}\r\n  --- \r\n${ANSWER}`
    );

    expect(result).toEqual(expected);
  });

  test('Should parse a delimiter that is not on its own line.', async () => {
    const expected = await parseAnswerForMemberProfile(
      `${METADATA}\n---\n${ANSWER}`
    );

    const result = await parseAnswerForMemberProfile(`${METADATA}---${ANSWER}`);

    expect(result).toEqual(expected);
  });

  test('Should keep a "---" that is part of the answer.', async () => {
    const result = await parseAnswerForMemberProfile(
      `${METADATA}\n---\nFirst part [ref:1].\n\n---\n\nSecond part --- done.`
    );

    expect(result.ok && result.data.answerSegments).toEqual([
      { type: 'text', content: 'First part ' },
      { type: 'reference', number: 1 },
      { type: 'text', content: '.\n\n---\n\nSecond part --- done.' },
    ]);
  });

  test('Should return an answer with no sources if there are no threads.', async () => {
    const result = await parseAnswerForMemberProfile(
      `{ "threads": [], "ok": true }\n---\nI couldn't find that in our Slack history.`
    );

    expect(result).toEqual({
      ok: true,
      data: {
        answerSegments: [
          {
            type: 'text',
            content: "I couldn't find that in our Slack history.",
          },
        ],
        threads: [],
      },
    });
  });

  test('Should return an answer with no sources if there is no metadata.', async () => {
    const output = "I couldn't find anything about the P&G OA in our Slack.";

    const result = await parseAnswerForMemberProfile(output);

    expect(result).toEqual({
      ok: true,
      data: {
        answerSegments: [{ type: 'text', content: output }],
        threads: [],
      },
    });
  });

  test('Should keep the whole answer if there is no metadata but there is a divider.', async () => {
    const output = dedent`
      I couldn't find anything about the P&G OA in our Slack.

      ---

      In general, practice timed problems before taking an OA.
    `;

    const result = await parseAnswerForMemberProfile(output);

    expect(result).toEqual({
      ok: true,
      data: {
        answerSegments: [{ type: 'text', content: output }],
        threads: [],
      },
    });
  });

  test('Should ignore an empty metadata section.', async () => {
    const result = await parseAnswerForMemberProfile(
      "---\nI couldn't find that in our Slack history."
    );

    expect(result).toEqual({
      ok: true,
      data: {
        answerSegments: [
          {
            type: 'text',
            content: "I couldn't find that in our Slack history.",
          },
        ],
        threads: [],
      },
    });
  });

  test('Should fail if there is no metadata but the answer references a thread.', async () => {
    const result = await parseAnswerForMemberProfile(
      'Quant firms usually recruit in the summer [ref:1].'
    );

    expect(result).toEqual({
      ok: false,
      code: 400,
      error: 'The answer contains invalid thread references.',
    });
  });

  test('Should fail if the answer references a thread not in the metadata.', async () => {
    const result = await parseAnswerForMemberProfile(
      `${METADATA}\n---\nSee this thread [ref:3].`
    );

    expect(result).toEqual({
      ok: false,
      code: 400,
      error: 'The answer contains invalid thread references.',
    });
  });

  test('Should fail if the metadata is not valid JSON.', async () => {
    const output = '{ "threads": [], "ok": true, }\n---\nAnswer.';

    const result = await parseAnswerForMemberProfile(output);

    expect(result).toEqual({
      ok: false,
      code: 400,
      error: 'Failed to parse thread metadata into JSON.',
    });

    expect(console.error).toHaveBeenCalledTimes(1);

    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { output },
        message: 'Failed to parse thread metadata into JSON.',
      })
    );
  });

  test('Should fail if there is text before the metadata.', async () => {
    const output = `Here is my response:\n\n${METADATA}\n---\n${ANSWER}`;

    const result = await parseAnswerForMemberProfile(output);

    expect(result).toEqual({
      ok: false,
      code: 400,
      error: 'Failed to parse thread metadata into JSON.',
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ context: { output } })
    );
  });

  test('Should fail if the metadata is missing its closing brace.', async () => {
    const result = await parseAnswerForMemberProfile(
      '{ "threads": [\n---\nAnswer.'
    );

    expect(result).toEqual({
      ok: false,
      code: 400,
      error: 'Failed to parse thread metadata into JSON.',
    });
  });

  test('Should fail if the metadata is not formatted correctly.', async () => {
    const result = await parseAnswerForMemberProfile(
      '{ "ok": false }\n---\nAnswer.'
    );

    expect(result).toEqual({
      ok: false,
      code: 400,
      error: 'The metadata section is not formatted correctly.',
    });
  });

  test('Should fail if there is metadata but no delimiter.', async () => {
    const result = await parseAnswerForMemberProfile(`${METADATA}\n${ANSWER}`);

    expect(result).toEqual({
      ok: false,
      code: 400,
      error: 'Missing metadata section or answer section from response.',
    });
  });
});
