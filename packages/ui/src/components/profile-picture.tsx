import { match } from 'ts-pattern';

import { cx } from '../utils/cx';
import { Text } from './text';

type ProfilePictureProps = {
  initials?: string;
  size?: '32' | '48' | '64' | '96';
  shape?: 'circle';
  src?: string;
};

// TODO: Add resilience to the component if image is not found.
export function ProfilePicture({
  initials = 'XX',
  shape = 'circle',
  size = '48',
  src,
}: ProfilePictureProps) {
  const className = cx(
    'outline outline-1 -outline-offset-2 outline-white',

    match(shape)
      .with('circle', () => 'rounded-full')
      .exhaustive(),

    match(size)
      .with('32', () => 'h-6 w-6 sm:h-8 sm:w-8')
      .with('48', () => 'h-10 w-10 sm:h-12 sm:w-12')
      .with('64', () => 'h-12 w-12 sm:h-16 sm:w-16')
      .with('96', () => 'h-20 w-20 text-lg sm:h-24 sm:w-24 sm:text-xl')
      .exhaustive()
  );

  if (src) {
    return <img alt="Profile Picture" className={className} src={src} />;
  }

  return (
    <Text
      className={cx(
        className,
        'flex items-center justify-center bg-primary text-white'
      )}
    >
      {initials.toUpperCase()}
    </Text>
  );
}
