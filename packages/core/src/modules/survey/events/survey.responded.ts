import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';

export async function onRespondedToSurvey({
  studentId,
  surveyId,
}: GetBullJobData<'survey.responded'>) {
  job('gamification.activity.completed', {
    studentId,
    surveyRespondedTo: surveyId,
    type: 'respond_to_survey',
  });
}
