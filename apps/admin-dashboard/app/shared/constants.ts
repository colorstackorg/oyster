import { type ExtractValue } from '@oyster/types';

export const Route = {
  HOME: '/',

  // Applications

  APPLICATION: '/applications/:id',
  APPLICATIONS: '/applications',
  UPDATE_APPLICATION_EMAIL: '/applications/:id/email',

  // Bull

  '/bull/:queue/jobs': '/bull/:queue/jobs',
  '/bull/:queue/jobs/add': '/bull/:queue/jobs/add',
  ADD_BULL_REPEATABLE: '/bull/:queue/repeatables/add',
  BULL: '/bull',
  BULL_JOB: '/bull/:queue/jobs/:id',
  BULL_QUEUE: '/bull/:queue',
  BULL_REPEATABLES: '/bull/:queue/repeatables',

  // Events

  CREATE_EVENT: '/events/create',
  EVENTS: '/events',
  IMPORT_EVENT_ATTENDEES: '/events/:id/import',
  ADD_EVENT_LINK: '/events/:id/add',

  // Gamification

  ACTIVITIES: '/gamification/activities',
  ADD_ACTIVITY: '/gamification/activities/add',
  ARCHIVE_ACTIVITY: '/gamification/activities/:id/archive',
  EDIT_ACTIVITY: '/gamification/activities/:id/edit',

  // Login

  '/login': '/login',
  '/login/otp/send': '/login/otp/send',
  '/login/otp/verify': '/login/otp/verify',

  // Onboarding Sessions

  ADD_ONBOARDING_SESSION_ATTENDEES: '/onboarding-sessions/:id/add-attendees',
  ONBOARDING_SESSIONS: '/onboarding-sessions',
  UPLOAD_ONBOARDING_SESSIONS: '/onboarding-sessions/upload',

  // Schools

  CREATE_SCHOOL: '/schools/create',
  EDIT_SCHOOL: '/schools/:id/edit',
  SCHOOLS: '/schools',

  // Students

  ACTIVATE_STUDENT: '/students/:id/activate',
  GRANT_POINTS: '/students/:id/points/grant',
  REMOVE_STUDENT: '/students/:id/remove',
  STUDENTS: '/students',
  STUDENTS_IMPORT_PROGRAMS: '/students/import/programs',
  STUDENTS_IMPORT_RESOURCES: '/students/import/resources',
  STUDENTS_IMPORT_SCHOLARSHIPS: '/students/import/scholarships',
  UPDATE_STUDENT_EMAIL: '/students/:id/email',

  // Surveys

  CREATE_SURVEY: '/surveys/create',
  IMPORT_SURVEY_RESPONSES: '/surveys/:id/import',
  SURVEYS: '/surveys',

  // Others

  PROGRAMS_CREATE: '/programs/create',
  RESOURCES_CREATE: '/resources/create',
} as const;

export type Route = ExtractValue<typeof Route>;
