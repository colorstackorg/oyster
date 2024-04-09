import { db } from '@oyster/db';

type GetInterviewOptions = {
  limit: number;
  page: number;
};

//order by

export async function listInterviewExperiences(options: GetInterviewOptions) {
  const { limit, page } = options;

  const data = await db
    .selectFrom('interviewExperiences')
    .selectAll()
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)
    .execute();

  return data;
}

listInterviewExperiences({ limit: 10, page: 1 });
