import { createCookie } from 'react-router';

import { Timezone } from '@oyster/types';
import { getCookie } from '@oyster/utils';

export const oneTimeCodeIdCookie = createCookie('one_time_code_id', {
  maxAge: 60 * 5,
});

export function getTimezone(request: Request) {
  const cookie = request.headers.get('Cookie');
  const timezone = getCookie(cookie || '', 'timezone');

  return Timezone.parse(timezone);
}
