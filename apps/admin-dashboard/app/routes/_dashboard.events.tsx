import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Camera, Menu, Plus, RefreshCw, Trash2, Upload } from 'react-feather';
import { generatePath } from 'react-router';

import { listEvents } from '@oyster/core/admin-dashboard/server';
import { ListSearchParams } from '@oyster/core/admin-dashboard/ui';
import { type Event, EventType } from '@oyster/types';
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

import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

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
    (eb) => {
      return eb
        .selectFrom('eventRegistrations')
        .select(eb.fn.countAll<string>().as('count'))
        .whereRef('eventRegistrations.eventId', '=', 'events.id')
        .as('registrations');
    },
  ]);

  const formatter = new Intl.NumberFormat();

  const events = _events.map(
    ({ attendees, endTime, registrations, startTime, ...event }) => {
      return {
        ...event,
        attendees: formatter.format(Number(attendees)),
        date: dayjs(startTime).tz(timezone).format('MM/DD/YY'),
        endTime: dayjs(endTime).tz(timezone).format('h:mm A'),
        registrations: formatter.format(Number(registrations)),
        startTime: dayjs(startTime).tz(timezone).format('h:mm A'),
      };
    }
  );

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
              <Link to={Route['/events/create']}>
                <Plus /> Create Event
              </Link>
            </Dropdown.Item>
            <Dropdown.Item>
              <Link to={Route['/events/sync-airmeet-event']}>
                <RefreshCw /> Sync Airmeet Event
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
      displayName: '# of Registrations',
      size: '160',
      render: (event) => event.registrations,
    },
    {
      displayName: '# of Attendees',
      size: '160',
      render: (event) => event.attendees,
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
      size: '200',
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

function EventDropdown({ id, type }: EventInView) {
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
            {type === EventType.IRL && (
              <Dropdown.Item>
                <Link to={generatePath(Route['/events/:id/check-in'], { id })}>
                  <Camera /> Check-In QR Code
                </Link>
              </Dropdown.Item>
            )}
            <Dropdown.Item>
              <Link to={generatePath(Route['/events/:id/import'], { id })}>
                <Upload /> Import Attendees
              </Link>
            </Dropdown.Item>
            <Dropdown.Item>
              <Link
                to={generatePath(Route['/events/:id/add-recording'], { id })}
              >
                <Upload /> Add Recording
              </Link>
            </Dropdown.Item>
            <Dropdown.Item>
              <Link to={generatePath(Route['/events/:id/delete'], { id })}>
                <Trash2 /> Delete Event
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
