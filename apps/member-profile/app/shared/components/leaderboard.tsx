import { generatePath, Link } from '@remix-run/react';
import { type PropsWithChildren } from 'react';

import { cx, ProfilePicture, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';

export const Leaderboard = () => {};

type LeaderboardItemProps = {
  firstName: string;
  id: string;
  isMe: boolean;
  label: React.ReactNode;
  lastName: string;
  position: number;
  profilePicture?: string;
};

Leaderboard.Item = function Item({
  firstName,
  id,
  isMe,
  label,
  lastName,
  position,
  profilePicture,
}: LeaderboardItemProps) {
  const formatter = Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    notation: 'compact',
  });

  return (
    <li className="grid grid-cols-[3rem_4fr_2fr] items-center">
      <Text className="ml-auto mr-4" color="gray-500" weight="500">
        {formatter.format(position)}
      </Text>

      <div className="flex items-center gap-2">
        <ProfilePicture
          initials={firstName[0] + lastName[0]}
          src={profilePicture || undefined}
        />
        <Link
          className="[data-me='true']:font-semibold line-clamp-1 hover:text-primary hover:underline"
          data-me={!!isMe}
          to={generatePath(Route['/directory/:id'], { id })}
        >
          {firstName} <span className="hidden sm:inline">{lastName}</span>
          <span className="inline sm:hidden">{lastName[0]}.</span>{' '}
          {isMe && <span>(You)</span>}
        </Link>
      </div>

      {label}
    </li>
  );
};

Leaderboard.ItemLabel = function ItemLabel({ children }: PropsWithChildren) {
  return <Text className="text-right">{children}</Text>;
};

type ListProps = PropsWithChildren<{
  scroll?: boolean;
}>;

Leaderboard.List = function List({ children, scroll }: ListProps) {
  return (
    <ul
      className={cx(
        'flex flex-col gap-4',
        scroll && 'max-h-[800px] overflow-auto'
      )}
    >
      {children}
    </ul>
  );
};
