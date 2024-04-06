import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  generatePath,
  Link,
  NavLink,
  Outlet,
  useLoaderData,
} from '@remix-run/react';
import {
  BookOpen,
  Briefcase,
  Flag,
  Link as LinkIcon,
  Mail,
  Settings,
  Smile,
} from 'react-feather';

import { cx, Divider, ProfilePicture, Text } from '@oyster/ui';

import { Route } from '../shared/constants';
import { getMember } from '../shared/queries';
import { ensureUserAuthenticated, user } from '../shared/session.server';
import { formatHeadline, formatName } from '../shared/utils/format.utils';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const {
    graduationYear,
    firstName,
    lastName,
    headline,
    preferredName,
    school,
    ..._student
  } = await getMember(id, { school: true })
    .select([
      'firstName',
      'graduationYear',
      'headline',
      'lastName',
      'preferredName',
      'profilePicture',
      'students.id',
    ])
    .executeTakeFirstOrThrow();

  const student = {
    ..._student,
    headline: formatHeadline({ graduationYear, headline, school }),
    initials: firstName[0] + lastName[0],
    name: formatName({ firstName, lastName, preferredName }),
  };

  return json({
    student,
  });
}

export default function ProfileLayout() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <ProfileHeader />

      <div className="mx-auto flex flex-col gap-12 @2xl:flex-row @2xl:gap-16">
        <ProfileNavigation />

        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function ProfileHeader() {
  const { student } = useLoaderData<typeof loader>();

  return (
    <header className="mb-12 flex items-end gap-4">
      <Link to={generatePath(Route['/directory/:id'], { id: student.id })}>
        <ProfilePicture
          initials={student.initials}
          size="64"
          src={student.profilePicture || undefined}
        />
      </Link>

      <div>
        <Text variant="2xl">{student.name}</Text>
        <Text color="gray-500">{student.headline}</Text>
      </div>
    </header>
  );
}

function ProfileNavigation() {
  return (
    <nav>
      <ul className="flex flex-col gap-6">
        <ProfileNavigationItem
          icon={<Settings size={20} />}
          label="General"
          to={Route['/profile/general']}
        />
        <ProfileNavigationItem
          icon={<Mail size={20} />}
          label="Email Addresses"
          to={Route['/profile/emails']}
        />

        <Divider />

        <ProfileNavigationItem
          icon={<Flag size={20} />}
          label="Personal"
          to={Route['/profile/personal']}
        />
        <ProfileNavigationItem
          icon={<LinkIcon size={20} />}
          label="Socials"
          to={Route['/profile/socials']}
        />
        <ProfileNavigationItem
          icon={<Smile size={20} />}
          label="Icebreakers"
          to={Route['/profile/icebreakers']}
        />

        <Divider />

        <ProfileNavigationItem
          icon={<Briefcase size={20} />}
          label="Work History"
          to={Route['/profile/work']}
        />
        <ProfileNavigationItem
          icon={<BookOpen size={20} />}
          label="Education History"
          to={Route['/profile/education']}
        />
      </ul>
    </nav>
  );
}

type ProfileNavigationItemProps = {
  icon: React.ReactNode;
  label: string;
  to: string;
};

function ProfileNavigationItem({
  icon,
  label,
  to,
}: ProfileNavigationItemProps) {
  return (
    <li>
      <NavLink
        className={({ isActive }) => {
          return cx(
            'flex items-center gap-2',
            'hover:text-primary',
            isActive ? 'text-primary' : 'text-black'
          );
        }}
        to={to}
      >
        {icon} {label}
      </NavLink>
    </li>
  );
}
