import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  Form as RemixForm,
  useLoaderData,
  useOutletContext,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Plus, Trash } from 'react-feather';

import {
  Dropdown,
  getIconButtonCn,
  Table,
  type TableColumnProps,
} from '@oyster/ui';

import { validateQueue } from '@/shared/bull';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const queue = await validateQueue(params.queue as string);

  const _repeatables = await queue.getRepeatableJobs();

  const timezone = getTimezone(request);
  const format = 'MM/DD/YY @ h:mm:ss A';

  const repeatables = _repeatables.map((repeatable) => {
    return {
      id: repeatable.key,
      name: repeatable.name,
      next: dayjs(repeatable.next).tz(timezone).format(format),
      pattern: repeatable.pattern,
      tz: repeatable.tz,
    };
  });

  return json({
    queue: queue.name,
    repeatables,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const form = await request.formData();
  const { id } = Object.fromEntries(form);

  const queue = await validateQueue(params.queue as string);

  await queue.removeRepeatableByKey(id as string);

  toast(session, {
    message: 'Removed repeatable.',
  });

  return json(
    {},
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function RepeatablesPage() {
  const { queue } = useLoaderData<typeof loader>();
  const context = useOutletContext();

  return (
    <>
      {context === 'subheader' && (
        <Link
          className={getIconButtonCn({
            backgroundColor: 'gray-100',
            backgroundColorOnHover: 'gray-200',
            shape: 'square',
          })}
          to={generatePath(Route['/bull/:queue/repeatables/add'], {
            queue,
          })}
        >
          <Plus />
        </Link>
      )}

      {context === 'main' && (
        <>
          <RepeatablesTable />
          <Outlet />
        </>
      )}
    </>
  );
}

type RepeatableInView = SerializeFrom<typeof loader>['repeatables'][number];

function RepeatablesTable() {
  const { repeatables } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<RepeatableInView>[] = [
    {
      displayName: 'Name',
      size: '280',
      render: (repeatable) => {
        return <code className="text-sm">{repeatable.name}</code>;
      },
    },
    {
      displayName: 'Pattern',
      size: '160',
      render: (repeatable) => {
        return <code className="text-sm">{repeatable.pattern}</code>;
      },
    },
    {
      displayName: 'Next Job',
      size: '200',
      render: (repeatable) => repeatable.next,
    },
    {
      displayName: 'Timezone',
      size: '200',
      render: (repeatable) => repeatable.tz,
    },
  ];

  return (
    <Table
      columns={columns}
      data={repeatables}
      Dropdown={RepeatableDropdown}
      emptyMessage="No repeatables found."
    />
  );
}

function RepeatableDropdown({ id }: RepeatableInView) {
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
              <RemixForm method="post">
                <button name="id" type="submit" value={id}>
                  <Trash /> Delete Repeatable
                </button>
              </RemixForm>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
