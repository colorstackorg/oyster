import Mixpanel from 'mixpanel';
import UserAgentParser from 'ua-parser-js';

import { getIpAddress } from '@oyster/utils/get-ip-address';

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

const defaultProperties = {
  Application: 'Member Profile',
};

export type MixpanelEvent = {
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

  'Logged In': {
    Method: 'Google' | 'OTP' | 'Slack';
  };

  'Page Viewed': {
    Page: 'Directory' | 'Events' | 'Home' | 'Points' | 'Profile';
  };
};

export type TrackInput<Event extends keyof MixpanelEvent> = {
  event: Event;
  properties: MixpanelEvent[Event];
  request?: Request;
  user: string;
};

export function track<Event extends keyof MixpanelEvent>({
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
      ...defaultProperties,
      ...properties,
      distinct_id: user,
    });

    return;
  }

  const result = UserAgentParser(request.headers.get('user-agent') || '');

  const referrer =
    request.headers.get('referer') || request.headers.get('referrer');

  const ip = getIpAddress(request);

  mixpanel.track(event, {
    ...defaultProperties,
    ...properties,
    $browser: result.browser.name,
    $browser_version: result.browser.version,
    $device: result.device.model,
    $referrer: referrer,
    $os: result.os.name,
    $os_version: result.os.version,
    distinct_id: user,
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
