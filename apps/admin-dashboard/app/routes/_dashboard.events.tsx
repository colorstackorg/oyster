import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Menu, Plus, Upload } from 'react-feather';
import { generatePath } from 'react-router';

import { type Event } from '@oyster/types';
import {
  Dashboard,
  Dropdown,
  IconButton,
  Pagination,
  Pill,
  Table,
  type TableColumnProps,
  useSearchParams,
} from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { Route } from '../shared/constants';
import { getTimezone } from '../shared/cookies.server';
import { listEvents } from '../shared/core.server';
import { ListSearchParams } from '../shared/core.ui';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const timezone = getTimezone(request);

  const searchParams = ListSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    timezone,
  });

  const { events: _events, totalEvents } = await listEvents(searchParams, [
    'events.description',
    'events.endTime',
    'events.id',
    'events.name',
    'events.startTime',
    'events.type',
    (eb) => {
      return eb
        .selectFrom('eventAttendees')
        .select(eb.fn.countAll<string>().as('count'))
        .whereRef('eventAttendees.eventId', '=', 'events.id')
        .as('attendees');
    },
  ]);

  const events = _events.map((event) => {
    return {
      ...event,
      date: dayjs(event.startTime).tz(timezone).format('MM/DD/YY'),
      endTime: dayjs(event.endTime).tz(timezone).format('h:mm A'),
      startTime: dayjs(event.startTime).tz(timezone).format('h:mm A'),
    };
  });

  return json({
    events,
    totalEvents,
  });
}

export default function EventsPage() {
  return (
    <>
      <Dashboard.Title>Events</Dashboard.Title>

      <Dashboard.Subheader>
        <Dashboard.SearchForm placeholder="Search by name..." />

        <div className="ml-auto flex items-center gap-2">
          <EventsMenuDropdown />
        </div>
      </Dashboard.Subheader>

      <EventsTable />
      <EventsPagination />
      <Outlet />
    </>
  );
}

function EventsMenuDropdown() {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onClick() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      <IconButton
        backgroundColor="gray-100"
        backgroundColorOnHover="gray-200"
        icon={<Menu />}
        onClick={onClick}
        shape="square"
      />

      {open && (
        <Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link to={Route.CREATE_EVENT}>
                <Plus /> Create Event
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}

type EventInView = SerializeFrom<typeof loader>['events'][number];

function EventsTable() {
  const { events } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<EventInView>[] = [
    {
      displayName: 'Event',
      size: '400',
      render: (event) => event.name,
    },
    {
      displayName: '# of Attendees',
      size: '160',
      render: (event) => {
        return new Intl.NumberFormat().format(Number(event.attendees));
      },
    },
    {
      displayName: 'Type',
      size: '160',
      render: (event) => {
        const type = event.type as Event['type'];

        return type === 'irl' ? (
          <Pill color="lime-100">IRL</Pill>
        ) : (
          <Pill color="purple-100">{toTitleCase(event.type)}</Pill>
        );
      },
    },
    {
      displayName: 'Date',
      size: '160',
      render: (event) => event.date,
    },
    {
      displayName: 'Time',
      render: (event) => `${event.startTime} - ${event.endTime}`,
      size: null,
    },
  ];

  return (
    <Table
      columns={columns}
      data={events}
      emptyMessage="No events found."
      Dropdown={EventDropdown}
    />
  );
}

function EventsPagination() {
  const [searchParams] = useSearchParams(ListSearchParams);

  const { events, totalEvents } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={events.length}
      page={searchParams.page}
      pageSize={searchParams.limit}
      totalCount={totalEvents}
    />
  );
}

function EventDropdown({ id }: EventInView) {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onOpen() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      {open && (
        <Table.Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link to={generatePath(Route.IMPORT_EVENT_ATTENDEES, { id })}>
                <Upload /> Import Attendees
              </Link>
            </Dropdown.Item>
            <Dropdown.Item>
              <Link to={generatePath(Route.ADD_RECORDING, { id })}>
                <Upload /> Add Recording
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
