import { useFetcher } from '@remix-run/react';
import React, {
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  type FieldProps,
  Form,
  Input,
  type MultiComboboxProps,
  Select,
  Textarea,
} from '@oyster/ui';
import {
  ComboboxPopover,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  MultiComboboxSearch,
  MultiComboboxValues,
  Pill,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { ResourceType } from '@/member-profile.ui';
import { type SearchTagsResult } from '@/routes/api.tags.search';

type ResourceFormContext = {
  setType(type: ResourceType): void;
  type: ResourceType | null;
};

const ResourceFormContext = React.createContext<ResourceFormContext>({
  setType: () => {},
  type: null,
});

export function ResourceFormProvider({
  children,
  type: initialType = null,
}: PropsWithChildren<{ type?: ResourceFormContext['type'] }>) {
  const [type, setType] = useState<ResourceType | null>(initialType || null);

  return (
    <ResourceFormContext.Provider value={{ type, setType }}>
      {children}
    </ResourceFormContext.Provider>
  );
}

export function DescriptionField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field error={error} label="Description" labelFor={name} required>
      <Textarea
        defaultValue={defaultValue}
        id={name}
        minRows={2}
        name={name}
        required
      />
    </Form.Field>
  );
}

export function TagsField({
  defaultValue,
  error,
  name,
}: FieldProps<MultiComboboxProps['defaultValues']>) {
  const createFetcher = useFetcher<unknown>();
  const listFetcher = useFetcher<SearchTagsResult>();

  const [newTagId, setNewTagId] = useState<string>(id());
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    listFetcher.load('/api/tags/search');
  }, []);

  const tags = listFetcher.data?.tags || [];

  function reset() {
    setSearch('');
    setNewTagId(id());
  }

  return (
    <Form.Field
      description="To categorize and help others find this resource."
      error={error}
      label="Tags"
      labelFor={name}
      required
    >
      <MultiCombobox defaultValues={defaultValue}>
        <MultiComboboxDisplay>
          <MultiComboboxValues name={name} />
          <MultiComboboxSearch
            id={name}
            onChange={(e) => {
              setSearch(e.currentTarget.value);

              listFetcher.submit(
                { search: e.currentTarget.value },
                {
                  action: '/api/tags/search',
                  method: 'get',
                }
              );
            }}
          />
        </MultiComboboxDisplay>

        {(!!tags.length || !!search.length) && (
          <ComboboxPopover>
            <ul>
              {tags.map((tag) => {
                return (
                  <MultiComboboxItem
                    key={tag.id}
                    label={tag.name}
                    onSelect={reset}
                    value={tag.id}
                  >
                    <Pill color="pink-100">{tag.name}</Pill>
                  </MultiComboboxItem>
                );
              })}

              {!!search.length && (
                <MultiComboboxItem
                  label={search}
                  onSelect={(e) => {
                    createFetcher.submit(
                      { id: e.currentTarget.value, name: search },
                      {
                        action: '/api/tags/add',
                        method: 'post',
                      }
                    );

                    reset();
                  }}
                  value={newTagId}
                >
                  Create <Pill color="pink-100">{search}</Pill>
                </MultiComboboxItem>
              )}
            </ul>
          </ComboboxPopover>
        )}
      </MultiCombobox>
    </Form.Field>
  );
}

export function TitleField({ defaultValue, error, name }: FieldProps<string>) {
  return (
    <Form.Field error={error} label="Title" labelFor={name} required>
      <Input defaultValue={defaultValue} id={name} name={name} required />
    </Form.Field>
  );
}

export function ResourceAttachmentField({
  defaultValue: _,
  error,
  name,
}: FieldProps<ResourceType>) {
  const { type } = useContext(ResourceFormContext);

  if (type !== 'file') {
    return null;
  }

  return (
    <Form.Field
      description="Must be one of the following file types: PNG, JPG, or PDF."
      error={error}
      label="Attachment"
      labelFor={name}
      required
    >
      <input
        accept="image/png,, image/jpeg, .pdf"
        id={name}
        name={name}
        required
        type="file"
      />
    </Form.Field>
  );
}

export function ResourceLinkField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  const { type } = useContext(ResourceFormContext);

  if (type !== 'url') {
    return null;
  }

  return (
    <Form.Field
      description="Please include the full URL."
      error={error}
      label="URL"
      labelFor={name}
      required
    >
      <Input defaultValue={defaultValue} id={name} name={name} required />
    </Form.Field>
  );
}

export function ResourceTypeField({
  defaultValue,
  error,
  name,
}: FieldProps<ResourceType>) {
  const { setType } = useContext(ResourceFormContext);

  return (
    <Form.Field
      description="What kind of type is this resource?"
      error={error}
      label="Type"
      labelFor={name}
      required
    >
      <Select
        defaultValue={defaultValue}
        id={name}
        name={name}
        onChange={(e) => {
          setType(e.currentTarget.value as ResourceType);
        }}
        required
      >
        <option value={ResourceType.FILE}>File</option>
        <option value={ResourceType.URL}>URL</option>
      </Select>
    </Form.Field>
  );
}
