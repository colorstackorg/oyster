import { Outlet } from '@remix-run/react';

import { Divider, Text } from '@oyster/ui';

import { NavigationItem } from '@/shared/components/navigation';

export default function CompensationLayout() {
  return (
    <section className="flex w-full flex-col gap-4 @container">
      <header>
        <Text variant="2xl">Compensation 💰</Text>
      </header>

      <nav>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          <NavigationItem to="/compensation/full-time-offers">
            Full-Time Offers
          </NavigationItem>

          <NavigationItem to="/compensation/internship-offers">
            Internship Offers
          </NavigationItem>
        </ul>
      </nav>

      <Divider my="2" />
      <Outlet />
    </section>
  );
}
