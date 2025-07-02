import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

import { getRandomAccentColor } from '@oyster/core/member-profile/ui';
import {
  createOpportunityTag,
  CreateOpportunityTagInput,
  listOpportunityTags,
} from '@oyster/core/opportunities';
import {
  type AccentColor,
  ComboboxPopover,
  Field,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
  Pill,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const tags = await listOpportunityTags();

  return json(tags);
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const result = await validateForm(request, CreateOpportunityTagInput);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  const createResult = await createOpportunityTag(result.data);

  if (!createResult.ok) {
    return json({ error: createResult.error }, { status: createResult.code });
  }

  return json({});
}

// Components

type OpportunityTag = {
  color: AccentColor;
  id: string;
  name: string;
};

type OpportunityTagsFieldProps = {
  error?: string;
  tags: OpportunityTag[];
};

export function OpportunityTagsField({
  error,
  tags: selectedTags,
}: OpportunityTagsFieldProps) {
  const [color, setColor] = useState<AccentColor>(getRandomAccentColor());
  const [tagId, setTagId] = useState<string>(id());
  const [search, setSearch] = useState<string>('');

  const createFetcher = useFetcher<unknown>();
  const listFetcher = useFetcher<OpportunityTag[]>();

  useEffect(() => {
    listFetcher.load('/opportunities/tags');
  }, []);

  const allTags = listFetcher.data || [];

  function reset() {
    setColor(getRandomAccentColor());
    setTagId(id());
  }

  return (
    <Field
      description="To categorize and help others find this opportunity."
      error={error}
      label="Tags"
      labelFor="tags"
      required
    >
      <MultiCombobox
        defaultValues={selectedTags.map((tag) => {
          return {
            color: tag.color,
            label: tag.name,
            value: tag.id,
          };
        })}
      >
        {({ values }) => {
          const filteredTags = allTags.filter((tag) => {
            const isMatch = tag.name
              .toLowerCase()
              .includes(search.toLowerCase());

            const isNotSelected = values.every((value) => {
              return value.value !== tag.id;
            });

            return isMatch && isNotSelected;
          });

          return (
            <>
              <MultiComboboxDisplay>
                <MultiComboboxValues name="tags" />
                <MultiComboboxSearch
                  id="tags"
                  onChange={(e) => setSearch(e.currentTarget.value)}
                />
              </MultiComboboxDisplay>

              {(!!filteredTags.length || !!search.length) && (
                <ComboboxPopover>
                  <ul>
                    {filteredTags.map((tag) => {
                      return (
                        <MultiComboboxItem
                          color={tag.color}
                          label={tag.name}
                          key={tag.id}
                          onSelect={reset}
                          value={tag.id}
                        >
                          <Pill color={tag.color}>{tag.name}</Pill>
                        </MultiComboboxItem>
                      );
                    })}

                    {!!search.length && (
                      <MultiComboboxItem
                        color={color}
                        label={search}
                        onSelect={(e) => {
                          createFetcher.submit(
                            {
                              color,
                              id: e.currentTarget.value,
                              name: search,
                            },
                            {
                              action: '/opportunities/tags',
                              method: 'post',
                            }
                          );

                          reset();
                        }}
                        value={tagId}
                      >
                        Create <Pill color={color}>{search}</Pill>
                      </MultiComboboxItem>
                    )}
                  </ul>
                </ComboboxPopover>
              )}
            </>
          );
        }}
      </MultiCombobox>
    </Field>
  );
}
