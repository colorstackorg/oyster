import { Form } from 'react-router';

import { Button, ErrorMessage, Field, Input } from '@oyster/ui';

import { ReferFriendInput } from '@/modules/referrals/referrals.types';

export { ReferralStatus } from './referrals.types';

const keys = ReferFriendInput.keyof().enum;

type ReferFriendFormProps = {
  error?: string;
  errors: Partial<Record<keyof ReferFriendInput, string>>;
};

export function ReferFriendForm({ error, errors }: ReferFriendFormProps) {
  return (
    <Form className="form" method="post">
      <div className="flex gap-4">
        <Field
          error={errors.firstName}
          label="First Name"
          labelFor={keys.firstName}
          required
        >
          <Input id={keys.firstName} name={keys.firstName} required />
        </Field>

        <Field
          error={errors.lastName}
          label="Last Name"
          labelFor={keys.lastName}
          required
        >
          <Input id={keys.lastName} name={keys.lastName} required />
        </Field>
      </div>

      <Field error={errors.email} label="Email" labelFor={keys.email} required>
        <Input id={keys.email} name={keys.email} required type="email" />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Refer</Button.Submit>
      </Button.Group>
    </Form>
  );
}
