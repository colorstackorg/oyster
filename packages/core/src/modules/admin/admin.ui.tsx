import { generatePath, Link, Form as RemixForm } from '@remix-run/react';
import { useState } from 'react';
import { Trash } from 'react-feather';
import { match } from 'ts-pattern';

import { type DB } from '@oyster/db';
import {
  Button,
  Dropdown,
  Form,
  Input,
  Pill,
  Select,
  Table,
  type TableColumnProps,
} from '@oyster/ui';

import { AddAdminInput, AdminRole } from '@/modules/admin/admin.types';

// Admin Form

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
        </Select>
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

// Admins Table

type AdminInTable = Pick<
  DB['admins'],
  'email' | 'firstName' | 'lastName' | 'role'
>;

type AdminTableProps = {
  admins: AdminInTable[];
};

export function AdminTable({ admins }: AdminTableProps) {
  const columns: TableColumnProps<AdminInTable>[] = [
    {
      displayName: 'Full Name',
      size: '240',
      render: (admin) => `${admin.firstName} ${admin.lastName}`,
    },
    {
      displayName: 'Email',
      size: '320',
      render: (admin) => admin.email,
    },
    {
      displayName: 'Role',
      size: '200',
      render: (admin) => {
        return match(admin.role as AdminRole)
          .with('admin', () => {
            return <Pill color="blue-100">Admin</Pill>;
          })
          .with('ambassador', () => {
            return <Pill color="pink-100">Ambassador</Pill>;
          })
          .with('owner', () => {
            return <Pill color="lime-100">Owner</Pill>;
          })
          .exhaustive();
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={admins}
      emptyMessage="No admins found."
      Dropdown={AdminDropdown}
    />
  );
}

type AdminType = {
  id: string;
};

export function AdminDropdown({ id }: AdminType) {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onOpen() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      {open && (
        <Table.Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link to={generatePath('/admins/:id/remove', { id })}>
                <Trash /> Remove Admin
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
