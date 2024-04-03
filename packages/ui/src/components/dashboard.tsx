import { Link, NavLink, Form as RemixForm, useSubmit } from '@remix-run/react';
import React, {
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { LogOut, Menu, X } from 'react-feather';
import { z } from 'zod';

import { useDelayedValue } from '../hooks/use-delayed-value';
import { useSearchParams } from '../hooks/use-search-params';
import { cx } from '../utils/cx';
import { IconButton } from './icon-button';
import { SearchBar, SearchBarProps } from './search-bar';
import { Text } from './text';

type DashboardContextValue = {
  open: boolean;
  setOpen(open: boolean): void;
};

const DashboardContext = React.createContext<DashboardContextValue>({
  open: false,
  setOpen: (open: boolean) => {},
});

export const Dashboard = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <DashboardContext.Provider value={{ open, setOpen }}>
      <main className="fixed flex h-screen w-screen">{children}</main>
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
};

Dashboard.NavigationLink = function NavigationLink({
  icon,
  label,
  pathname,
}: DashboardNavigationLinkProps) {
  const { setOpen } = useContext(DashboardContext);

  function onClick() {
    setOpen(false);
  }

  return (
    <li>
      <NavLink className={itemClassName} onClick={onClick} to={pathname}>
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

Dashboard.Page = function Page({ children }: PropsWithChildren) {
  return (
    <section
      className={cx(
        'box-border flex w-full flex-col gap-4 overflow-scroll p-4 pb-24 @container',
        'md:p-6 md:pb-16'
      )}
    >
      {children}
    </section>
  );
};

const DashboardSearchParams = z.object({
  search: z.string().optional().catch(''),
});

type DashboardSearchFormProps = Pick<SearchBarProps, 'placeholder'>;

Dashboard.SearchForm = function SearchForm({
  ...rest
}: DashboardSearchFormProps) {
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
    </RemixForm>
  );
};

Dashboard.Sidebar = function Sidebar({ children }: PropsWithChildren) {
  const { open } = useContext(DashboardContext);

  return (
    <aside
      className={cx(
        'min-h-screen w-[270px] min-w-[270px] flex-col items-start gap-4 overflow-scroll border-r border-r-gray-200 p-6',
        'md:flex',
        open
          ? 'fixed left-0 z-10 flex w-[calc(100%-4rem)] animate-[slide-from-left_300ms] bg-white md:hidden'
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
