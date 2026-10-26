# Changes

## Problem

In the Offers section, the company filter was dropped whenever you switched
between the Internships and Full-Time tabs. If you searched for a company on one
tab and clicked over to the other, the filter reset and you had to search for
that company again.

The cause was in `OffersNavigation` (`_profile.offers.tsx`). The two tab links
were bare pathnames, and React Router navigates a bare pathname with an empty
query string, so the `?company=` param was discarded and the destination loader
returned the unfiltered list.

## Solution

I made the tab links carry the current `company` param, so the filter survives a
tab switch and each tab shows that same company's offers.

I only forwarded `company`. The other params belong to a single list:
`hourlyRate` exists only on Internships, `totalCompensation` only on Full-Time,
and the `location` options are built per offer type. Forwarding those could
filter a tab by a value that isn't in its own dropdown. I dropped `page` too, so
you don't land on page 4 of a one-page list.

I also added a clearer empty state. When the carried-over company has no offers
of the type you're viewing, the table now says "No record exists for internship
offers at {company} yet." instead of the generic "no offers found matching the
criteria" copy, which reads like a failed search rather than missing data. It
only shows when the company is the only active filter, since otherwise the empty
result is probably caused by the other filters.

`appliedCompany` was already in both loader payloads, so I didn't need to change
any loaders or queries. I didn't write any styling, and I left the "x" on the
company pill untouched, so clearing the filter works exactly as it did before.

## Files changed

- `apps/member-profile/app/routes/_profile.offers.tsx` — imported
  `useSearchParams` and appended `?company=` to both tab links in
  `OffersNavigation`.
- `apps/member-profile/app/routes/_profile.offers.internships.tsx` —
  destructured `appliedCompany`, computed `emptyMessage`, passed it to `Table`.
- `apps/member-profile/app/routes/_profile.offers.full-time.tsx` — same, with
  full-time wording and the `totalCompensation` filter check.

## Testing

`type-check`, `lint` and `test` all pass. I verified in the browser that the
filter persists both directions, the new message shows for both offer types, a
company with data in both tabs is unaffected, and an unfiltered page renders
plain tab links.
