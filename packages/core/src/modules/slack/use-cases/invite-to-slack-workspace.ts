import { type GetBullJobData } from '@/infrastructure/bull.types';
import { inviteSlackUser } from '../services/slack-admin.service';

export async function inviteToSlackWorkspace({
  email,
}: GetBullJobData<'slack.invite'>) {
  await inviteSlackUser(email);
}
