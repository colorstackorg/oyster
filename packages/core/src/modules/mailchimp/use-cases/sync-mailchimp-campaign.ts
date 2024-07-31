import mailchimp, { type Mailchimp } from '@mailchimp/mailchimp_marketing';

import { db } from '@oyster/db';
import {
  type EmailCampaign,
  type EmailCampaignClick,
  type EmailCampaignLink,
  type EmailCampaignOpen,
} from '@oyster/types';
import { id } from '@oyster/utils';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { getMemberByEmail } from '@/modules/member/queries/get-member-by-email';
import { NotFoundError } from '@/shared/errors';

export async function syncMailchimpCampaign({
  campaignId,
}: GetBullJobData<'email_marketing.sync'>) {
  const campaign = await getMailchimpCampaign(campaignId);

  if (!campaign) {
    throw new NotFoundError('Email campaign not found.').withContext({
      campaignId,
    });
  }

  const { clicks, links, opens } = await getActivityData(campaign.id);

  await db.transaction().execute(async (trx) => {
    await Promise.all([
      trx
        .insertInto('emailCampaigns')
        .values({
          archiveUrl: campaign.archiveUrl,
          createdAt: campaign.createdAt,
          content: campaign.content,
          id: campaign.id,
          lastSyncedAt: new Date(),
          listId: campaign.listId,
          platform: campaign.platform,
          sentAt: campaign.sentAt,
          sentCount: campaign.sentCount,
          title: campaign.title,
          subject: campaign.subject,
        })
        .onConflict((oc) => {
          return oc.column('id').doUpdateSet({
            lastSyncedAt: new Date(),
          });
        })
        .execute(),

      ...opens.map(async (open) => {
        await trx
          .insertInto('emailCampaignOpens')
          .values({
            campaignId: open.campaignId,
            createdAt: open.createdAt,
            email: open.email,
            id: open.id,
            openedAt: open.openedAt,
            platform: open.platform,
            studentId: open.studentId,
          })
          .onConflict((oc) => oc.doNothing())
          .execute();
      }),

      ...links.map(async (link) => {
        await trx
          .insertInto('emailCampaignLinks')
          .values({
            campaignId: link.campaignId,
            createdAt: link.createdAt,
            id: link.id,
            platform: link.platform,
            url: link.url,
          })
          .onConflict((oc) => oc.doNothing())
          .execute();
      }),

      ...clicks.map(async (click) => {
        await trx
          .insertInto('emailCampaignClicks')
          .values({
            campaignId: click.campaignId,
            clickedAt: click.clickedAt,
            createdAt: click.createdAt,
            email: click.email,
            id: click.id,
            linkId: click.linkId,
            platform: click.platform,
            studentId: click.studentId,
          })
          .onConflict((oc) => oc.doNothing())
          .execute();
      }),
    ]);
  });

  opens.forEach((open) => {
    if (open.studentId) {
      job('email_marketing.opened', {
        studentId: open.studentId,
      });
    }
  });
}

async function getMailchimpCampaign(id: string) {
  try {
    const campaign = await mailchimp.campaigns.get(id);

    // Mailchimp doesn't return the campaign's content in the regular GET
    // campaign call - so we need to make an additional call.
    const { plain_text } = await mailchimp.campaigns.getContent(id);

    return toCampaign(
      Object.assign(campaign, {
        content: plain_text,
      })
    );
  } catch (e) {
    return null;
  }
}

async function getActivityData(campaignId: string) {
  const result: {
    clicks: EmailCampaignClick[];
    links: EmailCampaignLink[];
    opens: EmailCampaignOpen[];
  } = {
    clicks: [],
    links: [],
    opens: [],
  };

  // If the user wants to sync the activity, we need to fetch the links,
  // clicks, and opens for the campaign.

  result.links = await listMailchimpCampaignLinks(campaignId);

  const { clicks, opens } = await listCampaignActivity(campaignId);

  result.clicks = clicks;
  result.opens = opens;

  // The last step is to associate the clicks and opens with the student, if
  // we can find them.

  for (const click of result.clicks) {
    const student = await getMemberByEmail(click.email);

    if (student) {
      click.studentId = student.id;
    }
  }

  for (const open of result.opens) {
    const student = await getMemberByEmail(open.email);

    if (student) {
      open.studentId = student.id;
    }
  }

  return result;
}

type ListCampaignActivityOptions = {
  since?: Date;
};

