import { type PropsWithChildren } from 'react';
import React, { useContext, useState } from 'react';

import { Input, type InputProps } from './input';
import { Select, SelectItem, type SelectProps } from './select.v2';

type SupportedCountry = 'CA' | 'US';

type AddressContext = {
  country: SupportedCountry;
  setCountry(country: SupportedCountry): void;
};

const AddressContext = React.createContext<AddressContext>({
  country: 'US',
  setCountry: (_: SupportedCountry) => {},
});

export const Address = ({ children }: PropsWithChildren) => {
  const [country, setCountry] = useState<SupportedCountry>('US');

  return (
    <AddressContext.Provider value={{ country, setCountry }}>
      <div className="grid gap-4 @container">{children}</div>
    </AddressContext.Provider>
  );
};

Address.City = function City(props: InputProps) {
  return <Input {...props} />;
};

type Country = {
  abbreviation: SupportedCountry;
  name: string;
};

const COUNTRIES: Country[] = [
  { abbreviation: 'CA', name: 'Canada' },
  { abbreviation: 'US', name: 'United States' },
];

Address.Country = function Country(props: SelectProps) {
  const { country, setCountry } = useContext(AddressContext);

  return (
    <Select
      defaultValue={country}
      onChange={(e) => {
        setCountry(e.currentTarget.value as SupportedCountry);
      }}
      {...props}
    >
      {COUNTRIES.map((country) => {
        return (
          <SelectItem key={country.abbreviation} value={country.abbreviation}>
            {country.name}
          </SelectItem>
        );
      })}
    </Select>
  );
};

Address.HalfGrid = function HalfGrid({ children }: PropsWithChildren) {
  return (
    <div className="grid grid-cols-1 gap-[inherit] @[560px]:grid-cols-2">
      {children}
    </div>
  );
};

Address.Line1 = function Line1(props: InputProps) {
  return <Input {...props} />;
};

Address.Line2 = function Line2(props: InputProps) {
  return <Input {...props} />;
};

Address.PostalCode = function PostalCode(props: InputProps) {
  return <Input {...props} />;
};

type State = {
  abbreviation: string;
  name: string;
};

const COUNTRY_TO_STATES: Record<SupportedCountry, State[]> = {
  CA: [
    { abbreviation: 'AB', name: 'Alberta' },
    { abbreviation: 'BC', name: 'British Columbia' },
    { abbreviation: 'MB', name: 'Manitoba' },
    { abbreviation: 'NB', name: 'New Brunswick' },
    { abbreviation: 'NL', name: 'Newfoundland and Labrador' },
    { abbreviation: 'NT', name: 'Northwest Territories' },
    { abbreviation: 'NS', name: 'Nova Scotia' },
    { abbreviation: 'NU', name: 'Nunavut' },
    { abbreviation: 'ON', name: 'Ontario' },
    { abbreviation: 'PE', name: 'Prince Edward Island' },
    { abbreviation: 'QC', name: 'Quebec' },
    { abbreviation: 'SK', name: 'Saskatchewan' },
    { abbreviation: 'YT', name: 'Yukon' },
  ],

  US: [
    { abbreviation: 'AL', name: 'Alabama' },
    { abbreviation: 'AK', name: 'Alaska' },
    { abbreviation: 'AZ', name: 'Arizona' },
    { abbreviation: 'AR', name: 'Arkansas' },
    { abbreviation: 'CA', name: 'California' },
    { abbreviation: 'CO', name: 'Colorado' },
    { abbreviation: 'CT', name: 'Connecticut' },
    { abbreviation: 'DE', name: 'Delaware' },
    { abbreviation: 'DC', name: 'District Of Columbia' },
    { abbreviation: 'FL', name: 'Florida' },
    { abbreviation: 'GA', name: 'Georgia' },
    { abbreviation: 'HI', name: 'Hawaii' },
    { abbreviation: 'ID', name: 'Idaho' },
    { abbreviation: 'IL', name: 'Illinois' },
    { abbreviation: 'IN', name: 'Indiana' },
    { abbreviation: 'IA', name: 'Iowa' },
    { abbreviation: 'KS', name: 'Kansas' },
    { abbreviation: 'KY', name: 'Kentucky' },
    { abbreviation: 'LA', name: 'Louisiana' },
    { abbreviation: 'ME', name: 'Maine' },
    { abbreviation: 'MD', name: 'Maryland' },
    { abbreviation: 'MA', name: 'Massachusetts' },
    { abbreviation: 'MI', name: 'Michigan' },
    { abbreviation: 'MN', name: 'Minnesota' },
    { abbreviation: 'MS', name: 'Mississippi' },
    { abbreviation: 'MO', name: 'Missouri' },
    { abbreviation: 'MT', name: 'Montana' },
    { abbreviation: 'NE', name: 'Nebraska' },
    { abbreviation: 'NV', name: 'Nevada' },
    { abbreviation: 'NH', name: 'New Hampshire' },
    { abbreviation: 'NJ', name: 'New Jersey' },
    { abbreviation: 'NM', name: 'New Mexico' },
    { abbreviation: 'NY', name: 'New York' },
    { abbreviation: 'NC', name: 'North Carolina' },
    { abbreviation: 'ND', name: 'North Dakota' },
    { abbreviation: 'OH', name: 'Ohio' },
    { abbreviation: 'OK', name: 'Oklahoma' },
    { abbreviation: 'OR', name: 'Oregon' },
    { abbreviation: 'PA', name: 'Pennsylvania' },
    { abbreviation: 'PR', name: 'Puerto Rico' },
    { abbreviation: 'RI', name: 'Rhode Island' },
    { abbreviation: 'SC', name: 'South Carolina' },
    { abbreviation: 'SD', name: 'South Dakota' },
    { abbreviation: 'TN', name: 'Tennessee' },
    { abbreviation: 'TX', name: 'Texas' },
    { abbreviation: 'UT', name: 'Utah' },
    { abbreviation: 'VT', name: 'Vermont' },
    { abbreviation: 'VA', name: 'Virginia' },
    { abbreviation: 'WA', name: 'Washington' },
    { abbreviation: 'WV', name: 'West Virginia' },
    { abbreviation: 'WI', name: 'Wisconsin' },
    { abbreviation: 'WY', name: 'Wyoming' },
  ],
};

Address.State = function State(props: SelectProps) {
  const { country } = useContext(AddressContext);

  const states = COUNTRY_TO_STATES[country];

  return (
    <Select {...props}>
      {states.map((state) => {
        return (
          <SelectItem key={state.abbreviation} value={state.abbreviation}>
            {state.name}
          </SelectItem>
        );
      })}
    </Select>
  );
};
