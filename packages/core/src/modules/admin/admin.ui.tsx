import { Form as RemixForm } from '@remix-run/react';

import { Button, Form, Input, Select } from '@oyster/ui';

import { AddAdminInput, AdminRole } from '@/modules/admin/admin.types';

const keys = AddAdminInput.keyof().enum;

type AdminFormProps = {
  error?: string;
  errors: Partial<Record<keyof AddAdminInput, string>>;
};

export function AdminForm({ error, errors }: AdminFormProps) {
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
        error={errors.role}
        label="Role"
        labelFor={keys.role}
        required
      >
        <Select id={keys.role} name={keys.role} required>
          <option value={AdminRole.ADMIN}>Admin</option>
          <option value={AdminRole.AMBASSADOR}>Ambassador</option>
          <option value={AdminRole.OWNER}>Owner</option>
        </Select>
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
