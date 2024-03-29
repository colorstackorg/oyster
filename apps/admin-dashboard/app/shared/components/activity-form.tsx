import { ActivityPeriod, ActivityType } from '@oyster/types';
import { Form, Input, Select, Textarea } from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

type FieldProps<T> = {
  defaultValue?: T;
  error?: string;
  name: string;
};

export const ActivityForm = () => {};

ActivityForm.DescriptionField = function DescriptionField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field error={error} label="Description" labelFor={name}>
      <Textarea defaultValue={defaultValue} id={name} name={name} />
    </Form.Field>
  );
};

ActivityForm.NameField = function NameField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field
      description="This will be visible to members."
      error={error}
      label="Name"
      labelFor={name}
      required
    >
      <Input defaultValue={defaultValue} id={name} name={name} required />
    </Form.Field>
  );
};

const ACTIVITY_PERIODS = Object.values(ActivityPeriod);

ActivityForm.PeriodField = function PeriodField({
  defaultValue,
  error,
  name,
}: FieldProps<ActivityPeriod>) {
  return (
    <Form.Field
      description="This is the period of time that a member has to wait before completing this activity again."
      error={error}
      label="Period"
      labelFor={name}
    >
      <Select defaultValue={defaultValue} id={name} name={name}>
        {ACTIVITY_PERIODS.map((period) => (
          <option key={period} value={period}>
            {toTitleCase(period)}
          </option>
        ))}
      </Select>
    </Form.Field>
  );
};

ActivityForm.PointsField = function PointsField({
  defaultValue,
  error,
  name,
}: FieldProps<number>) {
  return (
    <Form.Field
      description="How many points will this activity be worth?"
      error={error}
      label="Points"
      labelFor={name}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        required
        type="number"
      />
    </Form.Field>
  );
};

const ACTIVITY_TYPES = Object.values(ActivityType);

ActivityForm.TypeField = function TypeField({
  defaultValue,
  error,
  name,
}: FieldProps<ActivityType>) {
  return (
    <Form.Field
      description="This tells our system to associate certain activities with certain events."
      error={error}
      label="Type"
      labelFor={name}
      required
    >
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {ACTIVITY_TYPES.map((type) => (
          <option key={type} value={type}>
            {toTitleCase(type)}
          </option>
        ))}
      </Select>
    </Form.Field>
  );
};
