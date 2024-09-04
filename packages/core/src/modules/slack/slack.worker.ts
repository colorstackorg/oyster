import { match } from 'ts-pattern';

import { SlackBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { onSlackUserInvited } from '@/modules/slack/events/slack-user-invited';
import {
  answerChatbotQuestion,
  updateThreadInPinecone,
} from '@/modules/slack/slack';
import { updateBirthdatesFromSlack } from '@/modules/slack/use-cases/update-birthdates-from-slack';
import { onSlackMessageAdded } from './events/slack-message-added';
import { onSlackProfilePictureChanged } from './events/slack-profile-picture-changed';
import { onSlackWorkspaceJoined } from './events/slack-workspace-joined';
import { addSlackMessage } from './use-cases/add-slack-message';
import { addSlackReaction } from './use-cases/add-slack-reaction';
import { archiveSlackChannel } from './use-cases/archive-slack-channel';
import { changeSlackMessage } from './use-cases/change-slack-message';
import { createSlackChannel } from './use-cases/create-slack-channel';
import { deactivateSlackUser } from './use-cases/deactivate-slack-user';
import { deleteSlackChannel } from './use-cases/delete-slack-channel';
import { deleteSlackMessage } from './use-cases/delete-slack-message';
import { inviteToSlackWorkspace } from './use-cases/invite-to-slack-workspace';
import { removeSlackReaction } from './use-cases/remove-slack-reaction';
import { renameSlackChannel } from './use-cases/rename-slack-channel';
import { unarchiveSlackChannel } from './use-cases/unarchive-slack-channel';

export const slackWorker = registerWorker(
  'slack',
  SlackBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'slack.birthdates.update' }, async () => {
        return updateBirthdatesFromSlack();
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
      .with({ name: 'slack.message.added' }, async ({ data }) => {
        return onSlackMessageAdded(data);
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
      .with({ name: 'slack.reaction.add' }, async ({ data }) => {
        return addSlackReaction(data);
      })
      .with({ name: 'slack.reaction.remove' }, async ({ data }) => {
        return removeSlackReaction(data);
      })
      .with({ name: 'slack.thread.update_embedding' }, async ({ data }) => {
        const result = await updateThreadInPinecone(data.threadId);

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result.data;
      })
      .exhaustive();
  }
);
