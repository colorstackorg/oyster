import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { deactivateSlackUser as _deactivateSlackUser } from '../services/slack-admin.service';

export async function deactivateSlackUser({
  slackId,
}: GetBullJobData<'slack.deactivate'>) {
  await _deactivateSlackUser(slackId);
}
