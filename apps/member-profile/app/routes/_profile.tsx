import {
  type LoaderFunctionArgs,
  redirect,
  type Session,
} from '@remix-run/node';
import { generatePath, Outlet, useLoaderData } from '@remix-run/react';
import {
  Award,
  Book,
  BookOpen,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  Home,
  Layers,
  MessageCircle,
  User,
  Users,
} from 'react-feather';

import { isFeatureFlagEnabled } from '@oyster/core/member-profile/server';
import { getResumeBook } from '@oyster/core/resume-books';
import { db } from '@oyster/db';
import { Dashboard, Divider } from '@oyster/ui';

import { ONBOARDING_FLOW_LAUNCH_DATE, Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  // We do this check in the "parent" loader despite that other child loaders
  // will run in parallel. The reason this is fine is because technically the
  // user is already authenticated so loading the data isn't a security issue,
  // we just don't want to allow them to access the profile UI until they've
  // completed the onboarding process.
  await ensureUserOnboarded(session);

  const [resumeBook, isPointsPageEnabled] = await Promise.all([
    getResumeBook({
      select: ['resumeBooks.id'],
      where: {
        hidden: false,
        status: 'active',
      },
    }),
    isFeatureFlagEnabled('points_page'),
  ]);

  return {
    isPointsPageEnabled,
    resumeBook,
  };
}

// TODO: We should probably cache this somehow...don't necessarily want to hit
// the DB for every single request.
async function ensureUserOnboarded(session: Session) {
  const member = await db
    .selectFrom('students')
    .select(['acceptedAt', 'onboardedAt'])
    .where('id', '=', user(session))
    .executeTakeFirst();

  // This should never happen, that means the user is logged in with a bad ID.
  if (!member) {
    throw new Response(null, {
      status: 404,
      statusText: 'Something went wrong. Please contact support.',
    });
  }

  if (member.acceptedAt >= ONBOARDING_FLOW_LAUNCH_DATE && !member.onboardedAt) {
    throw redirect(Route['/onboarding']);
  }
}

// NOTE: IF YOU UPDATE SOMETHING HERE, YOU SHOULD PROBABLY UPDATE THE "FIRST
// TIME MODAL" TOO.

export default function ProfileLayout() {
  const { isPointsPageEnabled, resumeBook } = useLoaderData<typeof loader>();

  return (
    <Dashboard>
      <Dashboard.Sidebar>
        <div className="mb-8 flex w-full items-center justify-between">
          <Dashboard.ColorStackLogo />
          <Dashboard.CloseMenuButton />
        </div>

        <Dashboard.Navigation>
          <Dashboard.NavigationList>
            {!!resumeBook && (
              <>
                <Dashboard.NavigationLink
                  icon={<Book />}
                  label="Resume Book"
                  pathname={generatePath(Route['/resume-books/:id'], {
                    id: resumeBook.id,
                  })}
                  prefetch="intent"
                />

                <Divider my="2" />
              </>
            )}
            <Dashboard.NavigationLink
              icon={<Home />}
              label="Home"
              pathname={Route['/home']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<Users />}
              label="Directory"
              pathname={Route['/directory']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<Layers />}
              label="Opportunities"
              pathname={Route['/opportunities']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<DollarSign />}
              label="Offers"
              pathname={Route['/offers']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<Briefcase />}
              label="Companies"
              pathname={Route['/companies']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<BookOpen />}
              label="Resources"
              pathname={Route['/resources']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<Users />}
              label="Peer Help"
              isNew
              pathname={Route['/peer-help']}
              prefetch="intent"
            />
            {isPointsPageEnabled && (
              <Dashboard.NavigationLink
                icon={<Award />}
                label="Points"
                pathname={Route['/points']}
                prefetch="intent"
              />
            )}
            <Dashboard.NavigationLink
              icon={<Calendar />}
              label="Events"
              pathname={Route['/events']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<MessageCircle />}
              label="Ask AI"
              pathname={Route['/ask-ai']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<FileText />}
              label="Resume Review"
              pathname={Route['/resume/review']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<User />}
              label="Profile"
              pathname={Route['/profile']}
            />
          </Dashboard.NavigationList>
        </Dashboard.Navigation>

        <Dashboard.LogoutForm />
      </Dashboard.Sidebar>

      <Dashboard.Page>
        <Dashboard.MenuButton />
        <Outlet />
      </Dashboard.Page>
    </Dashboard>
  );
}
