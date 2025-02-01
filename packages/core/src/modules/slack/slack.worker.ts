import { match } from 'ts-pattern';

import { registerWorker } from '@/infrastructure/bull';
import { SlackBullJob } from '@/infrastructure/bull.types';
import { onSlackUserInvited } from '@/modules/slack/events/slack-user-invited';
import { slack } from '@/modules/slack/instances';
import {
  answerChatbotQuestion,
  answerPublicQuestion,
  answerPublicQuestionInPrivate,
  syncThreadToPinecone,
} from '@/modules/slack/slack';
import { updateBirthdatesFromSlack } from '@/modules/slack/use-cases/update-birthdates-from-slack';
import { onSlackProfilePictureChanged } from './events/slack-profile-picture-changed';
import { onSlackReactionAdded } from './events/slack-reaction-added';
import { onSlackWorkspaceJoined } from './events/slack-workspace-joined';
import { addSlackMessage } from './use-cases/add-slack-message';
import { archiveSlackChannel } from './use-cases/archive-slack-channel';
import { changeSlackMessage } from './use-cases/change-slack-message';
import { createSlackChannel } from './use-cases/create-slack-channel';
import { deactivateSlackUser } from './use-cases/deactivate-slack-user';
import { deleteSlackChannel } from './use-cases/delete-slack-channel';
import { deleteSlackMessage } from './use-cases/delete-slack-message';
import { inviteToSlackWorkspace } from './use-cases/invite-to-slack-workspace';
import { removeSlackReaction } from './use-cases/remove-slack-reaction';
import { renameSlackChannel } from './use-cases/rename-slack-channel';
import { sendLeetcodeReminder } from './use-cases/send-leetcode-reminder';
import { sendSecuredTheBagReminder } from './use-cases/send-secured-the-bag-reminder';
import { unarchiveSlackChannel } from './use-cases/unarchive-slack-channel';
import { removeFromLeetcodeList } from './use-cases/update-leetcode-reminder-list';
import { addToLeetcodeList } from './use-cases/update-leetcode-reminder-list';

export const slackWorker = registerWorker(
  'slack',
  SlackBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'slack.birthdates.update' }, async () => {
        return updateBirthdatesFromSlack();
      })
      .with({ name: 'slack.leetcode.reminder' }, async ({ data }) => {
        return sendLeetcodeReminder(data);
      })
      .with({ name: 'slack.leetcode.add' }, async ({ data }) => {
        return addToLeetcodeList(data);
      })
      .with({ name: 'slack.leetcode.remove' }, async ({ data }) => {
        return removeFromLeetcodeList(data);
      })
      .with({ name: 'slack.channel.archive' }, async ({ data }) => {
        return archiveSlackChannel(data);
      })
      .with({ name: 'slack.channel.create' }, async ({ data }) => {
        return createSlackChannel(data);
      })
      .with({ name: 'slack.channel.delete' }, async ({ data }) => {
        return deleteSlackChannel(data);
      })
      .with({ name: 'slack.channel.rename' }, async ({ data }) => {
        return renameSlackChannel(data);
      })
      .with({ name: 'slack.channel.unarchive' }, async ({ data }) => {
        return unarchiveSlackChannel(data);
      })
      .with({ name: 'slack.chatbot.message' }, async ({ data }) => {
        return answerChatbotQuestion(data);
      })
      .with({ name: 'slack.deactivate' }, async ({ data }) => {
        return deactivateSlackUser(data);
      })
      .with({ name: 'slack.invite' }, async ({ data }) => {
        return inviteToSlackWorkspace(data);
      })
      .with({ name: 'slack.invited' }, async ({ data }) => {
        return onSlackUserInvited(data);
      })
      .with({ name: 'slack.joined' }, async ({ data }) => {
        return onSlackWorkspaceJoined(data);
      })
      .with({ name: 'slack.message.add' }, async ({ data }) => {
        return addSlackMessage(data);
      })
      .with({ name: 'slack.message.answer' }, async ({ data }) => {
        const result = await answerPublicQuestion(data);

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result.data;
      })
      .with({ name: 'slack.message.change' }, async ({ data }) => {
        return changeSlackMessage(data);
      })
      .with({ name: 'slack.message.delete' }, async ({ data }) => {
        return deleteSlackMessage(data);
      })
      .with({ name: 'slack.profile_picture.changed' }, async ({ data }) => {
        return onSlackProfilePictureChanged(data);
      })
      .with({ name: 'slack.question.answer.private' }, async ({ data }) => {
        const result = await answerPublicQuestionInPrivate(data);

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result.data;
      })
      .with({ name: 'slack.reaction.add' }, async ({ data }) => {
        return slack.reactions.add({
          channel: data.channelId,
          name: data.reaction,
          timestamp: data.messageId,
        });
      })
      .with({ name: 'slack.reaction.added' }, async ({ data }) => {
        return onSlackReactionAdded(data);
      })
      .with({ name: 'slack.reaction.remove' }, async ({ data }) => {
        return removeSlackReaction(data);
      })
      .with({ name: 'slack.secured_the_bag.reminder' }, async ({ data }) => {
        const result = await sendSecuredTheBagReminder(data);

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result.data;
      })
      .with({ name: 'slack.thread.sync_embedding' }, async ({ data }) => {
        const result = await syncThreadToPinecone(data);

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result.data;
      })
      .exhaustive();
  }
);
