import { PropsWithChildren } from 'react';

import { Divider, Text } from '@colorstack/core-ui';

// Profile

export function ProfileColumn({ children }: PropsWithChildren) {
  return <div className="@container flex flex-col gap-12">{children}</div>;
}

export function ProfileDescription({ children }: PropsWithChildren) {
  return <Text color="gray-500">{children}</Text>;
}

export function ProfileHeader({ children }: PropsWithChildren) {
  return (
    <>
      <header className="flex justify-between gap-4">{children}</header>
      <Divider />
    </>
  );
}

export function ProfileSection({ children }: PropsWithChildren) {
  return <section className="flex flex-col gap-4">{children}</section>;
}

export function ProfileTitle({ children }: PropsWithChildren) {
  return <Text variant="xl">{children}</Text>;
}

// Experience

export function Experience({ children }: PropsWithChildren) {
  return (
    <li className="flex flex-col gap-1 border-b border-b-gray-200 py-4 last:border-none">
      {children}
    </li>
  );
}

export function ExperienceList({ children }: PropsWithChildren) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
}
