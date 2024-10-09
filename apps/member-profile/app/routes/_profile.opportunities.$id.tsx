import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useFetcher,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { useEffect, useState } from 'react';

import { db } from '@oyster/db';
import {
  Button,
  ComboboxPopover,
  DatePicker,
  Form,
  getErrors,
  Input,
  Modal,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
  Pill,
  Select,
  Textarea,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const opportunity = await db
    .selectFrom('opportunities')
    .select([
      'description',
      'expiresAt as closeDate',
      'id',
      'title',
      'type',

      ({ ref }) => {
        const field = ref('expiresAt');
        const format = 'YYYY-MM-DD';

        return sql<string>`to_char(${field}, ${format})`.as('closeDate');
      },

      (eb) => {
        return eb
          .selectFrom('opportunityTagAssociations')
          .leftJoin(
            'opportunityTags',
            'opportunityTags.id',
            'opportunityTagAssociations.tagId'
          )
          .whereRef('opportunityId', '=', 'opportunities.id')
          .select(({ fn, ref }) => {
            const object = jsonBuildObject({
              id: ref('opportunityTags.id'),
              name: ref('opportunityTags.name'),
            });

            return fn
              .jsonAgg(sql`${object} order by ${ref('name')} asc`)
              .$castTo<Array<{ id: string; name: string }>>()
              .as('tags');
          })
          .as('tags');
      },
    ])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are trying to edit does not exist.',
    });
  }

  return json({ opportunity });
}

export async function action() {
  return json({});
}

export default function EditOpportunity() {
  const { opportunity } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>{opportunity.title}</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
    </Modal>
  );
}
