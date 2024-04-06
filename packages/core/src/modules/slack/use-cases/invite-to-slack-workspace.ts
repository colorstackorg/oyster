import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { inviteSlackUser } from '../services/slack-admin.service';

export async function inviteToSlackWorkspace({
  email,
}: GetBullJobData<'slack.invite'>) {
  await inviteSlackUser(email);
}
