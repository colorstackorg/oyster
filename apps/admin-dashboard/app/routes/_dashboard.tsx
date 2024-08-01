import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import {
  BookOpen,
  Calendar,
  Gift,
  HelpCircle,
  Layers,
  MapPin,
  Target,
  ToggleRight,
  User,
  Video,
} from 'react-feather';

import { getAdmin } from '@oyster/core/admins';
import { AdminRole } from '@oyster/core/admins.types';
import { countPendingApplications } from '@oyster/core/applications';
import { Dashboard, Divider } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { getSession, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const [pendingApplications, admin] = await Promise.all([
    countPendingApplications(),

    getAdmin({
      select: ['admins.role'],
      where: { id: user(session) },
    }),
  ]);

  return json({
    pendingApplications,
    role: admin?.role, // This is tied to the "useRole" hook!
  });
}

export default function DashboardLayout() {
  const { pendingApplications, role } = useLoaderData<typeof loader>();

  return (
    <Dashboard>
      <Dashboard.Sidebar>
        <div className="mb-8 flex w-full items-center justify-between">
          <Dashboard.ColorStackLogo />
          <Dashboard.CloseMenuButton />
        </div>

        <Dashboard.Navigation>
          <Dashboard.NavigationList>
            {role === AdminRole.AMBASSADOR ? (
              <>
                <Dashboard.NavigationLink
                  icon={<Layers />}
                  label={`Applications (${pendingApplications})`}
                  pathname={Route['/applications']}
                />
                <Dashboard.NavigationLink
                  icon={<Video />}
                  label="Onboarding Sessions"
                  pathname={Route['/onboarding-sessions']}
                />
              </>
            ) : (
              <>
                <Dashboard.NavigationLink
                  icon={<Layers />}
                  label={`Applications (${pendingApplications})`}
                  pathname={Route['/applications']}
                />
                <Dashboard.NavigationLink
                  icon={<User />}
                  label="Members"
                  pathname={Route['/students']}
                />
                <Dashboard.NavigationLink
                  icon={<Calendar />}
                  label="Events"
                  pathname={Route['/events']}
                />
                <Dashboard.NavigationLink
                  icon={<BookOpen />}
                  label="Resume Books"
                  pathname={Route['/resume-books']}
                />
                <Dashboard.NavigationLink
                  icon={<Video />}
                  label="Onboarding Sessions"
                  pathname={Route['/onboarding-sessions']}
                />
                <Dashboard.NavigationLink
                  icon={<Gift />}
                  label="Gamification"
                  pathname={Route['/gamification/activities']}
                />
                <Dashboard.NavigationLink
                  icon={<User />}
                  label="Admins"
                  pathname={Route['/admins']}
                />
                <Dashboard.NavigationLink
                  icon={<MapPin />}
                  label="Schools"
                  pathname={Route['/schools']}
                />
                <Dashboard.NavigationLink
                  icon={<HelpCircle />}
                  label="Surveys"
                  pathname={Route['/surveys']}
                />

                {role === AdminRole.OWNER && (
                  <>
                    <Divider my="2" />

                    <Dashboard.NavigationLink
                      icon={<ToggleRight />}
                      label="Feature Flags"
                      pathname={Route['/feature-flags']}
                    />
                    <Dashboard.NavigationLink
                      icon={<Target />}
                      label="Bull"
                      pathname={Route['/bull']}
                    />
                  </>
                )}
              </>
            )}
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
