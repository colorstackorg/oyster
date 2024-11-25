import { type ActionFunctionArgs, json } from '@remix-run/node';
import { type Fetcher, generatePath, useFetcher } from '@remix-run/react';
import { createContext, type PropsWithChildren, useContext } from 'react';
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

const FetcherContext = createContext<Fetcher | null>(null);

type BookmarkButtonProps = {
  bookmarked: boolean;
  className?: string;
};

export function BookmarkButton({ bookmarked, className }: BookmarkButtonProps) {
  const fetcher = useContext(FetcherContext);

  if (fetcher?.formData) {
    bookmarked = fetcher.formData.get('bookmarked') === '1';
  }

  return (
    <IconButton
      className={cx(
        bookmarked ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400',
        className
      )}
      icon={<Bookmark fill={bookmarked ? 'currentColor' : 'none'} size={20} />}
      backgroundColorOnHover="gray-100"
      name="bookmarked"
      type="submit"
      value={bookmarked ? '0' : '1'}
    />
  );
}

type BookmarkFormProps = PropsWithChildren<{
  opportunityId: string;
}>;

export function BookmarkForm({ children, opportunityId }: BookmarkFormProps) {
  const fetcher = useFetcher();

  return (
    <FetcherContext.Provider value={fetcher}>
      <fetcher.Form
        action={generatePath('/opportunities/:id/bookmark', {
          id: opportunityId,
        })}
        method="post"
      >
        <input type="hidden" name="opportunityId" value={opportunityId} />
        {children}
      </fetcher.Form>
    </FetcherContext.Provider>
  );
}
