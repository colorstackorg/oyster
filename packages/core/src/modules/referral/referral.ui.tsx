import { Form } from '@remix-run/react';

import { Button, ErrorMessage, FormField, Input } from '@oyster/ui';

import { ReferFriendInput } from '@/modules/referral/referral.types';

export { ReferralStatus } from './referral.types';

const keys = ReferFriendInput.keyof().enum;

type ReferFriendFormProps = {
  error?: string;
  errors: Partial<Record<keyof ReferFriendInput, string>>;
};

export function ReferFriendForm({ error, errors }: ReferFriendFormProps) {
  return (
    <Form className="form" method="post">
      <div className="flex gap-4">
        <FormField
          error={errors.firstName}
          label="First Name"
          labelFor={keys.firstName}
          required
        >
          <Input id={keys.firstName} name={keys.firstName} required />
        </FormField>

        <FormField
          error={errors.lastName}
          label="Last Name"
          labelFor={keys.lastName}
          required
        >
          <Input id={keys.lastName} name={keys.lastName} required />
        </FormField>
      </div>

      <FormField
        error={errors.email}
        label="Email"
        labelFor={keys.email}
        required
      >
        <Input id={keys.email} name={keys.email} required type="email" />
      </FormField>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Refer</Button.Submit>
      </Button.Group>
    </Form>
  );
}
