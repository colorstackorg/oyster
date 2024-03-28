import { json, LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import {
  Calendar,
  Gift,
  HelpCircle,
  Layers,
  MapPin,
  Target,
  User,
  Video,
} from 'react-feather';

import { Dashboard } from '@oyster/ui';

import { Route } from '../shared/constants';
import { countPendingApplications } from '../shared/core.server';
import { getSession, isAmbassador } from '../shared/session.server';

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
                  pathname={Route.APPLICATIONS}
                />
                <Dashboard.NavigationLink
                  icon={<Video />}
                  label="Onboarding Sessions"
                  pathname={Route.ONBOARDING_SESSIONS}
                />
              </>
            ) : (
              <>
                <Dashboard.NavigationLink
                  icon={<Layers />}
                  label={`Applications (${pendingApplications})`}
                  pathname={Route.APPLICATIONS}
                />
                <Dashboard.NavigationLink
                  icon={<User />}
                  label="Students"
                  pathname={Route.STUDENTS}
                />
                <Dashboard.NavigationLink
                  icon={<Gift />}
                  label="Gamification"
                  pathname={Route.ACTIVITIES}
                />
                <Dashboard.NavigationLink
                  icon={<Video />}
                  label="Onboarding Sessions"
                  pathname={Route.ONBOARDING_SESSIONS}
                />
                <Dashboard.NavigationLink
                  icon={<Calendar />}
                  label="Events"
                  pathname={Route.EVENTS}
                />
                <Dashboard.NavigationLink
                  icon={<HelpCircle />}
                  label="Surveys"
                  pathname={Route.SURVEYS}
                />
                <Dashboard.NavigationLink
                  icon={<MapPin />}
                  label="Schools"
                  pathname={Route.SCHOOLS}
                />
                <Dashboard.NavigationLink
                  icon={<Target />}
                  label="Bull"
                  pathname={Route.BULL}
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
