const ROUTES = [
  '/',
  '/admins',
  '/applications',
  '/applications/:id',
  '/applications/:id/accept',
  '/applications/:id/email',
  '/bull',
  '/bull/:queue',
  '/bull/:queue/jobs',
  '/bull/:queue/jobs/add',
  '/bull/:queue/jobs/:id',
  '/bull/:queue/repeatables',
  '/bull/:queue/repeatables/add',
  '/events',
  '/events/create',
  '/events/sync-airmeet-event',
  '/events/:id/add-recording',
  '/events/:id/check-in',
  '/events/:id/import',
  '/feature-flags',
  '/feature-flags/create',
  '/feature-flags/:id/delete',
  '/feature-flags/:id/edit',
  '/gamification/activities',
  '/gamification/activities/add',
  '/gamification/activities/:id/archive',
  '/gamification/activities/:id/edit',
  '/login',
  '/login/otp/send',
  '/login/otp/verify',
  '/onboarding-sessions',
  '/onboarding-sessions/upload',
  '/onboarding-sessions/:id/add-attendees',
  '/programs/create',
  '/resources/create',
  '/resume-books',
  '/resume-books/create',
  '/resume-books/:id/edit',
  '/schools',
  '/schools/create',
  '/schools/:id/edit',
  '/students',
  '/students/import/programs',
  '/students/import/resources',
  '/students/import/scholarships',
  '/students/:id/activate',
  '/students/:id/email',
  '/students/:id/points/grant',
  '/students/:id/remove',
  '/surveys',
  '/surveys/create',
  '/surveys/:id/import',
] as const;

export type Route = (typeof ROUTES)[number];

type RouteMap = {
  [Key in Route]: Key;
};

export const Route = ROUTES.reduce((result, route) => {
  Object.assign(result, { [route]: route });

  return result;
}, {} as RouteMap);
