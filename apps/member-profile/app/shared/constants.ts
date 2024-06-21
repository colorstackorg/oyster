const ROUTES = [
  '/apply',
  '/apply/thank-you',
  '/companies',
  '/companies/reviews/add',
  '/companies/:id',
  '/directory',
  '/directory/join',
  '/directory/join/1',
  '/directory/join/2',
  '/directory/join/3',
  '/directory/join/4',
  '/directory/join/finish',
  '/directory/:id',
  '/events',
  '/events/past',
  '/events/past/:id/attendees',
  '/events/upcoming',
  '/events/upcoming/:id/register',
  '/events/upcoming/:id/registrations',
  '/home',
  '/home/claim-swag-pack',
  '/home/claim-swag-pack/confirmation',
  '/login',
  '/login/otp/send',
  '/login/otp/verify',
  '/points',
  '/profile',
  '/profile/education',
  '/profile/education/add',
  '/profile/education/:id/delete',
  '/profile/education/:id/edit',
  '/profile/emails',
  '/profile/emails/add/finish',
  '/profile/emails/add/start',
  '/profile/emails/change-primary',
  '/profile/general',
  '/profile/icebreakers',
  '/profile/integrations',
  '/profile/personal',
  '/profile/socials',
  '/profile/work',
  '/profile/work/add',
  '/profile/work/:id/delete',
  '/profile/work/:id/edit',
  '/profile/work/:id/review/add',
  '/profile/work/:id/review/edit',
  '/resources',
  '/resources/add',
  '/resources/:id/edit',
  '/weekly-recap/:date/announcements',
  '/weekly-recap/:date/leaderboard',
  '/weekly-recap/:date/resources',
  '/weekly-recap/:date/reviews',
] as const;

export type Route = (typeof ROUTES)[number];

type RouteMap = {
  [Key in Route]: Key;
};

export const Route = ROUTES.reduce((result, route) => {
  Object.assign(result, { [route]: route });

  return result;
}, {} as RouteMap);
