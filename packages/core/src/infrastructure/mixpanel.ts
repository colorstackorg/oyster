import { isIP } from 'is-ip';
import Mixpanel from 'mixpanel';
import UserAgentParser from 'ua-parser-js';

// Environment Variables

const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN;

// Instances

let mixpanel: Mixpanel.Mixpanel;

if (MIXPANEL_TOKEN) {
  mixpanel = Mixpanel.init(MIXPANEL_TOKEN);
} else {
  console.warn('"MIXPANEL_TOKEN" is not set, so event tracking is disabled.');
}

// Core

export type MixpanelEvent = {
  'Application Started': {
    Email: string;
    'First Name': string;
    'Last Name': string;
  };

  'Chatbot Question Asked': {
    Question: string;
    Type?: 'DM' | 'Public';
  };

  'Directory - CTA Clicked': {
    CTA:
      | 'Calendly'
      | 'GitHub'
      | 'Instagram'
      | 'LinkedIn'
      | 'Personal Website'
      | 'Slack'
      | 'Twitter';
  };

  'Directory - Profile Clicked': undefined;

  'Help Request Finished': {
    Status: string;
    Type: string;
  };

  'Help Request List Viewed': {
    Filter: string[];
  };

  'Help Request Offered': {
    Type: string;
  };

  'Help Request Reminder Sent': {
    Type: string;
  };

  'Help Request Viewed': {
    Status: string;
    Type: string;
  };

  'Help Requested': {
    Type: string;
  };

  'LinkedIn Synced': {
    '# of Education Creates': number;
    '# of Education Updates': number;
    '# of Member Updates': number;
    '# of Work Experience Creates': number;
    '# of Work Experience Updates': number;
  };

  'Logged In': {
    Method: 'Google' | 'OTP' | 'Slack';
  };

  'Offer Viewed': {
    Company: string;
    Type: 'Full-Time' | 'Internship';
  };

  'Opportunity Bookmarked': {
    Company: string;
  };

  'Opportunity Viewed': {
    Company: string;
  };

  'Page Viewed': {
    Page:
      | 'Companies'
      | 'Compensation'
      | 'Directory'
      | 'Events'
      | 'Home'
      | 'Last Week in ColorStack'
      | 'Opportunities'
      | 'Points'
      | 'Profile'
      | 'Resources';
  };

  'Public Question Answered': {
    '# of Threads Found': number;
    Question: string;
    Where: 'DM';
  };

  'Resource Added': undefined;
  'Resource Link Copied': undefined;
  'Resource Tag Added': undefined;
  'Resource Upvoted': undefined;
  'Resource Viewed': undefined;
  'Resume Reviewed': undefined;
};

export type TrackInput<Event extends keyof MixpanelEvent> = {
  application?: 'API' | 'Member Profile' | 'Slack';
  event: Event;
  properties: MixpanelEvent[Event];
  request?: Request;
  user?: string;
};

export function track<Event extends keyof MixpanelEvent>({
  application = 'Member Profile',
  event,
  properties,
  request,
  user,
}: TrackInput<Event>) {
  if (!mixpanel) {
    return;
  }

  if (!request) {
    mixpanel.track(event, {
      ...properties,
      ...(user && { distinct_id: user }),
      Application: application,
    });

    return;
  }

  const result = UserAgentParser(request.headers.get('user-agent') || '');

  const referrer =
    request.headers.get('referer') || request.headers.get('referrer');

  const ip = getIpAddress(request);

  mixpanel.track(event, {
    ...properties,
    ...(user && { distinct_id: user }),
    Application: application,
    $browser: result.browser.name,
    $browser_version: result.browser.version,
    $device: result.device.model,
    $referrer: referrer,
    $os: result.os.name,
    $os_version: result.os.version,
    ip,
  });
}

type MixpanelProfile = {
  email: string;
  firstName: string;
  lastName: string;
  ip: string | null;
};

export function setMixpanelProfile(id: string, profile: MixpanelProfile) {
  if (!mixpanel) {
    return;
  }

  mixpanel.people.set_once(id, {
    $email: profile.email,
    $first_name: profile.firstName,
    $last_name: profile.lastName,
    ip: profile.ip,
  });
}

// Helpers

const HEADER_NAMES = Object.freeze([
  'X-Client-IP',
  'X-Forwarded-For',
  'HTTP-X-Forwarded-For',
  'Fly-Client-IP',
  'CF-Connecting-IP',
  'Fastly-Client-Ip',
  'True-Client-Ip',
  'X-Real-IP',
  'X-Cluster-Client-IP',
  'X-Forwarded',
  'Forwarded-For',
  'Forwarded',
  'DO-Connecting-IP',
  'oxygen-buyer-ip',
] as const);

/**
 * Returns the IP address of the client sending the request.
 *
 * Copied (and slightly modified) from `remix-utils` to avoid pulling in entire
 * package.
 *
 * @see https://github.com/sergiodxa/remix-utils/blob/v7.1.0/src/server/get-client-ip-address.ts
 */
export function getIpAddress(request: Request) {
  const possibleAddresses = HEADER_NAMES.flatMap((name) => {
    const value = request.headers.get(name);

    if (name === 'Forwarded') {
      return parseForwardedHeader(value);
    }

    if (!value?.includes(',')) {
      return value;
    }

    return value.split(',').map((ip) => {
      return ip.trim();
    });
  });

  const ip = possibleAddresses.find((address) => {
    return address ? isIP(address) : false;
  });

  return ip || null;
}

function parseForwardedHeader(value: string | null) {
  if (!value) {
    return null;
  }

  for (const part of value.split(';')) {
    if (part.startsWith('for=')) {
      return part.slice(4);
    }

    continue;
  }

  return null;
}
