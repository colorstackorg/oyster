import { type Insertable } from 'kysely';

import { EducationLevel, Gender, Major } from '@oyster/types';

import { type DB } from '../shared/types';

// Constants

export const company1: Insertable<DB['companies']> = {
  id: '1',
  linkedinId: '11',
  name: 'Adobe',
};

export const company2: Insertable<DB['companies']> = {
  id: '2',
  linkedinId: '22',
  name: 'Google',
};

export const company3: Insertable<DB['companies']> = {
  id: '3',
  linkedinId: '33',
  name: 'Microsoft',
};

export const company4: Insertable<DB['companies']> = {
  description: '...',
  domain: 'stripe.com',
  id: '4',
  linkedinId: '44',
  imageUrl: '...',
  name: 'Stripe',
  stockSymbol: '...',
};

export const student1: Insertable<DB['students']> = {
  acceptedAt: '2024-01-01T00:00:00Z',
  educationLevel: EducationLevel.UNDERGRADUATE,
  email: '1@gmail.com',
  firstName: 'First',
  gender: Gender.CISGENDER_WOMAN,
  graduationYear: '2025',
  id: '1',
  lastName: 'Last',
  major: Major.COMPUTER_SCIENCE,
  otherDemographics: [],
  race: [],
};

export const student1Emails: Insertable<DB['studentEmails']>[] = [
  { email: student1.email, studentId: student1.id },
  { email: '1@outlook.com', studentId: student1.id },
];
