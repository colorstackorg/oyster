import { Outlet } from '@remix-run/react';

import { Dashboard } from '@oyster/ui';

import { NavigationItem } from '@/shared/components/navigation';
import { Route } from '@/shared/constants';

export default function OffersLayout() {
  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Offers 💰</Dashboard.Title>

        <nav className="mr-auto">
          <ul className="flex items-center gap-4">
            <NavigationItem to={Route['/offers/full-time']}>
              Full-Time
            </NavigationItem>

            <NavigationItem to={Route['/offers/internships']}>
              Internships
            </NavigationItem>
          </ul>
        </nav>
      </Dashboard.Header>

      <Outlet />
    </>
  );
}
