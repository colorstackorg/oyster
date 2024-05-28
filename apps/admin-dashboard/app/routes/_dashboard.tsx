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

import { Dashboard, Divider } from '@oyster/ui';

import { countPendingApplications } from '@/admin-dashboard.server';
import { Route } from '@/shared/constants';
import { getSession, isAmbassador } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const pendingApplications = await countPendingApplications();

  return json({
    isAmbassador: isAmbassador(session),
    pendingApplications,
  });
}

export default function DashboardLayout() {
  const { isAmbassador, pendingApplications } = useLoaderData<typeof loader>();

  return (
    <Dashboard>
      <Dashboard.Sidebar>
        <div className="mb-8 flex w-full items-center justify-between">
          <Dashboard.ColorStackLogo />
          <Dashboard.CloseMenuButton />
        </div>

        <Dashboard.Navigation>
          <Dashboard.NavigationList>
            {isAmbassador ? (
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
                  label="Admins"
                  pathname={Route['/admins']}
                />
                <Dashboard.NavigationLink
                  icon={<User />}
                  label="Students"
                  pathname={Route['/students']}
                />
                <Dashboard.NavigationLink
                  icon={<Gift />}
                  label="Gamification"
                  pathname={Route['/gamification/activities']}
                />
                <Dashboard.NavigationLink
                  icon={<Video />}
                  label="Onboarding Sessions"
                  pathname={Route['/onboarding-sessions']}
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
                  icon={<HelpCircle />}
                  label="Surveys"
                  pathname={Route['/surveys']}
                />
                <Dashboard.NavigationLink
                  icon={<MapPin />}
                  label="Schools"
                  pathname={Route['/schools']}
                />

                <div className="my-2">
                  <Divider />
                </div>

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
