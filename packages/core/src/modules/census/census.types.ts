import { z } from 'zod';

import { Student } from '@oyster/types';

// Use Cases

export const SubmitCensusResponseInput = z.object({
  email: Student.shape.email,
  memberId: Student.shape.id,
});

export type SubmitCensusResponseInput = z.infer<
  typeof SubmitCensusResponseInput
>;
