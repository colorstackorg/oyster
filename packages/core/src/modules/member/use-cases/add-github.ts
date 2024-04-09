import { db } from '@/infrastructure/database';
import { type AddGithubInput } from '@/modules/member/member.types';

export async function addGithub(id: string, input: AddGithubInput) {
  await db
    .updateTable('students')
    .set({ githubId: input.githubId, githubUrl: input.githubUrl })
    .where('id', '=', id)
    .execute();
}
