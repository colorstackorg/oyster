import { Outlet, useLocation } from '@remix-run/react';

import { Dashboard } from '@oyster/ui';

import { NavigationItem } from '@/shared/components/navigation';
import { AddOfferButton } from '@/shared/components/offer';
import { Route } from '@/shared/constants';

export default function OffersLayout() {
  const location = useLocation();

  const addPathname = location.pathname.includes('/internships')
    ? Route['/offers/internships/add']
    : Route['/offers/full-time/add'];

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Offers 💰</Dashboard.Title>

        <nav className="mr-auto">
          <ul className="flex items-center gap-4">
            <NavigationItem to={Route['/offers/internships']}>
              Internships
            </NavigationItem>

            <NavigationItem to={Route['/offers/full-time']}>
              Full-Time
            </NavigationItem>
          </ul>
        </nav>

        <AddOfferButton pathname={addPathname} />
      </Dashboard.Header>

      <Outlet />
    </>
  );
}
