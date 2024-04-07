import { type Insertable } from 'kysely';

import { EducationLevel, Gender, Major } from '@oyster/types';

import { type DB } from '../shared/types';

// Constants

export const company1: Insertable<DB['companies']> = {
  crunchbaseId: '11',
  id: '1',
  name: 'Adobe',
};

export const company2: Insertable<DB['companies']> = {
  crunchbaseId: '22',
  id: '2',
  name: 'Google',
};

export const company3: Insertable<DB['companies']> = {
  crunchbaseId: '33',
  id: '3',
  name: 'Microsoft',
};

export const company4: Insertable<DB['companies']> = {
  crunchbaseId: '44',
  description: '...',
  domain: 'stripe.com',
  id: '44',
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