async function listCampaignActivity(
  campaignId: string,
  options: ListCampaignActivityOptions = {}
) {
  const clicks: EmailCampaignClick[] = [];
  const opens: EmailCampaignOpen[] = [];

  const pageSize = 1000;
  let offset = 0;

  // This is the total number of records that have been returned thus far.
  // We need to keep track of this because the Mailchimp API doesn't let us
  // know when we are at the end of the list, so we'll just check to see if
  // the number of records returned is equal to the total count.
  let itemCount = 0;

  // This is the total number of records that exist in the list, which we'll
  // set in the first call to the API.
  let totalCount = 0;

  const links: EmailCampaignLink[] =
    await listMailchimpCampaignLinks(campaignId);

  while (true) {
    const { emails, total_items } =
      await mailchimp.reports.getEmailActivityForCampaign(campaignId, {
        count: pageSize,
        offset,
        since: options.since,
      });

    // We only need to set the total count once.
    if (!totalCount) {
      totalCount = total_items;
    }

    // We want to keep track of the total number of items that we've seen
    // so far.
    itemCount += emails.length;

    emails.forEach((email) => {
      if (!email.activity || !email.email_address) {
        return;
      }

      email.activity.forEach((activity) => {
        // We don't care about bounces, only opens + clicks.
        if (activity.action === 'bounce') {
          return;
        }

        if (activity.action === 'click') {
          // Mailchimp doesn't give us the link ID in the "activity", so we
          // need to find it ourselves by looking at the URL clicked.
          const linkClicked = links.find((link) => {
            // Just in case the URL had whitespace, let's get rid of it
            // since that's what we do in our domain validation.
            return link.url === activity.url.replace(/\s/g, '');
          });

          if (!linkClicked) {
            return;
          }

          clicks.push(
            toCampaignClick({
              campaign_id: campaignId,
              email: email.email_address,
              link_id: linkClicked.id,
              timestamp: activity.timestamp,
            })
          );

          return;
        }

        if (activity.action === 'open') {
          opens.push(
            toCampaignOpen({
              campaign_id: campaignId,
              email: email.email_address,
              timestamp: activity.timestamp,
            })
          );

          return;
        }
      });
    });

    // If the number of emails returned in this iteration is less than the
    // page size, then we know that we've reached the end of the list.
    if (emails.length < pageSize) {
      break;
    }

    if (itemCount >= totalCount) {
      break;
    }

    offset += emails.length;
  }

  return {
    clicks,
    opens,
  };
}

async function listMailchimpCampaignLinks(campaignId: string) {
  const { urls_clicked } = await mailchimp.reports.getCampaignClickDetails(
    campaignId,
    { count: 1000 }
  );

  const links = urls_clicked
    .filter((url) => {
      return url.total_clicks > 0;
    })
    .map((url) => {
      return toCampaignLink(url);
    });

  return links;
}

function toCampaign(
  _campaign: Mailchimp.Campaign & { content?: string }
): EmailCampaign {
  return {
    archiveUrl: _campaign.archive_url || undefined,
    content: _campaign.content || '',
    createdAt: new Date(_campaign.create_time),
    id: _campaign.id,
    listId: _campaign.recipients.list_id,
    platform: 'mailchimp',
    sentAt: _campaign.send_time ? new Date(_campaign.send_time) : undefined,
    sentCount: _campaign.emails_sent ?? undefined,
    subject: _campaign.settings.subject_line,
    title: _campaign.settings.title || undefined,
    updatedAt: new Date(_campaign.create_time),
  };
}

function toCampaignLink(link: Mailchimp.Link): EmailCampaignLink {
  return {
    campaignId: link.campaign_id,
    createdAt: new Date(),
    deletedAt: undefined,
    id: link.id,
    platform: 'mailchimp',
    url: link.url,
    updatedAt: new Date(),
  };
}

function toCampaignClick(input: {
  campaign_id: string;
  email: string;
  link_id: string;
  timestamp: string;
}): EmailCampaignClick {
  return {
    campaignId: input.campaign_id,
    createdAt: new Date(),
    clickedAt: new Date(input.timestamp),
    deletedAt: undefined,
    email: input.email,
    id: id(),
    linkId: input.link_id,
    platform: 'mailchimp',
    studentId: undefined,
    updatedAt: new Date(),
  };
}

function toCampaignOpen(input: {
  campaign_id: string;
  email: string;
  timestamp: string;
}): EmailCampaignOpen {
  return {
    campaignId: input.campaign_id,
    createdAt: new Date(),
    email: input.email,
    id: id(),
    openedAt: new Date(input.timestamp),
    platform: 'mailchimp',
    studentId: undefined,
    updatedAt: new Date(),
  };
}
