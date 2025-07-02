import React, { type PropsWithChildren, useContext } from 'react';
import { MoreVertical } from 'react-feather';
import { type LinkProps, useNavigate } from 'react-router';
import { match } from 'ts-pattern';

import { Dropdown, DropdownContext } from './dropdown';
import { IconButton } from './icon-button';
import { Text } from './text';
import { usePosition } from '../hooks/use-position';
import { cx } from '../utils/cx';

type TableData = Record<string, unknown>;

export type TableColumnProps<T extends TableData> = {
  displayName?: string;

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
    | '48'
    | '80'
    | '120'
    | '160'
    | '200'
    | '240'
    | '280'
    | '320'
    | '360'
    | '400'
    | '800';

  /**
   * If true, this column will be sticky to the right. Only one column
   * can/should be sticky. This replaces what used to be the `Dropdown` column,
   * and is now more flexible.
   */
  sticky?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableProps<T extends TableData = any> = {
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

  /**
   * Function that allows us to generate a URL from a row. When this is
   * provided, the row will be clickable and will navigate to the generated
   * URL.
   *
   * @param row - The row of data that we are generating a URL for.
   */
  rowTo?(row: T): LinkProps['to'];
};

export const Table = ({ columns, data, emptyMessage, rowTo }: TableProps) => {
  return (
    <div className="overflow-auto rounded-lg border border-gray-200">
      {!data.length ? (
        <div className="box-border flex w-full flex-col items-center justify-center gap-4 p-12">
          <Text>{emptyMessage}</Text>
        </div>
      ) : (
        <table className="w-full table-fixed border-separate border-spacing-0">
          <TableHead columns={columns} />
          <TableBody columns={columns} data={data} rowTo={rowTo} />
        </table>
      )}
    </div>
  );
};

function TableHead({ columns }: Pick<TableProps, 'columns'>) {
  const headerCellCn = cx(
    'top-0 border-b border-b-gray-200 bg-gray-50 p-2 py-3 text-left'
  );

  const filteredColumns = getFilteredColumns(columns);
  const hasStickyColumn = filteredColumns[filteredColumns.length - 1].sticky;

  // This empty column is used to ensure that all the columns widths are
  // consistent regardless of the screen size.
  const emptyCell = <th className={headerCellCn} />;

  return (
    <thead>
      <tr>
        {filteredColumns.map((column, i) => {
          const key = column.displayName || i + column.size;

          return (
            <React.Fragment key={key}>
              {column.sticky && emptyCell}

              <th
                className={cx(
                  headerCellCn,
                  column.sticky && 'sticky right-0',
                  'text-sm font-medium text-gray-700',
                  match(column.size)
                    .with('48', () => 'w-[48px]')
                    .with('80', () => 'w-[80px]')
                    .with('120', () => 'w-[120px]')
                    .with('160', () => 'w-[160px]')
                    .with('200', () => 'w-[200px]')
                    .with('240', () => 'w-[240px]')
                    .with('280', () => 'w-[280px]')
                    .with('320', () => 'w-[320px]')
                    .with('360', () => 'w-[360px]')
                    .with('400', () => 'w-[400px]')
                    .with('800', () => 'w-[800px]')
                    .exhaustive()
                )}
              >
                {column.displayName}
              </th>
            </React.Fragment>
          );
        })}

        {!hasStickyColumn && emptyCell}
      </tr>
    </thead>
  );
}

function TableBody({
  columns,
  data,
  rowTo,
}: Pick<TableProps, 'columns' | 'data' | 'rowTo'>) {
  const navigate = useNavigate();

  const dataCellCn = cx(
    'whitespace-nowrap border-b border-b-gray-100 bg-white p-2',
    rowTo && 'group-hover:bg-gray-50'
  );

  const filteredColumns = getFilteredColumns(columns);
  const hasStickyColumn = filteredColumns[filteredColumns.length - 1].sticky;

  // This empty column is used to ensure that all the columns widths are
  // consistent regardless of the screen size.
  const emptyCell = <td className={dataCellCn} />;

  return (
    <tbody>
      {data.map((row) => {
        return (
          <tr
            className="group border-b border-b-gray-100 last:border-b-0"
            key={row.id}
            // We'll provide some additional props to make the row interactive
            // if we have a `rowTo` function.
            {...(rowTo && {
              'aria-label': 'View Details',
              role: 'button',
              tabIndex: 0,

              onClick(e) {
                // We find the closest interactive element to the click target
                // to ensure that we don't trigger the row click if the user
                // clicked on a button or link inside of the row.
                const isInteractiveElement = (e.target as HTMLElement).closest(
                  'a, button, [tabindex]:not([tabindex="-1"])'
                );

                // As long as the click target is actually the row, then we
                // want to trigger the row click.
                if (isInteractiveElement?.tagName === 'TR') {
                  navigate(rowTo(row), { preventScrollReset: true });
                }
              },

              onKeyDown(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(rowTo(row), { preventScrollReset: true });
                }
              },
            })}
          >
            {filteredColumns.map((column, i) => {
              const key = row.id + (column.displayName || i + column.size);

              return (
                <React.Fragment key={key}>
                  {column.sticky && emptyCell}

                  <td
                    className={cx(
                      dataCellCn,
                      column.sticky ? 'sticky right-0' : 'overflow-hidden',
                      'text-ellipsis text-left'
                    )}
                  >
                    {column.render(row)}
                  </td>
                </React.Fragment>
              );
            })}

            {!hasStickyColumn && emptyCell}
          </tr>
        );
      })}
    </tbody>
  );
}

function getFilteredColumns(columns: TableProps['columns']) {
  return columns.filter((column) => {
    return !column.show || !!column.show();
  });
}

// Dropdown

Table.Dropdown = function TableDropdown({ children }: PropsWithChildren) {
  const { ref } = useContext(DropdownContext);
  const { x, y } = usePosition(ref);

  return (
    <Dropdown
      className="fixed -ml-2 mt-[unset] -translate-x-full"
      style={{ left: x, top: y }}
    >
      {children}
    </Dropdown>
  );
};

Table.DropdownOpenButton = function TableDropdownOpenButton() {
  return (
    <Dropdown.Trigger>
      <IconButton
        backgroundColorOnHover="gray-200"
        className="ml-auto"
        icon={<MoreVertical />}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    </Dropdown.Trigger>
  );
};
