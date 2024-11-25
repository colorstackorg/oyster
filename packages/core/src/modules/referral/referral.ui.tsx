import { Form as RemixForm } from '@remix-run/react';

import { Button, Form, Input } from '@oyster/ui';

import { ReferFriendInput } from '@/modules/referral/referral.types';

export { ReferralStatus } from './referral.types';

const keys = ReferFriendInput.keyof().enum;

type ReferFriendFormProps = {
  error?: string;
  errors: Partial<Record<keyof ReferFriendInput, string>>;
};

export function ReferFriendForm({ error, errors }: ReferFriendFormProps) {
  return (
    <RemixForm className="form" method="post">
      <div className="flex gap-4">
        <Form.Field
          error={errors.firstName}
          label="First Name"
          labelFor={keys.firstName}
          required
        >
          <Input id={keys.firstName} name={keys.firstName} required />
        </Form.Field>

        <Form.Field
          error={errors.lastName}
          label="Last Name"
          labelFor={keys.lastName}
          required
        >
          <Input id={keys.lastName} name={keys.lastName} required />
        </Form.Field>
      </div>

      <Form.Field
        error={errors.email}
        label="Email"
        labelFor={keys.email}
        required
      >
        <Input id={keys.email} name={keys.email} required type="email" />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Refer</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
