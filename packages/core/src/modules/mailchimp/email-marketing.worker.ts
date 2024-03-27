import dayjs from 'dayjs';
import { match } from 'ts-pattern';

import { EmailMarketingBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { onMailchimpCampaignOpened } from './events/mailchimp-campaign-opened';
import { removeMailchimpListMember } from './use-cases/remove-mailchimp-list-member';
import { syncMailchimpCampaign } from './use-cases/sync-mailchimp-campaign';
import { syncMailchimpList } from './use-cases/sync-mailchimp-list';

export const emailMarketingWorker = registerWorker(
  'email_marketing',
  EmailMarketingBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'email_marketing.opened' }, ({ data }) => {
        return onMailchimpCampaignOpened(data);
      })
      .with({ name: 'email_marketing.remove' }, ({ data }) => {
        return removeMailchimpListMember(data);
      })
      .with({ name: 'email_marketing.sync' }, async ({ data }) => {
        return syncMailchimpCampaign(data);
      })
      .with({ name: 'email_marketing.sync.hourly' }, async () => {
        return syncMailchimpList({
          sentAfter: dayjs().subtract(1, 'week').toDate(),
        });
      })
      .with({ name: 'email_marketing.sync.daily' }, async () => {
        return syncMailchimpList({
          sentAfter: dayjs().subtract(1, 'month').toDate(),
        });
      })
      .with({ name: 'email_marketing.sync.weekly' }, async () => {
        return syncMailchimpList({
          sentAfter: dayjs().subtract(3, 'month').toDate(),
        });
      })
      .with({ name: 'email_marketing.sync.monthly' }, async () => {
        return syncMailchimpList({
          sentAfter: dayjs().subtract(6, 'month').toDate(),
        });
      })
      .with({ name: 'email_marketing.sync.yearly' }, async () => {
        return syncMailchimpList({
          sentBefore: dayjs().subtract(1, 'year').toDate(),
        });
      })
      .exhaustive();
  }
);
