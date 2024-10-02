import React, { type PropsWithChildren, useContext, useState } from 'react';

import { ResourceType } from '@oyster/core/resources';
import {
  type FieldProps,
  FileUploader,
  Form,
  Input,
  MB_IN_BYTES,
  Select,
  Textarea,
} from '@oyster/ui';
import {
  SearchBox,
  SearchComponent,
  SearchResults,
  SearchValues,
} from '@oyster/ui';

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

export function ResourceTagsField({ error, name }: FieldProps<string>) {
  // defaultValue,
  // const createFetcher = useFetcher<unknown>();
  // const listFetcher = useFetcher<SearchTagsResult>();

  // const [newTagId, setNewTagId] = useState<string>(id());
  // const [search, setSearch] = useState<string>('');

  // useEffect(() => {
  //   listFetcher.load('/api/tags/search');
  // }, []);

  // const tags = listFetcher.data?.tags || [];

  // function reset() {
  //   setSearch('');
  //   setNewTagId(id());
  // }

  return (
    <Form.Field
      description="To categorize and help others find this resource."
      error={error}
      label="Tags"
      labelFor={name}
      required
    >
      <SearchComponent>
        <div className="flex flex-col gap-2 rounded-lg border border-gray-300 p-2 focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500">
          <SearchValues name={name} />
          <SearchBox />
        </div>
        <SearchResults />
      </SearchComponent>
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
