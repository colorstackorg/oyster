import { Link, useLocation } from '@remix-run/react';
import { ChevronLeft, ChevronRight } from 'react-feather';

import { run } from '@oyster/utils';

import { Text } from './text';
import { cx } from '../utils/cx';

type PaginationValue = number | '...';

type PaginationProps = {
  dataLength: number;
  page: number;
  pageSize: number;
  totalCount: number;
};

export function Pagination({
  dataLength,
  page,
  pageSize,
  totalCount,
}: PaginationProps) {
  if (!dataLength) {
    return null;
  }

  // Example: Page = 1, Page Size = 10 -> 1
  // Example: Page = 2, Page Size = 10 -> 11
  // Example: Page = 1, Page Size = 20 -> 1
  // Example: Page = 1, Page Size = 20 -> 21
  const startIndex = (page - 1) * pageSize + 1;

  // Example: Page = 1, Limit = 10, Data Length = 10 -> 10
  // Example: Page = 1, Limit = 10, Data Length = 5 -> 5
  // Example: Page = 2, Limit = 10, Data Length = 10 -> 20
  // Example: Page = 2, Limit = 10, Data Length = 5 -> 15
  const endIndex = startIndex + dataLength - 1;

  const pageCount = Math.ceil(totalCount / pageSize);

  const paginationValues = getPaginationValues({
    page,
    pageCount,
  });

  return (
    <footer className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-6">
      <Text variant="sm">
        Showing {startIndex} - {endIndex} of {totalCount}
      </Text>

      {pageCount > 1 && (
        <ul className="flex items-center gap-2">
          <PaginationItem
            active={false}
            disabled={page === 1}
            page={Math.max(1, page - 1)}
          >
            <ChevronLeft className="h-full w-full text-center" size="1rem" />
          </PaginationItem>

          {paginationValues.map((value, i) => {
            // If the value is an ellipses and there are 2 of them present in the
            // array. we need to differentiate between them.
            const key = value === '...' ? `${value}-${i}` : value;

            const active = page === value;

            return (
              <PaginationItem
                active={active}
                disabled={value === '...'}
                key={key}
                page={value}
              >
                {value}
              </PaginationItem>
            );
          })}

          <PaginationItem
            active={false}
            aria-label="Go to Next Page"
            disabled={page === pageCount}
            page={Math.min(page + 1, pageCount)}
          >
            <ChevronRight className="h-full w-full text-center" size="1rem" />
          </PaginationItem>
        </ul>
      )}
    </footer>
  );
}

type PaginationItemProps = Pick<
  React.HTMLProps<HTMLButtonElement>,
  'children' | 'disabled'
> & {
  active: boolean;
  page: number | string;
};

function PaginationItem({
  active,
  children,
  disabled,
  page,
}: PaginationItemProps) {
  const { search } = useLocation();

  const searchParams = new URLSearchParams(search);

  searchParams.set('page', page.toString());

  const linkCn = cx(
    'flex h-6 w-6 items-center justify-center rounded-full text-sm no-underline',
    !!active && 'bg-primary font-semibold text-white',
    !disabled && !active && 'hover:bg-gray-100 hover:text-primary',
    !disabled && 'cursor-pointer'
  );

  return (
    <li>
      {disabled ? (
        <a aria-disabled={true} className={linkCn}>
          {children}
        </a>
      ) : (
        <Link className={linkCn} to={{ search: searchParams.toString() }}>
          {children}
        </Link>
      )}
    </li>
  );
}

type GetPaginationValuesArgs = {
  page: number;
  pageCount: number;
};

/**
 * Returns an array of pagination values, inserting ellipses at the proper
 * indices in the array.
 *
 * There should a maximum of 9 items in the result, with a maximum of 2
 * ellipses in the result (the rest of the items being numbers).
 *
 * The first and last numbers should always be present in the result.
 *
 * @param page - The current page number.
 * @param pageCount - The # of pages in the table.
 *
 * @example
 * // Returns [1, 2, 3, 4, 5, 6, '...', 10]
 * getPaginationValues(1, 10);
 *
 * @example
 * // Returns [1, '...', 5, 6, 7, 8, 9, 10]
 * getPaginationValues(10, 10);
 *
 * @example
 * // Returns [1, '...', 3, 4, 5, 6, 7, '...', 10]
 * getPaginationValues(5, 10);
 */
function getPaginationValues({
  page,
  pageCount,
}: GetPaginationValuesArgs): PaginationValue[] {
  const array = Array.from(Array(pageCount).keys()).map((value) => {
    return value + 1;
  });

  const { length: initialLength } = array;

  // If there are less than 8 numbers, then we can show all of them!
  if (initialLength <= 8) {
    return array;
  }

  // The first and last number are always displaying, we just need to find
  // what the middle numbers are...
  const middleChunk = run(() => {
    // If the current page number is less than 5, then the middle chunk is
    // just the first 5 numbers (after the initial element).
    if (page <= 5) {
      return array.slice(1, 6);
    }

    // If the current page number is greater than array length - 4, grab
    // the last 5 elements.
    if (page >= initialLength - 4) {
      return array.slice(initialLength - 6, initialLength - 1);
    }

    // Otherwise, grab the "middle section" of the array.
    return array.slice(page - 3, page + 2);
  });

  // We resconstruct an array with the first/last numbers and the newly
  // constructed "middle chunk" array.
  const result = [
    array[0],
    ...middleChunk,
    array[initialLength - 1],
  ] as PaginationValue[];

  // If there is a difference greater than 1 between the first and second
  // element, insert an ellipses after the first element...
  if (
    typeof result[1] === 'number' &&
    typeof result[0] === 'number' &&
    result[1] - result[0] > 1
  ) {
    result.splice(1, 0, '...');
  }

  const { length } = result;

  // If there is a difference greater than 1 between the last and second to
  // last element, insert an ellipses before the last element..
  if (
    typeof result[length - 1] === 'number' &&
    typeof result[length - 2] === 'number' &&
    (result[length - 1] as number) - (result[length - 2] as number) > 1
  ) {
    result.splice(length - 1, 0, '...');
  }

  return result;
}
