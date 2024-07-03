import { type PropsWithChildren } from 'react';

import { cx, ProfilePicture, Text } from '@oyster/ui';

export const Leaderboard = () => {};

type LeaderboardItemProps = {
  firstName: string;
  isMe: boolean;
  label: React.ReactNode;
  lastName: string;
  position: number;
  profilePicture?: string;
};

Leaderboard.Item = function Item({
  firstName,
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

        <Text className="line-clamp-1" weight={isMe ? '600' : undefined}>
          {firstName} <span className="hidden sm:inline">{lastName}</span>
          <span className="inline sm:hidden">{lastName[0]}.</span>{' '}
          {isMe && <span>(You)</span>}
        </Text>
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
