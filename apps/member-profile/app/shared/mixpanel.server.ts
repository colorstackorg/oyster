import Mixpanel from 'mixpanel';
import UserAgentParser from 'ua-parser-js';

import { ENV } from './constants.server';
import { getIpAddress } from './core.server';
import { getSession, user } from './session.server';

// Instances

let mixpanel: Mixpanel.Mixpanel;

if (ENV.MIXPANEL_TOKEN) {
  mixpanel = Mixpanel.init(ENV.MIXPANEL_TOKEN);
} else {
  console.warn('"MIXPANEL_TOKEN" is not set, so event tracking is disabled.');
}

// Types

type MixpanelEvent = {
  'Education History Updated': undefined;

  'Logged In': {
    Method: 'Google' | 'OTP' | 'Slack';
  };

  'Page Viewed': {
    Page:
      | 'Home'
      | 'Points'
      | 'Profile - Education History'
      | 'Profile - Email Addresses'
      | 'Profile - General'
      | 'Profile - Member Directory'
      | 'Profile - Work History';
  };

  'Work History Updated': undefined;
};

const defaultProperties = {
  Application: 'Member Profile',
};

// Utilities

export function track<Event extends keyof MixpanelEvent>(
  request: Request,
  event: Event,
  properties: MixpanelEvent[Event]
) {
  if (!mixpanel) {
    return;
  }

  const result = UserAgentParser(request.headers.get('user-agent') || '');

  const referrer =
    request.headers.get('referer') || request.headers.get('referrer');

  const ip = getIpAddress(request);

  getSession(request).then((session) => {
    const id = user(session);

    mixpanel.track(event, {
      ...defaultProperties,
      ...properties,
      $browser: result.browser.name,
      $browser_version: result.browser.version,
      $device: result.device.model,
      $referrer: referrer,
      $os: result.os.name,
      $os_version: result.os.version,
      distinct_id: id,
      ip,
    });
  });
}

export function trackWithoutRequest<Event extends keyof MixpanelEvent>(
  id: string,
  event: Event,
  properties: MixpanelEvent[Event]
) {
  if (!mixpanel) {
    return;
  }

  mixpanel.track(event, {
    ...defaultProperties,
    ...properties,
    distinct_id: id,
  });
}

type MixpanelProfile = {
  email: string;
  firstName: string;
  lastName: string;
  ip: string | null;
};

export function setMixpanelProfile(
  id: string,
  { email, firstName, lastName, ip }: MixpanelProfile
) {
  if (!mixpanel) {
    return;
  }

  mixpanel.people.set_once(id, {
    $email: email,
    $first_name: firstName,
    $last_name: lastName,
    ip,
  });
}
