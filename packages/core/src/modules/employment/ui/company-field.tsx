import { useFetcher } from '@remix-run/react';
import React, {
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  Input,
  type InputProps,
  useDelayedValue,
} from '@oyster/ui';

import { type BaseCompany, type Company } from '../employment.types';

// TODO: Ensure that anywhere there is a company field is used, that it comes
// from here (currently, there is multiple versions of this component and
// ideally it's shared from one source).

type CompanyFieldState = {
  allowFreeText: boolean;
  isFreeText: boolean;
  setIsFreeText(value: boolean): void;
};

const CompanyFieldContext = React.createContext<CompanyFieldState>({
  allowFreeText: true,
  isFreeText: false,
  setIsFreeText: (_: boolean) => {},
});

type CompanyFieldProviderProps = PropsWithChildren<
  Partial<Pick<CompanyFieldState, 'allowFreeText'>>
>;

export function CompanyFieldProvider({
  allowFreeText = true,
  children,
}: CompanyFieldProviderProps) {
  const [isFreeText, setIsFreeText] = useState<boolean>(false);

  return (
    <CompanyFieldContext.Provider
      value={{
        allowFreeText,
        isFreeText,
        setIsFreeText,
      }}
    >
      {children}
    </CompanyFieldContext.Provider>
  );
}

type CompanyComboboxProps = {
  defaultCompanyName?: Company['name'];
  defaultCrunchbaseId?: Company['crunchbaseId'];
  name: string;
  showDescription?: boolean;
};

export function CompanyCombobox({
  defaultCompanyName,
  defaultCrunchbaseId,
  name,
  showDescription = true,
}: CompanyComboboxProps) {
  const { allowFreeText, setIsFreeText } = useContext(CompanyFieldContext);

  const [search, setSearch] = useState<string>(defaultCompanyName || '');

  const delayedSearch = useDelayedValue(search, 250);

  const fetcher = useFetcher<{ companies: BaseCompany[] }>();

  useEffect(() => {
    fetcher.submit(
      { search: delayedSearch },
      {
        action: '/companies',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const companies = fetcher.data?.companies || [];

  return (
    <Combobox
      defaultDisplayValue={defaultCompanyName}
      defaultValue={defaultCrunchbaseId}
    >
      <ComboboxInput
        id={name}
        name={name}
        onChange={(e) => setSearch(e.currentTarget.value)}
        required
      />

      <ComboboxPopover>
        <ul>
          {companies.map((company) => {
            return (
              <ComboboxItem
                className="whitespace-nowrap [&>button]:flex [&>button]:items-center"
                displayValue={company.name}
                key={company.crunchbaseId}
                value={company.crunchbaseId}
                {...(allowFreeText && {
                  onSelect: () => setIsFreeText(false),
                })}
              >
                <img
                  alt={company.name}
                  className="mr-2 h-6 w-6 rounded"
                  src={company.imageUrl}
                />
                <span>{company.name}</span>
                {showDescription && (
                  <span className="ml-2 mt-0.5 box-border max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-400">
                    {company.description}
                  </span>
                )}
              </ComboboxItem>
            );
          })}

          {allowFreeText && (
            <ComboboxItem onSelect={() => setIsFreeText(true)} value="">
              Other
            </ComboboxItem>
          )}
        </ul>
      </ComboboxPopover>
    </Combobox>
  );
}

export function FreeTextCompanyInput({
  defaultValue,
  name,
}: Pick<InputProps, 'defaultValue' | 'name'>) {
  const { allowFreeText, isFreeText } = useContext(CompanyFieldContext);

  if (!allowFreeText || !isFreeText) {
    return null;
  }

  return (
    <Input
      defaultValue={defaultValue}
      id={name}
      name={name}
      placeholder="Google"
      required
    />
  );
}
