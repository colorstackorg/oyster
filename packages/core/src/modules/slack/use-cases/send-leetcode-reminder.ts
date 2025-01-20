import { sql } from 'kysely';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
const SLACK_CAREER_LEETCODE_CHANNEL_ID = process.env.SLACK_CAREER_LEETCODE_CHANNEL_ID as string;



/*
send a daily leetcode reminder to the career leetcode channel with the current date
*/
export async function sendLeetcodeReminder(
  _: GetBullJobData<'slack.leetcode.reminder'>
){
  const month = sql`EXTRACT(MONTH FROM CURRENT_DATE)`
  const day = sql`EXTRACT(DAY FROM CURRENT_DATE)`

  //select all the tagged members from the database
  const members = await db
  .selectFrom('leetcodeTags')
  .select(['slackId'])
  .execute();

  const ids = members.map((member) => {
    return ` <@${member.slackId}> `;
  });

  const last = ids.pop();

  const result = ids.length ? `${ids.join(', ')} and ${last}` : last;

  //use the slack bull job to send a notification
  const response = await job('notification.slack.send',{
    channel: SLACK_CAREER_LEETCODE_CHANNEL_ID as string,
    message : `Good morning gangg!!!,${month}/${day} leetcode thread!!!`,
    workspace: 'regular',
    threadId : undefined
  }) as unknown as string;
  //send the tags as a reply to the message sent above
  if (response){
    job('notification.slack.send',{
      channel : SLACK_CAREER_LEETCODE_CHANNEL_ID as string,
      threadId : response,
      message : `${result}. Comment "add" if you'd like to be added to the list or "remove" if you'd like to be removed`,
      workspace: 'regular'
    })
  }
}


