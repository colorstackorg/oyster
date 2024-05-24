import { useSearchParams } from '@remix-run/react';

type ExistingSearchParamsProps = {
  exclude?: string[];
};

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
          <input key={key + value} name={key} type="hidden" value={value} />
        );
      })}
    </>
  );
}
