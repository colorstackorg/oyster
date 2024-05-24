import { useSearchParams } from '@remix-run/react';

type ExistingSearchParamsProps = {
  exclude?: string[];
};

/**
 * This component will render hidden inputs for all existing search params
 * except for the ones specified in the `exclude` prop. This is helpful
 * when we want to preserve the existing search params when submitting a "GET"
 * form.
 */
export function ExistingSearchParams({
  exclude = [],
}: ExistingSearchParamsProps) {
  const [searchParams] = useSearchParams();

  const existingParams = Array.from(searchParams.entries()).filter(([key]) => {
    return !exclude.includes(key);
  });

  return (
    <>
      {existingParams.map(([key, value]) => {
        return (
          <input
            // We use the key AND value because if there is a param with
            // multiple values, it will render multiple hidden inputs and we
            // don't want to have duplicate keys.
            key={key + value}
            name={key}
            type="hidden"
            value={value}
          />
        );
      })}
    </>
  );
}
