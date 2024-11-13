import { Outlet } from '@remix-run/react';

import { Dashboard } from '@oyster/ui';

import { NavigationItem } from '@/shared/components/navigation';
import { Route } from '@/shared/constants';

export default function CompensationLayout() {
  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Salaries 💰</Dashboard.Title>

        <nav className="mr-auto">
          <ul className="flex gap-4">
            <NavigationItem to={Route['/compensation/full-time']}>
              Full-Time
            </NavigationItem>

            <NavigationItem to={Route['/compensation/internships']}>
              Internships
            </NavigationItem>
          </ul>
        </nav>
      </Dashboard.Header>

      <Outlet />
    </>
  );
}
