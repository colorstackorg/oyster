import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { generatePath, Outlet, useLoaderData } from '@remix-run/react';
import {
  Award,
  Book,
  BookOpen,
  Briefcase,
  Calendar,
  Folder,
  Home,
  User,
} from 'react-feather';

import { getResumeBook } from '@oyster/core/resume-books';
import { Dashboard, Divider } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const resumeBook = await getResumeBook({
    select: ['resumeBooks.id'],
    where: {
      hidden: false,
      status: 'active',
    },
  });

  return json({
    resumeBook,
  });
}

export default function ProfileLayout() {
  const { resumeBook } = useLoaderData<typeof loader>();

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
                  isNew
                  label="Resume Book"
                  pathname={generatePath(Route['/resume-books/:id'], {
                    id: resumeBook.id,
                  })}
                  prefetch="intent"
                />

                <Divider my="4" />
              </>
            )}
            <Dashboard.NavigationLink
              icon={<Home />}
              label="Home"
              pathname={Route['/home']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<Folder />}
              label="Directory"
              pathname={Route['/directory']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<BookOpen />}
              label="Resources"
              pathname={Route['/resources']}
              prefetch="intent"
            />
            <Dashboard.NavigationLink
              icon={<Briefcase />}
              label="Companies"
              pathname={Route['/companies']}
              prefetch="intent"
            />
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
