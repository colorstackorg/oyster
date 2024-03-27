declare module '@mailchimp/mailchimp_marketing' {
  namespace Mailchimp {
    export type Activity = {
      action: 'bounce' | 'click' | 'open';
      timestamp: string;
      url: string;
    };

    export type Campaign = {
      archive_url: string;
      create_time: string;
      emails_sent: number;
      id: string;
      recipients: {
        list_id: string;
        list_name: string;
      };
      send_time: string;
      settings: {
        subject_line: string;
        title: string;
      };
    };

    export type Link = {
      campaign_id: string;
      id: string;
      total_clicks: number;
      url: string;
    };

    export type List = {
      date_created: string;
      id: string;
      name: string;
    };
  }

  function setConfig({ apiKey: string, server: string }): void;

  namespace campaigns {
    /**
     * @see https://mailchimp.com/developer/marketing/api/campaigns/get-campaign-info
     * @see https://github.com/mailchimp/mailchimp-marketing-node/blob/master/src/api/CampaignsApi.js#L306
     */
    function get(id: string): Promise<Mailchimp.Campaign>;

    /**
     * @see https://mailchimp.com/developer/marketing/api/campaign-content/get-campaign-content
     * @see https://github.com/mailchimp/mailchimp-marketing-node/blob/master/src/api/CampaignsApi.js#L370
     */
    function getContent(id: string): Promise<{
      plain_text: string;
    }>;

    /**
     * @see https://mailchimp.com/developer/marketing/api/campaigns/list-campaigns
     * @see https://github.com/mailchimp/mailchimp-marketing-node/blob/master/src/api/CampaignsApi.js#L242
     */
    function list(options?: {
      beforeSendTime?: Date;
      sinceSendTime?: Date;
      count?: number;
      listId?: string;
      offset?: number;
      sortDir?: 'ASC' | 'DESC';
      sortField?: 'create_time' | 'send_time';
    }): Promise<{
      campaigns: Mailchimp.Campaign[];
      total_items: number;
    }>;
  }

  namespace lists {
    /**
     * @see https://mailchimp.com/developer/marketing/api/list-members/archive-list-member
     */
    function deleteListMember(listId: string, email: string): Promise<void>;

    /**
     * @see https://mailchimp.com/developer/marketing/api/lists/get-list-info
     */
    function getList(id: string): Promise<MailchimpList>;

    /**
     * @see https://mailchimp.com/developer/marketing/api/list-members/add-or-update-list-member
     */
    function setListMember(
      listId: string,
      email: string,
      body: {
        email_address: string;
        merge_fields: {
          FNAME: string;
          LNAME: string;
        };
        status: 'subscribed';
        status_if_new: 'subscribed';
      }
    ): Promise<void>;

    /**
     * @see https://mailchimp.com/developer/marketing/api/list-members/update-list-member
     */
    function updateListMember(
      listId: string,
      email: string,
      body: { email_address: string }
    ): Promise<void>;
  }

  namespace reports {
    /**
     * @see https://mailchimp.com/developer/marketing/api/click-reports/list-campaign-details
     */
    function getCampaignClickDetails(
      id: string,
      options?: {
        count?: number;
      }
    ): Promise<{
      urls_clicked: Mailchimp.Link[];
    }>;

    /**
     * @see https://mailchimp.com/developer/marketing/api/email-activity-reports/list-email-activity
     */
    function getEmailActivityForCampaign(
      campaignId: string,
      options?: {
        count?: number;
        offset?: number;
        since?: Date;
      }
    ): Promise<{
      emails: {
        activity?: Mailchimp.Activity[];
        campaign_id: string;
        email_address: string;
        email_id: string;
        list_id: string;
      }[];
      total_items: number;
    }>;
  }
}
