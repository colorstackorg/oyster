import { type ActionFunctionArgs, json } from '@remix-run/node';
import { generatePath, Form as RemixForm } from '@remix-run/react';
import { type PropsWithChildren } from 'react';
import { Bookmark } from 'react-feather';

import { bookmarkOpportunity } from '@oyster/core/opportunities';
import { cx, IconButton } from '@oyster/ui';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await bookmarkOpportunity({
    memberId: user(session),
    opportunityId: params.id as string,
  });

  return json({});
}

// Components

type BookmarkButtonProps = {
  bookmarked: boolean;
  className?: string;
};

export function BookmarkButton({ bookmarked, className }: BookmarkButtonProps) {
  return (
    <IconButton
      className={cx(
        bookmarked ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400',
        className
      )}
      icon={<Bookmark fill={bookmarked ? 'currentColor' : 'none'} size={20} />}
      backgroundColorOnHover="gray-100"
      name="action"
      type="submit"
      value="bookmark"
    />
  );
}

type BookmarkFormProps = PropsWithChildren<{
  opportunityId: string;
}>;

export function BookmarkForm({ children, opportunityId }: BookmarkFormProps) {
  return (
    <RemixForm
      action={generatePath('/opportunities/:id/bookmark', {
        id: opportunityId,
      })}
      method="post"
      navigate={false}
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {children}
    </RemixForm>
  );
}
