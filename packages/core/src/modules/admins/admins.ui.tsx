import { Form, generatePath, Link } from '@remix-run/react';
import { Trash } from 'react-feather';
import { match } from 'ts-pattern';

import { type DB } from '@oyster/db';
import {
  Button,
  Dropdown,
  ErrorMessage,
  Field,
  Input,
  Pill,
  Select,
  Table,
  type TableColumnProps,
} from '@oyster/ui';

import { AddAdminInput, AdminRole } from '@/modules/admins/admins.types';

// Admin Form

const keys = AddAdminInput.keyof().enum;

type AdminFormProps = {
  error?: string;
  errors: Partial<Record<keyof AddAdminInput, string>>;
};

export function AdminForm({ error, errors }: AdminFormProps) {
  return (
    <Form className="form" method="post">
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

      <Field error={errors.email} label="Email" labelFor={keys.email} required>
        <Input id={keys.email} name={keys.email} required />
      </Field>

      <Field error={errors.role} label="Role" labelFor={keys.role} required>
        <Select id={keys.role} name={keys.role} required>
          <option value={AdminRole.ADMIN}>Admin</option>
          <option value={AdminRole.AMBASSADOR}>Ambassador</option>
        </Select>
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </Form>
  );
}

// Admins Table

type AdminInTable = Pick<
  DB['admins'],
  'email' | 'firstName' | 'id' | 'lastName' | 'role'
> & {
  canRemove: boolean;
  isDeleted: boolean;
};

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
      size: '160',
      render: (admin) => {
        return match(admin.role as AdminRole)
          .with('admin', () => {
            return <Pill color="blue-100">Admin</Pill>;
          })
          .with('ambassador', () => {
            return <Pill color="pink-100">Ambassador</Pill>;
          })
          .with('owner', () => {
            return <Pill color="purple-100">Owner</Pill>;
          })
          .exhaustive();
      },
    },
    {
      displayName: 'Status',
      size: '160',
      render: (admin) => {
        return admin.isDeleted ? (
          <Pill color="gray-100">Archived</Pill>
        ) : (
          <Pill color="lime-100">Active</Pill>
        );
      },
    },
    {
      size: '48',
      sticky: true,
      render: (admin) => {
        if (!admin.canRemove) {
          return null;
        }

        return <AdminDropdown {...admin} />;
      },
    },
  ];

  return (
    <Table columns={columns} data={admins} emptyMessage="No admins found." />
  );
}

function AdminDropdown({ id }: AdminInTable) {
  return (
    <Dropdown.Root>
      <Table.Dropdown>
        <Dropdown.List>
          <Dropdown.Item>
            <Link
              preventScrollReset
              to={generatePath('/admins/:id/remove', { id })}
            >
              <Trash /> Remove Admin
            </Link>
          </Dropdown.Item>
        </Dropdown.List>
      </Table.Dropdown>

      <Table.DropdownOpenButton />
    </Dropdown.Root>
  );
}
