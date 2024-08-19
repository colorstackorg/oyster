import { type PropsWithChildren } from 'react';
import React, { useContext, useState } from 'react';

import { Input, type InputProps } from './input';
import { Select, type SelectProps } from './select';

type AddressContextValue = {
  countryAbbreviation: string;
  setCountryAbbreviation(country: string): void;
};

const AddressContext = React.createContext<AddressContextValue>({
  countryAbbreviation: 'US',
  setCountryAbbreviation: (_: string) => {},
});

export const Address = ({ children }: PropsWithChildren) => {
  const [countryAbbreviation, setCountryAbbreviation] = useState<string>('US');

  return (
    <AddressContext.Provider
      value={{ countryAbbreviation, setCountryAbbreviation }}
    >
      <div className="grid gap-4 @container">{children}</div>
    </AddressContext.Provider>
  );
};

Address.City = function City(props: InputProps) {
  return <Input {...props} />;
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

const USA_STATES: State[] = [
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
];

const CA_PROVINCES: State[] = [
  { name: 'Alberta', abbreviation: 'AB' },
  { name: 'British Columbia', abbreviation: 'BC' },
  { name: 'Manitoba', abbreviation: 'MB' },
  { name: 'New Brunswick', abbreviation: 'NB' },
  { name: 'Newfoundland and Labrador', abbreviation: 'NL' },
  { name: 'Northwest Territories', abbreviation: 'NT' },
  { name: 'Nova Scotia', abbreviation: 'NS' },
  { name: 'Nunavut', abbreviation: 'NU' },
  { name: 'Ontario', abbreviation: 'ON' },
  { name: 'Prince Edward Island', abbreviation: 'PE' },
  { name: 'Quebec', abbreviation: 'QC' },
  { name: 'Saskatchewan', abbreviation: 'SK' },
  { name: 'Yukon', abbreviation: 'YT' },
];

type Country = {
  abbreviation: string;
  name: string;
};

const COUNTRIES: Country[] = [
  { abbreviation: 'CA', name: 'Canada' },
  { abbreviation: 'US', name: 'United States' },
];

const mapCountryAbbreviationToStates: Record<string, State[]> = {
  CA: CA_PROVINCES,
  US: USA_STATES,
};

Address.State = function State(props: SelectProps) {
  const { countryAbbreviation } = useContext(AddressContext);

  const states = mapCountryAbbreviationToStates[countryAbbreviation];

  return (
    <Select {...props}>
      {states.map((state: State) => {
        return (
          <option key={state.abbreviation} value={state.abbreviation}>
            {state.name}
          </option>
        );
      })}
    </Select>
  );
};

Address.Country = function Country(props: SelectProps) {
  const { setCountryAbbreviation } = useContext(AddressContext);

  return (
    <Select
      {...props}
      onChange={(e) => setCountryAbbreviation(e.currentTarget.value)}
    >
      {COUNTRIES.map((country: Country) => {
        return (
          <option key={country.abbreviation} value={country.abbreviation}>
            {country.name}
          </option>
        );
      })}
    </Select>
  );
};
