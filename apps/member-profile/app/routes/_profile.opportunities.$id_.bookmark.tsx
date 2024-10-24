import { type ActionFunctionArgs, json } from '@remix-run/node';
import { generatePath, Form as RemixForm } from '@remix-run/react';
import { type PropsWithChildren } from 'react';
import { Bookmark } from 'react-feather';

import { bookmarkOpportunity } from '@oyster/core/opportunities';
import { cx, IconButton } from '@oyster/ui';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = params.id as string;

  await bookmarkOpportunity(id, user(session));

  return json({});
}

type BookmarkProps = {
  bookmarked: boolean;
  bookmarks: number | string;
  id: string;
};

export function BookmarkForm({
  children,
  id,
}: PropsWithChildren<Pick<BookmarkProps, 'id'>>) {
  return (
    <RemixForm
      action={generatePath('/opportunities/:id/bookmark', { id })}
      method="post"
      navigate={false}
    >
      <input type="hidden" name="opportunityId" value={id} />
      {children}
    </RemixForm>
  );
}

export function BookmarkButton({
  bookmarked,
  className,
}: Pick<BookmarkProps, 'bookmarked'> & { className?: string }) {
  return (
    <IconButton
      className={cx(
        'text-gray-300 hover:bg-gray-100 hover:text-amber-400 data-[bookmarked=true]:text-amber-400',
        className
      )}
      data-bookmarked={!!bookmarked}
      icon={
        <Bookmark
          color="currentColor"
          fill={bookmarked ? 'currentColor' : 'none'}
          size={20}
        />
      }
      name="action"
      type="submit"
      value="bookmark"
    />
  );
}
