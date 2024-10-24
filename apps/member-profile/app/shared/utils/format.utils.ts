import { ApplicationRejectionReason } from '@/modules/application/application.types';

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

/**
 * Formats a rejection reason into a user-friendly message.
 *
 * @param {string} reason - The raw rejection reason.
 * @returns {string} A formatted, user-friendly explanation of the rejection reason.
 *
 * @example
 * // Returns "This referral was rejected because an ineligible major."
 * formatRejectionReason('ineligible_major');
 *
 **/
export function formatRejectionReason(reason: string) {
  if (!reason) return 'Requires argument `reason`';

  switch (reason) {
    case ApplicationRejectionReason.BAD_LINKEDIN:
      return 'Incomplete LinkedIn';
    case ApplicationRejectionReason.IS_INTERNATIONAL:
      return 'Not enrolled in US or Canada';
    case ApplicationRejectionReason.INELIGIBLE_MAJOR:
      return 'Not the right major';
    case ApplicationRejectionReason.NOT_UNDERGRADUATE:
      return 'Not an undergrad student';
    case ApplicationRejectionReason.OTHER:
      return 'Other reason';
    default:
      return 'Invalid reason.';
  }
}
