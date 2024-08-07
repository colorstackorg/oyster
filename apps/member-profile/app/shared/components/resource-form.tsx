import { useFetcher } from '@remix-run/react';
import React, {
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { ResourceType } from '@oyster/core/resources';
import {
  ComboboxPopover,
  type FieldProps,
  FileUploader,
  Form,
  Input,
  MB_IN_BYTES,
  MultiCombobox,
  MultiComboboxDisplay,
  MultiComboboxItem,
  type MultiComboboxProps,
  MultiComboboxSearch,
  MultiComboboxValues,
  Pill,
  Select,
  Textarea,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { type SearchTagsResult } from '@/routes/api.tags.search';

type ResourceFormContext = {
  setType(type: ResourceType): void;
  type: ResourceType | null;
};

const ResourceFormContext = React.createContext<ResourceFormContext>({
  setType: () => {},
  type: null,
});

export function ResourceProvider({
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

export function ResourceAttachmentField({
  defaultValue,
  error,
  name,
}: FieldProps<{ id: string; mimeType: string }>) {
  const { type } = useContext(ResourceFormContext);

  if (type !== 'file') {
    return null;
  }

  return (
    <Form.Field
      description="Please choose the file you want to upload."
      error={error}
      label="Attachment"
      labelFor={name}
      required
    >
      <FileUploader
        accept={['application/pdf', 'image/jpeg', 'image/png']}
        id={name}
        maxFileSize={MB_IN_BYTES * 20}
        name={name}
        required
        {...(defaultValue && {
          initialFile: {
            id: defaultValue.id,
            name: defaultValue.id,
            size: 0,
            type: defaultValue.mimeType,
          },
        })}
      />
    </Form.Field>
  );
}

export function ResourceDescriptionField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field
      description="Must be less than 160 characters."
      error={error}
      label="Description"
      labelFor={name}
      required
    >
      <Textarea
        defaultValue={defaultValue}
        id={name}
        maxLength={160}
        minRows={2}
        name={name}
        required
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

export function ResourceTagsField({
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
    listFetcher.load('/api/tags/search');
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
        {({ values }) => {
          const filteredTags = tags.filter((tag) => {
            return values.every((value) => {
              return value.value !== tag.id;
            });
          });

          return (
            <>
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

              {(!!filteredTags.length || !!search.length) && (
                <ComboboxPopover>
                  <ul>
                    {filteredTags.map((tag) => {
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
            </>
          );
        }}
      </MultiCombobox>
    </Form.Field>
  );
}

export function ResourceTitleField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field error={error} label="Title" labelFor={name} required>
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
