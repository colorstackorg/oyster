import { generatePath, redirect } from 'react-router';

import { getResumeBook } from '@oyster/core/resume-books';

import { Route } from '@/shared/constants';

export async function loader() {
  const resumeBook = await getResumeBook({
    select: ['resumeBooks.id'],
    where: {
      hidden: false,
      status: 'active',
    },
  });

  return resumeBook
    ? redirect(generatePath(Route['/resume-books/:id'], { id: resumeBook.id }))
    : redirect(Route['/home']);
}
