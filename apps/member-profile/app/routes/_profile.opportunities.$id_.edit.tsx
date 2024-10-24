import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Form as RemixForm,
  useActionData,
  useFetcher,
  useLoaderData,
  useParams,
  useSearchParams,
} from '@remix-run/react';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { useEffect, useState } from 'react';

import { editOpportunity } from '@oyster/core/opportunities';
import { EditOpportunityInput } from '@oyster/core/opportunities/types';
import { db } from '@oyster/db';
import {
  Button,
  ComboboxPopover,
  DatePicker,
  Form,
  getButtonCn,
  getErrors,
  Input,
  Modal,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
  Pill,
  type PillProps,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { CompanyCombobox } from '@/shared/components/company-combobox';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const hasEditPermission = await db
    .selectFrom('opportunities')
    .where('opportunities.id', '=', params.id as string)
    .where((eb) => {
      return eb.or([
        eb('opportunities.postedBy', '=', memberId),
        eb.exists(() => {
          return eb
            .selectFrom('admins')
            .where('admins.memberId', '=', memberId)
            .where('admins.deletedAt', 'is not', null);
        }),
      ]);
    })
    .executeTakeFirst();

  if (!hasEditPermission) {
    throw new Response(null, {
      status: 403,
      statusText: 'You do not have permission to edit this opportunity.',
    });
  }

  const opportunity = await db
    .selectFrom('opportunities')
    .leftJoin('companies', 'companies.id', 'opportunities.companyId')
    .select([
      'companies.crunchbaseId as companyCrunchbaseId',
      'companies.name as companyName',
      'opportunities.description',
      'opportunities.expiresAt as closeDate',
      'opportunities.id',
      'opportunities.title',

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
              color: ref('opportunityTags.color'),
              id: ref('opportunityTags.id'),
              name: ref('opportunityTags.name'),
            });

            return fn
              .jsonAgg(sql`${object} order by ${ref('name')} asc`)
              .$castTo<
                Array<{
                  color: PillProps['color'];
                  id: string;
                  name: string;
                }>
              >()
              .as('tags');
          })
          .as('tags');
      },
    ])
    .where('opportunities.id', '=', params.id as string)
    .executeTakeFirst();

  if (!opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are trying to edit does not exist.',
    });
  }

  return json({ opportunity });
}

export async function action({ params, request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    EditOpportunityInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const id = params.id as string;

  await editOpportunity(id, {
    closeDate: data.closeDate,
    companyCrunchbaseId: data.companyCrunchbaseId,
    description: data.description,
    tags: data.tags,
    title: data.title,
  });

  return redirect(generatePath(Route['/opportunities/:id'], { id }));
}

export default function EditOpportunity() {
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Edit Opportunity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <EditOpportunityForm />
    </Modal>
  );
}

function EditOpportunityForm() {
  const { opportunity } = useLoaderData<typeof loader>();
  const { id } = useParams();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field
        error={errors.title}
        label="Company"
        labelFor="companyCrunchbaseId"
        required
      >
        <CompanyCombobox
          defaultValue={{
            crunchbaseId: opportunity.companyCrunchbaseId || '',
            name: opportunity.companyName || '',
          }}
          name="companyCrunchbaseId"
          error=""
        />
      </Form.Field>

      <Form.Field error={errors.title} label="Title" labelFor="title" required>
        <Input
          defaultValue={opportunity.title}
          id="title"
          name="title"
          required
        />
      </Form.Field>

      <Form.Field
        error={errors.description}
        label="Description"
        labelFor="description"
      >
        <Textarea
          defaultValue={opportunity.description || ''}
          id="description"
          maxLength={250}
          minRows={2}
          name="description"
        />
      </Form.Field>

      <TagsField />

      <Form.Field
        description="This is the date that the opportunity will be marked as closed."
        error={errors.closeDate}
        label="Close Date"
        labelFor="closeDate"
        required
      >
        <DatePicker
          defaultValue={opportunity.closeDate}
          id="closeDate"
          name="closeDate"
          required
          type="date"
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group flexDirection="row-reverse" spacing="between">
        <Button.Submit>Save</Button.Submit>

        <Link
          className={getButtonCn({ color: 'error', variant: 'secondary' })}
          to={generatePath(Route['/opportunities/:id/delete'], {
            id: id as string,
          })}
        >
          Delete
        </Link>
      </Button.Group>
    </RemixForm>
  );
}

const colors: PillProps['color'][] = [
  'amber-100',
  'blue-100',
  'cyan-100',
  'gold-100',
  'gray-100',
  'green-100',
  'lime-100',
  'orange-100',
  'pink-100',
  'purple-100',
  'red-100',
];

function TagsField() {
  const { opportunity } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  const createFetcher = useFetcher<unknown>();
  const listFetcher = useFetcher<{
    tags: Array<{ color: PillProps['color']; id: string; name: string }>;
  }>();

  const [newColor, setNewColor] = useState<PillProps['color']>(
    colors[Math.floor(Math.random() * colors.length)]
  );

  const [newTagId, setNewTagId] = useState<string>(id());
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    listFetcher.load('/api/opportunities/tags/search');
  }, []);

  const tags = listFetcher.data?.tags || [];

  function reset() {
    setNewColor(colors[Math.floor(Math.random() * colors.length)]);
    setNewTagId(id());
  }

  return (
    <Form.Field
      description="To categorize and help others find this opportunity."
      error={errors.tags}
      label="Tags"
      labelFor="tags"
      required
    >
      <MultiCombobox
        defaultValues={(opportunity.tags || []).map((tag) => {
          return {
            color: tag.color,
            label: tag.name,
            value: tag.id,
          };
        })}
      >
        {({ values }) => {
          const filteredTags = tags.filter((tag) => {
            return values.every((value) => {
              return value.value !== tag.id;
            });
          });

          return (
            <>
              <MultiComboboxDisplay>
                <MultiComboboxValues name="tags" />
                <MultiComboboxSearch
                  id="tags"
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);

                    listFetcher.submit(
                      { search: e.currentTarget.value },
                      {
                        action: '/api/opportunities/tags/search',
                        method: 'get',
                      }
                    );
                  }}
                />
              </MultiComboboxDisplay>

              {(!!filteredTags.length || !!search.length) && (
                <ComboboxPopover>
                  <ul>
                    {filteredTags.map((tag) => {
                      return (
                        <MultiComboboxItem
                          key={tag.id}
                          color={tag.color}
                          label={tag.name}
                          onSelect={reset}
                          value={tag.id}
                        >
                          <Pill color={tag.color || 'pink-100'}>
                            {tag.name}
                          </Pill>
                        </MultiComboboxItem>
                      );
                    })}

                    {!!search.length && (
                      <MultiComboboxItem
                        color={newColor}
                        label={search}
                        onSelect={(e) => {
                          createFetcher.submit(
                            {
                              color: newColor,
                              id: e.currentTarget.value,
                              name: search,
                            },
                            {
                              action: '/api/opportunities/tags/add',
                              method: 'post',
                            }
                          );

                          reset();
                        }}
                        value={newTagId}
                      >
                        Create <Pill color={newColor}>{search}</Pill>
                      </MultiComboboxItem>
                    )}
                  </ul>
                </ComboboxPopover>
              )}
            </>
          );
        }}
      </MultiCombobox>
    </Form.Field>
  );
}
