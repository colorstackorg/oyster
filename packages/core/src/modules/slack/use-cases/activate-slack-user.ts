import { type GetBullJobData } from '@/infrastructure/bull.types';
import { activateSlackUser as _activateSlackUser } from '../services/slack-admin.service';

export async function activateSlackUser({
  slackId,
}: GetBullJobData<'slack.activate'>) {
  await _activateSlackUser(slackId);
}
