import mailchimp, { type Mailchimp } from '@mailchimp/mailchimp_marketing';

import { type EmailCampaign, type EmailList } from '@oyster/types';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { ENV } from '@/shared/env';
import { NotFoundError } from '@/shared/errors';

type SyncEmailListInput = {
  sentAfter?: Date;
  sentBefore?: Date;
};

/**
 * This job is responsible for syncing an email list:
 * - Storing the metadata of the email list.
 * - Fetching all of the email campaigns associated with the email list (from
 *   the Email Marketing API).
 * - Calling the use case that is responsible for syncing an individual email
 *   campaign for all campaigns found.
 */
export async function syncMailchimpList(input: SyncEmailListInput) {
  const list = await getMailchimpList(ENV.MAILCHIMP_AUDIENCE_ID);

  if (!list) {
    throw new NotFoundError('Email list not found.').withContext({
      listId: ENV.MAILCHIMP_AUDIENCE_ID,
    });
  }

  // We have to save the email list before we sync the campaigns since the
  // campaigns have a FK constraint that depends on the list.

  await db
    .insertInto('emailLists')
    .values({
      createdAt: list.createdAt,
      id: list.id,
      name: list.name,
      platform: list.platform,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();

  const campaigns = await listMailchimpCampaigns(list, {
    sentAfter: input.sentAfter,
    sentBefore: input.sentBefore,
  });

  campaigns.forEach((campaign) => {
    job('email_marketing.sync', {
      campaignId: campaign.id,
    });
  });
}

async function getMailchimpList(id: string) {
  try {
    const list = await mailchimp.lists.getList(id);

    return toList(list);
  } catch (e) {
    return null;
  }
}

type ListCampaignsOptions = {
  sentAfter?: Date;
  sentBefore?: Date;
};

async function listMailchimpCampaigns(
  list: EmailList,
  options: ListCampaignsOptions = {}
) {
  const result: Pick<EmailCampaign, 'id'>[] = [];

  const pageSize = 1000;
  let offset = 0;

  // This is the total number of records that exist in the list, which we'll
  // set in the first call to the API.
  let totalCount = 0;

  while (true) {
    const { campaigns, total_items } = await mailchimp.campaigns.list({
      beforeSendTime: options.sentBefore,
      count: pageSize,
      listId: list.id,
      offset,
      sinceSendTime: options.sentAfter,
      sortDir: 'ASC',
      sortField: 'create_time',
    });

    // We only need to set the total count once.
    if (!totalCount) {
      totalCount = total_items;
    }

    campaigns.forEach((campaign) => {
      result.push({ id: campaign.id });
    });

    // If the number of campaigns returned is less than the page size, then
    // we know that we've reached the end of the list.
    if (campaigns.length < pageSize) {
      break;
    }

    // The order of operations is important here, because we need to make
    // sure that we don't do this check before we've appended the new
    // campaigns.
    if (result.length >= totalCount) {
      break;
    }

    offset += pageSize;
  }

  return result;
}

function toList(list: Mailchimp.List): EmailList {
  return {
    createdAt: new Date(list.date_created),
    id: list.id,
    name: list.name,
    platform: 'mailchimp',
    updatedAt: new Date(list.date_created),
  };
}
