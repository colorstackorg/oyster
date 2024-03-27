export function formatHeadline({
  graduationYear,
  headline,
  school,
}: {
  graduationYear: string | number;
  headline: string | null;
  school: string | null | undefined;
}) {
  return (
    headline || `Student at ${school} '${graduationYear.toString().slice(2)}`
  );
}

export function formatName({
  firstName,
  lastName,
  preferredName,
}: {
  firstName: string;
  lastName: string;
  preferredName: string | null;
}) {
  return preferredName
    ? `${firstName} (${preferredName}) ${lastName}`
    : `${firstName} ${lastName}`;
}
