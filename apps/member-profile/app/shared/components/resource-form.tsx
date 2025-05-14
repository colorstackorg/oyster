import { Link, useFetcher, useSearchParams } from '@remix-run/react';
import React, {
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { getRandomAccentColor } from '@oyster/core/member-profile/ui';
import { ResourceType } from '@oyster/core/resources';
import {
  type AccentColor,
  Checkbox,
  ComboboxPopover,
  Field,
  type FieldProps,
  FileUploader,
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
import { Route } from '@/shared/constants';

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
    <Field
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
    </Field>
  );
}

export function ResourceDescriptionField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field
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
    </Field>
  );
}

type ResourceLinkFieldProps = FieldProps<string> & {
  duplicateResourceId?: unknown;
};

export function ResourceLinkField({
  defaultValue,
  duplicateResourceId,
  error: _error,
  name,
}: ResourceLinkFieldProps) {
  const { type } = useContext(ResourceFormContext);
  const [searchParams] = useSearchParams();

  if (type !== 'url') {
    return null;
  }

  let error = _error;

  if (duplicateResourceId) {
    // We set it this way so that we can retain any other search params that
    // may have already been set.
    searchParams.set('id', duplicateResourceId as string);

    error = (
      <span>
        A resource with this link has already been added.{' '}
        <Link
          className="link"
          to={{
            pathname: Route['/resources'],
            search: searchParams.toString(),
          }}
        >
          View it here.
        </Link>
      </span>
    );
  }

  return (
    <Field
      description="Please include the full URL."
      error={error}
      label="URL"
      labelFor={name}
      required
    >
      <Input defaultValue={defaultValue} id={name} name={name} required />
    </Field>
  );
}

export function ResourceSearchConfirmationField({ name }: FieldProps<boolean>) {
  return (
    <Checkbox
      label="I have searched for this resource and it does not exist."
      id={name}
      name={name}
      required
      value="1"
    />
  );
}

export function ResourceTagsField({
  defaultValue,
  error,
  name,
}: FieldProps<MultiComboboxProps['defaultValues']>) {
  const [color, setColor] = useState<AccentColor>(getRandomAccentColor());
  const [tagId, setTagId] = useState<string>(id());
  const [search, setSearch] = useState<string>('');

  const createFetcher = useFetcher<unknown>();
  const listFetcher = useFetcher<SearchTagsResult>();

  useEffect(() => {
    listFetcher.load('/api/tags/search');
  }, []);

  const tags = listFetcher.data?.tags || [];

  function reset() {
    setColor(getRandomAccentColor());
    setTagId(id());
  }

  return (
    <Field
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
                          color={tag.color as AccentColor}
                          key={tag.id}
                          label={tag.name}
                          onSelect={reset}
                          value={tag.id}
                        >
                          <Pill color={tag.color as AccentColor}>
                            {tag.name}
                          </Pill>
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
                              action: '/api/tags/add',
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

export function ResourceTitleField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field error={error} label="Title" labelFor={name} required>
      <Input defaultValue={defaultValue} id={name} name={name} required />
    </Field>
  );
}

export function ResourceTypeField({
  defaultValue,
  error,
  name,
}: FieldProps<ResourceType>) {
  const { setType } = useContext(ResourceFormContext);

  return (
    <Field
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
    </Field>
  );
}
