import { Outlet } from 'react-router';

import { cx, Dashboard } from '@oyster/ui';

import { NavigationItem } from '@/shared/components/navigation';
import { AddOfferButton } from '@/shared/components/offer';
import { Route } from '@/shared/constants';

export default function OffersLayout() {
  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Offers 💰</Dashboard.Title>
        <OffersNavigation className="hidden sm:block" />
        <AddOfferButton />
      </Dashboard.Header>

      <OffersNavigation className="block sm:hidden" />

      <Outlet />
    </>
  );
}

type OffersNavigationProps = {
  className?: string;
};

function OffersNavigation({ className }: OffersNavigationProps) {
  return (
    <nav className={cx('mr-auto', className)}>
      <ul className="flex items-center gap-4">
        <NavigationItem to={Route['/offers/internships']}>
          Internships
        </NavigationItem>

        <NavigationItem to={Route['/offers/full-time']}>
          Full-Time
        </NavigationItem>
      </ul>
    </nav>
  );
}
