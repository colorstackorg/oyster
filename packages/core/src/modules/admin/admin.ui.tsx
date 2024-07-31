import { Form as RemixForm } from '@remix-run/react';

import { Button, Checkbox, Form, Input } from '@oyster/ui';

import { AddAdminInput } from '@/modules/admin/admin.types';

const keys = AddAdminInput.keyof().enum;

type ReferFriendFormProps = {
  error?: string;
  errors: Partial<Record<keyof AddAdminInput, string>>;
};

export function AdminForm({ error, errors }: ReferFriendFormProps) {
  return (
    <RemixForm className="form" method="post">
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

      <Form.Field
        error={errors.email}
        label="Email"
        labelFor={keys.email}
        required
      >
        <Input id={keys.email} name={keys.email} required />
      </Form.Field>

      <Form.Field
        description="Is this admin an ambassador? Ambassadors will have limited access."
        error={errors.isAmbassador}
        label="Ambassador"
        labelFor={keys.isAmbassador}
        required
      >
        <Checkbox
          color="orange-100"
          label="Yes"
          id={keys.isAmbassador}
          name={keys.isAmbassador}
          value="1"
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
