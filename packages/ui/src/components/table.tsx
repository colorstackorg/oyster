import React, { type PropsWithChildren } from 'react';
import { MoreVertical } from 'react-feather';
import { match } from 'ts-pattern';

import { Dropdown } from './dropdown';
import { IconButton } from './icon-button';
import { Text } from './text';
import { cx } from '../utils/cx';

type TableData = Record<string, unknown>;

export type TableColumnProps<T extends TableData> = {
  displayName: string;

  /**
   * Allows us to be flexible in rendering cells that aren't simply just
   * text-based or if we wanted to have custom formatting/styling for a
   * specific cell.
   *
   * This is passed all of the data for that specific row, which gives us
   * flexibility on what is rendered.
   */
  render: (value: T) => JSX.Element | string | number | null;

  show?(): boolean;

  size:
    | '80'
    | '120'
    | '160'
    | '200'
    | '240'
    | '280'
    | '320'
    | '360'
    | '400'
    | null;
};

type TableDropdownProps<T extends TableData> = T & {
  onOpen(): void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableProps<T extends TableData = any> = {
  Dropdown?(props: TableDropdownProps<T>): JSX.Element;

  /**
   * Array of columns that will be used to build the table's headers.
   *
   * Each table row is built by iterating through these columns and finding the
   * associated key for each data row.
   */
  columns: TableColumnProps<T>[];

  /**
   * Array of data points that we will pass to each one of our table rows and
   * eventually rendered.
   *
   * This MUST be paginated according to the page size.
   */
  data: T[];

  /**
   * Message that displays when there is no data for the table.
   *
   * @example 'No applications found.'
   * @example 'No student found.'
   */
  emptyMessage?: string;
};

export const Table = ({
  Dropdown,
  columns,
  data,
  emptyMessage,
}: TableProps) => {
  return (
    <div className="overflow-scroll rounded-lg border border-gray-200">
      {!data.length ? (
        <div className="box-border flex w-full flex-col items-center justify-center gap-4 p-12">
          <Text>{emptyMessage}</Text>
        </div>
      ) : (
        <table className="w-full table-fixed border-separate border-spacing-0">
          <TableHead columns={columns} />
          <TableBody columns={columns} data={data} Dropdown={Dropdown} />
        </table>
      )}
    </div>
  );
};

function TableHead({ columns }: Pick<TableProps, 'columns'>) {
  const headerCellCn = cx(
    'sticky top-0 z-10 border-b border-b-gray-200 bg-gray-50 p-2 py-3 text-left'
  );

  return (
    <thead>
      <tr>
        {columns
          .filter((column) => !column.show || !!column.show())
          .map((column) => {
            return (
              <th
                key={column.displayName}
                className={cx(
                  headerCellCn,
                  'text-sm font-medium text-gray-700',
                  match(column.size)
                    .with('80', () => 'w-[80px]')
                    .with('120', () => 'w-[120px]')
                    .with('160', () => 'w-[160px]')
                    .with('200', () => 'w-[200px]')
                    .with('240', () => 'w-[240px]')
                    .with('280', () => 'w-[280px]')
                    .with('320', () => 'w-[320px]')
                    .with('360', () => 'w-[360px]')
                    .with('400', () => 'w-[400px]')
                    .with(null, () => undefined)
                    .exhaustive()
                )}
              >
                {column.displayName}
              </th>
            );
          })}

        <th className={cx(headerCellCn, 'right-0 w-12 px-0')} />
      </tr>
    </thead>
  );
}

function TableBody({
  columns,
  data,
  Dropdown,
}: Pick<TableProps, 'columns' | 'data' | 'Dropdown'>) {
  const dataCellCn = cx(
    'whitespace-nowrap border-b border-b-gray-100 bg-white p-2'
  );

  return (
    <tbody>
      {data.map((row) => {
        return (
          <tr
            className="border-b border-b-gray-100 last:border-b-0"
            key={row.id}
          >
            {columns
              .filter((column) => !column.show || !!column.show())
              .map((column) => {
                return (
                  <td
                    className={cx(
                      dataCellCn,
                      'overflow-hidden text-ellipsis text-left'
                    )}
                    key={column.displayName + row.id}
                  >
                    {column.render(row)}
                  </td>
                );
              })}

            <td className={cx(dataCellCn, 'sticky right-0')}>
              {!!Dropdown && <Dropdown {...row} />}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

// Dropdown

Table.Dropdown = function TableDropdown({ children }: PropsWithChildren) {
  return (
    <Dropdown className="fixed right-[unset] mt-[unset] translate-x-[calc(-100%-0.5rem)]">
      {children}
    </Dropdown>
  );
};

type TableDropdownOpenButtonProps = {
  onClick(): void;
};

Table.DropdownOpenButton = function TableDropdownOpenButton({
  onClick,
}: TableDropdownOpenButtonProps) {
  const onClickWithEvent = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <IconButton
      backgroundColorOnHover="gray-200"
      className="ml-auto"
      icon={<MoreVertical />}
      onClick={onClickWithEvent}
    />
  );
};
