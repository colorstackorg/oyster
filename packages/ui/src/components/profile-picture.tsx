import { match } from 'ts-pattern';

import { Text } from './text';
import { cx } from '../utils/cx';

type ProfilePictureProps = {
  initials?: string;
  size?: '32' | '48' | '64' | '96';
  src?: string;
};

// TODO: Add resilience to the component if image is not found.
export function ProfilePicture({
  initials = 'XX',
  size = '48',
  src,
}: ProfilePictureProps) {
  const containerClassName = match(size)
    .with('32', () => 'h-6 w-6 sm:h-8 sm:w-8')
    .with('48', () => 'h-10 w-10 sm:h-12 sm:w-12')
    .with('64', () => 'h-12 w-12 sm:h-16 sm:w-16')
    .with('96', () => 'h-20 w-20 sm:h-24 sm:w-24')
    .exhaustive();

  const className = cx(
    'h-full w-full rounded-full outline outline-1 -outline-offset-2 outline-white'
  );

  if (src) {
    return (
      <div className={containerClassName}>
        <img alt="Profile Picture" className={className} src={src} />
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <Text
        className={cx(
          className,
          'flex items-center justify-center bg-primary text-white'
        )}
        variant={match(size)
          .with('32', () => 'xs' as const)
          .with('48', '64', () => 'md' as const)
          .with('96', () => 'lg' as const)
          .exhaustive()}
      >
        {initials.toUpperCase()}
      </Text>
    </div>
  );
}
