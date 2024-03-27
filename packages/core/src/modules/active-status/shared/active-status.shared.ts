import { z } from 'zod';

import { Student } from '@colorstack/types';

export const LeaderboardPosition = Student.pick({
  firstName: true,
  id: true,
  lastName: true,
  profilePicture: true,
}).extend({
  position: z.coerce.number().min(1),
  value: z.coerce.number().min(0),
});
