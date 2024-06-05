import {
  Link,
  type LinkProps,
  NavLink,
  Form as RemixForm,
  useSubmit,
} from '@remix-run/react';
import React, {
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { LogOut, Menu, X } from 'react-feather';
import { z } from 'zod';

import { IconButton } from './icon-button';
import { SearchBar, type SearchBarProps } from './search-bar';
import { Text } from './text';
import { useDelayedValue } from '../hooks/use-delayed-value';
import { useSearchParams } from '../hooks/use-search-params';
import { cx } from '../utils/cx';

type DashboardContextValue = {
  open: boolean;
  setOpen(open: boolean): void;
};

const DashboardContext = React.createContext<DashboardContextValue>({
  open: false,
  setOpen: (_: boolean) => {},
});

export const Dashboard = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <DashboardContext.Provider value={{ open, setOpen }}>
      <main>{children}</main>
    </DashboardContext.Provider>
  );
};

Dashboard.CloseMenuButton = function CloseMenuButton() {
  const { setOpen } = useContext(DashboardContext);

  function onClick() {
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <IconButton
        backgroundColorOnHover="gray-100"
        icon={<X />}
        onClick={onClick}
        shape="circle"
      />
    </div>
  );
};

Dashboard.ColorStackLogo = function ColorStackLogo() {
  return (
    <Link to="/">
      <img
        alt="ColorStack Wordmark"
        height={21}
        src="/images/colorstack-wordmark.png"
        width={140}
      />
    </Link>
  );
};

const itemClassName = cx(
  'box-border flex w-full items-center gap-3 rounded-2xl p-3',
  'hover:text-primary',
  'aria-[current="page"]:bg-primary aria-[current="page"]:text-white aria-[current="page"]:hover:text-white'
);

Dashboard.LogoutForm = function LogoutForm() {
  return (
    <RemixForm action="/logout" className="mt-auto w-full" method="post">
      <button className={cx(itemClassName, 'hover:text-primary')} type="submit">
        <LogOut />
        Log Out
      </button>
    </RemixForm>
  );
};

Dashboard.MenuButton = function MenuButton() {
  const { setOpen } = useContext(DashboardContext);

  function onClick() {
    setOpen(true);
  }

  return (
    <IconButton
      backgroundColorOnHover="gray-100"
      className="flex h-fit w-fit md:hidden"
      icon={<Menu />}
      onClick={onClick}
      shape="circle"
    />
  );
};

Dashboard.Navigation = function Navigation({ children }: PropsWithChildren) {
  return <nav className="w-full">{children}</nav>;
};

type DashboardNavigationLinkProps = {
  icon: JSX.Element;
  label: string;
  pathname: string;
  prefetch?: LinkProps['prefetch'];
};

Dashboard.NavigationLink = function NavigationLink({
  icon,
  label,
  pathname,
  prefetch,
}: DashboardNavigationLinkProps) {
  const { setOpen } = useContext(DashboardContext);

  function onClick() {
    setOpen(false);
  }

  return (
    <li>
      <NavLink
        className={itemClassName}
        onClick={onClick}
        prefetch={prefetch}
        to={pathname}
      >
        {icon} {label}
      </NavLink>
    </li>
  );
};

Dashboard.NavigationList = function NavigationList({
  children,
}: PropsWithChildren) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
};

Dashboard.Page = function Page({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cx(
        'box-border flex flex-col gap-4 @container',
        'p-4 pb-24',
        'md:ml-[270px] md:p-6 md:pb-16',
        className
      )}
    >
      {children}
    </section>
  );
};

const DashboardSearchParams = z.object({
  search: z.string().optional().catch(''),
});

Dashboard.SearchForm = function SearchForm({
  children,
  ...rest
}: PropsWithChildren<Pick<SearchBarProps, 'placeholder'>>) {
  const [searchParams] = useSearchParams(DashboardSearchParams);

  const [search, setSearch] = useState<string | undefined>(undefined);

  const delayedSearch = useDelayedValue(search, 250);

  const submit = useSubmit();

  useEffect(() => {
    if (delayedSearch === undefined) {
      return;
    }

    submit({ search: delayedSearch });
  }, [delayedSearch]);

  return (
    <RemixForm className="w-full sm:w-auto" method="get">
      <SearchBar
        defaultValue={searchParams.search}
        name="search"
        onChange={(e) => setSearch(e.currentTarget.value)}
        {...rest}
      />
      {children}
    </RemixForm>
  );
};

Dashboard.Sidebar = function Sidebar({ children }: PropsWithChildren) {
  const { open } = useContext(DashboardContext);

  return (
    <aside
      className={cx(
        'fixed left-0 h-screen w-[270px] flex-col items-start gap-4 overflow-auto border-r border-r-gray-200 p-6',
        'md:flex',
        open
          ? 'z-10 flex w-[calc(100%-4rem)] animate-[slide-from-left_300ms] bg-white md:hidden'
          : 'hidden'
      )}
    >
      {children}
    </aside>
  );
};

Dashboard.Subheader = function Subheader({ children }: PropsWithChildren) {
  return <div className="flex justify-between gap-4">{children}</div>;
};

Dashboard.Title = function Title({ children }: PropsWithChildren) {
  return <Text variant="2xl">{children}</Text>;
};
