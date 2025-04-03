import { json, type LoaderFunctionArgs } from '@remix-run/node';
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
import { Dashboard, Divider } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const [resumeBook, isPeerHelpEnabled] = await Promise.all([
    getResumeBook({
      select: ['resumeBooks.id'],
      where: {
        hidden: false,
        status: 'active',
      },
    }),
    isFeatureFlagEnabled('peer_help'),
  ]);

  return json({
    isPeerHelpEnabled,
    resumeBook,
  });
}

export default function ProfileLayout() {
  const { isPeerHelpEnabled, resumeBook } = useLoaderData<typeof loader>();

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
            {isPeerHelpEnabled && (
              <Dashboard.NavigationLink
                icon={<Users />}
                label="Peer Help"
                isNew
                pathname={Route['/peer-help']}
                prefetch="intent"
              />
            )}
            <Dashboard.NavigationLink
              icon={<Award />}
              label="Points"
              pathname={Route['/points']}
              prefetch="intent"
            />
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
