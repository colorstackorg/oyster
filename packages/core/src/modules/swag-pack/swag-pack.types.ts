import { z } from 'zod';

import { Address, Student } from '@oyster/types';

export const ClaimSwagPackInput = z.object({
  addressCity: Address.shape.city,
  addressLine1: Address.shape.line1,
  addressLine2: Address.shape.line2,
  addressState: Address.shape.state,
  addressZip: Address.shape.zip,
  studentId: Student.shape.id,
});

export type ClaimSwagPackInput = z.infer<typeof ClaimSwagPackInput>;
