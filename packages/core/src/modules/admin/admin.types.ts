import { z } from 'zod';

import { Email, type ExtractValue } from '@oyster/types';

// Enums

export const AdminRole = {
  ADMIN: 'admin',
  AMBASSADOR: 'ambassador',
  OWNER: 'owner',
} as const;

export type AdminRole = ExtractValue<typeof AdminRole>;

// Use Cases

export const AddAdminInput = z.object({
  actor: z.string().trim().min(1),
  email: Email,
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  role: z.nativeEnum(AdminRole),
});

export type AddAdminInput = z.infer<typeof AddAdminInput>;
