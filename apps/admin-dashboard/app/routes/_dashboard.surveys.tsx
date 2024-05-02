import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { Menu, Plus, Upload } from 'react-feather';
import { generatePath } from 'react-router';

import {
  Dashboard,
  Dropdown,
  IconButton,
  Pagination,
  Table,
  type TableColumnProps,
  useSearchParams,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import { ListSearchParams } from '../shared/core.ui';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const { limit, page, search } = ListSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const query = db.selectFrom('surveys').$if(!!search, (qb) => {
    return qb.where('title', 'ilike', `%${search}%`);
  });

  const [surveys, countResult] = await Promise.all([
    query
      .leftJoin('events', 'events.id', 'surveys.eventId')
      .select([
        'events.id as eventId',
        'events.name as eventName',
        'surveys.id',
        'surveys.title',
        (eb) => {
          return eb
            .selectFrom('surveyResponses')
            .select(eb.fn.countAll<string>().as('count'))
            .whereRef('surveyResponses.surveyId', '=', 'surveys.id')
            .as('responses');
        },
      ])
      .orderBy('surveys.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return json({
    surveys,
    totalSurveys: parseInt(countResult.count),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export default function SurveysPage() {
  return (
    <>
      <Dashboard.Title>Surveys</Dashboard.Title>

      <Dashboard.Subheader>
        <Dashboard.SearchForm placeholder="Search..." />
        <SurveysActionDropdown />
      </Dashboard.Subheader>

      <SurveysTable />
      <SurveysPagination />
      <Outlet />
    </>
  );
}

function SurveysActionDropdown() {
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
              <Link to={Route['/surveys/create']}>
                <Plus /> New Survey
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}

type SurveyInView = SerializeFrom<typeof loader>['surveys'][number];

function SurveysTable() {
  const { surveys } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<SurveyInView>[] = [
    {
      displayName: 'Title',
      size: '400',
      render: (survey) => survey.title,
    },
    {
      displayName: '# of Responses',
      size: '120',
      render: (survey) => {
        return new Intl.NumberFormat().format(Number(survey.responses));
      },
    },
    {
      displayName: 'Event',
      render: (survey) => survey.eventName,
      size: null,
    },
  ];

  return (
    <Table
      columns={columns}
      data={surveys}
      emptyMessage="No surveys found."
      Dropdown={SurveyDropdown}
    />
  );
}

function SurveysPagination() {
  const [searchParams] = useSearchParams(ListSearchParams);

  const { surveys, totalSurveys } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={surveys.length}
      page={searchParams.page}
      pageSize={searchParams.limit}
      totalCount={totalSurveys}
    />
  );
}

function SurveyDropdown({ id }: SurveyInView) {
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
              <Link to={generatePath(Route['/surveys/:id/import'], { id })}>
                <Upload /> Import Survey Responses
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
