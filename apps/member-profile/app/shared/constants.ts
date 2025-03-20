const ROUTES = [
  '/apply',
  '/apply/thank-you',
  '/ask-ai',
  '/companies',
  '/companies/reviews/add',
  '/companies/:id',
  '/companies/:id/employees',
  '/companies/:id/reviews',
  '/directory',
  '/directory/join',
  '/directory/join/1',
  '/directory/join/2',
  '/directory/join/3',
  '/directory/join/4',
  '/directory/join/finish',
  '/directory/:id',
  '/events',
  '/events/:id/attendees',
  '/events/:id/register',
  '/events/:id/registrations',
  '/home',
  '/home/activation',
  '/login',
  '/login/otp/send',
  '/login/otp/verify',
  '/offers',
  '/offers/full-time',
  '/offers/full-time/add',
  '/offers/full-time/:id',
  '/offers/full-time/:id/edit',
  '/offers/full-time/:id/delete',
  '/offers/internships',
  '/offers/internships/add',
  '/offers/internships/:id',
  '/offers/internships/:id/edit',
  '/offers/internships/:id/delete',
  '/opportunities',
  '/opportunities/:id',
  '/opportunities/:id/delete',
  '/opportunities/:id/edit',
  '/opportunities/:id/refine',
  '/peer-help',
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
  '/profile/referrals',
  '/profile/referrals/add',
  '/profile/socials',
  '/profile/work',
  '/profile/work/add',
  '/profile/work/:id/delete',
  '/profile/work/:id/edit',
  '/profile/work/:id/review/add',
  '/profile/work/:id/review/edit',
  '/recap/:date/announcements',
  '/recap/:date/leaderboard',
  '/recap/:date/members',
  '/recap/:date/resources',
  '/recap/:date/reviews',
  '/resources',
  '/resources/add',
  '/resources/:id/delete',
  '/resources/:id/edit',
  '/resume/review',
  '/resume-books/:id',
] as const;

export type Route = (typeof ROUTES)[number];

type RouteMap = {
  [Key in Route]: Key;
};

export const Route = ROUTES.reduce((result, route) => {
  Object.assign(result, { [route]: route });

  return result;
}, {} as RouteMap);
