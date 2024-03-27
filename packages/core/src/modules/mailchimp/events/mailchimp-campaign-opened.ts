import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onMailchimpCampaignOpened({
  studentId,
}: GetBullJobData<'email_marketing.opened'>) {
  job('student.activation_requirement_completed', {
    requirement: 'open_email_campaign',
    studentId,
  });
}
