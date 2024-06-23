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
  type ComboboxValue,
  type FieldProps,
  Form,
  Input,
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
      description="Must be less than 20 MB and one of the following file types: PNG, JPG, or PDF."
      error={error}
      label="Attachment"
      labelFor={name}
      required
    >
      <input
        accept="image/png, image/jpeg, .pdf"
        id={name}
        name={name}
        required
        type="file"
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

interface Tag {
  id: string;
  name: string;
}

export function ResourceTagsField({
  defaultValue,
  error,
  name,
}: FieldProps<MultiComboboxProps['defaultValues']>) {
  const createFetcher = useFetcher<unknown>();
  const listFetcher = useFetcher<SearchTagsResult>();

  const [search, setSearch] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<Record<string, Tag>>({});

  useEffect(() => {
    listFetcher.load('/api/tags/search');
  }, []);

  const tags = listFetcher.data?.tags || [];

  function onTagCreated(newTag: Tag) {
    createFetcher.submit(
      { id: newTag.id, name: newTag.name },
      {
        action: '/api/tags/add',
        method: 'post',
      }
    );
    setSearch('');
    setSelectedTags({ ...selectedTags, [newTag.id]: newTag });
    listFetcher.load('/api/tags/search');
  }

  const onTagSelected = (tag: Tag) => {
    setSelectedTags({ ...selectedTags, [tag.id]: tag });
  };

  const onValueSelected = (comboboxValue: ComboboxValue) => {
    setSelectedTags((prevSelectedTags) => {
      const newSelectedTags = { ...prevSelectedTags };

      delete newSelectedTags[comboboxValue.value];

      return newSelectedTags;
    });
  };

  const getTagsForDisplay = () => {
    const tagsForDisplay = tags
      .filter((tag) => !Object.keys(selectedTags).includes(tag.id))
      .map((tag) => (
        <MultiComboboxItem
          key={tag.id}
          label={tag.name}
          onSelect={() => onTagSelected(tag)}
          value={tag.id}
        >
          <Pill color="pink-100">{tag.name}</Pill>
        </MultiComboboxItem>
      ));

    if (search.length > 0) {
      const newId = id();
      const searchTag = (
        <MultiComboboxItem
          key={newId}
          label={search}
          onSelect={() => onTagCreated({ id: newId, name: search })}
          value={newId}
        >
          Create <Pill color="pink-100">{search}</Pill>
        </MultiComboboxItem>
      );

      tagsForDisplay.unshift(searchTag);
    }

    return tagsForDisplay;
  };

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
          <MultiComboboxValues name={name} onSelect={onValueSelected} />
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
            <ul>{getTagsForDisplay()}</ul>
          </ComboboxPopover>
        )}
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
