import { z } from 'zod';

import { type ExtractValue } from '../shared/types';

// Core

export const Entity = z.object({
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional(),
  id: z.string().trim().min(1),
  updatedAt: z.coerce.date(),
});

export type Entity = z.infer<typeof Entity>;

// General

export const Address = z.object({
  city: z.string().trim().min(1),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  state: z.string().trim().min(1),
  zip: z.string().trim().min(1),
});

export type Address = z.infer<typeof Address>;

export const Email = z
  .string()
  .trim()
  .min(1)
  .email()
  .transform((value) => {
    return value.toLowerCase();
  });

export type Email = z.infer<typeof Email>;

// Enums

export const Demographic = {
  DISABILITY: 'disability',
  FIRST_GENERATION: 'first_generation',
  LOW_INCOME: 'low_income',
} as const;

export type Demographic = ExtractValue<typeof Demographic>;

export const FORMATTED_DEMOGRAPHICS: Record<Demographic, string> = {
  disability: 'Has Mental or Physical Disability',
  first_generation: 'First-Generation College Student',
  low_income: 'Of Low-Income Background',
};

export const OtherDemographic = {
  NONE_OF_THE_ABOVE: 'none_of_the_above',
  PREFER_NOT_TO_SAY: 'prefer_not_to_say',
} as const;

export type OtherDemographic = ExtractValue<typeof OtherDemographic>;

export const FORMATTED_OTHER_DEMOGRAPHICS: Record<OtherDemographic, string> = {
  none_of_the_above: 'None of the Above',
  prefer_not_to_say: 'Prefer Not to Say',
};

export const EducationLevel = {
  BOOTCAMP: 'bootcamp',
  MASTERS: 'masters',
  OTHER: 'other',
  PHD: 'phd',
  UNDERGRADUATE: 'undergraduate',
} as const;

export const Gender = {
  CISGENDER_MAN: 'cisgender_man',
  CISGENDER_WOMAN: 'cisgender_woman',
  NON_BINARY: 'non_binary',
  PREFER_NOT_TO_SAY: 'prefer_not_to_say',
  TRANSGENDER_MAN: 'transgender_man',
  TRANSGENDER_WOMAN: 'transgender_woman',
} as const;

export type Gender = ExtractValue<typeof Gender>;

export const FORMATTED_GENDER: Record<Gender, string> = {
  cisgender_man: 'Cisgender Man',
  cisgender_woman: 'Cisgender Woman',
  non_binary: 'Gender Non-Conforming/Non-Binary',
  prefer_not_to_say: 'Prefer Not to Say',
  transgender_man: 'Transgender Man',
  transgender_woman: 'Transgender Woman',
};

export const Major = {
  ARTIFICAL_INTELLIGENCE: 'artificial_intelligence',
  CLOUD_COMPUTING: 'cloud_computing',
  COMPUTER_GAME_PROGRAMMING: 'computer_game_programming',
  COMPUTER_GRAPHICS: 'computer_graphics',
  COMPUTER_SCIENCE: 'computer_science',
  COMPUTER_SYSTEMS_NETWORKING: 'computer_systems_networking',
  CYBERSECURITY: 'cybersecurity',
  DATA_SCIENCE: 'data_science',
  ELECTRICAL_OR_COMPUTER_ENGINEERING: 'electrical_or_computer_engineering',
  INFORMATION_SCIENCE: 'information_science',
  INFORMATION_TECHNOLOGY: 'information_technology',
  HUMAN_CENTERED_TECHNOLOGY_DESIGN: 'human_centered_technology_design',
  INFORMATICS: 'informatics',
  OTHER: 'other',
  SOFTWARE_ENGINEERING: 'software_engineering',
} as const;

export type Major = ExtractValue<typeof Major>;

export const Race = {
  ASIAN: 'asian',
  BLACK: 'black',
  HISPANIC: 'hispanic',
  MIDDLE_EASTERN: 'middle_eastern',
  NATIVE_AMERICAN: 'native_american',
  OTHER: 'other',
  WHITE: 'white',
} as const;

export type Race = ExtractValue<typeof Race>;

export const FORMATTED_RACE: Record<Race, string> = {
  asian: 'Asian/Asian-American',
  black: 'Black/African-American/Afro-Latinx',
  hispanic: 'Hispanic/Latinx (Non-White)',
  middle_eastern: 'Middle Eastern',
  native_american: 'Native American/Alaska Native',
  other: 'Other',
  white: 'White (Non-Hispanic/Latinx)',
};
