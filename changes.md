# Changes: Persist the company filter across the Offers tabs

## Summary

In the Offers section (`/offers`), the company filter is now preserved when a
member switches between the **Internships** and **Full-Time** tabs. Previously
the filter was silently dropped on tab switch, so a member comparing internship
and full-time compensation at the same company had to re-search for that company
every time they switched.

When the carried-over company has no offers of the type being viewed, the table
now says so explicitly instead of showing the generic "no results" copy.

Three files changed, all in `apps/member-profile/app/routes/`. No new
components, no new dependencies, no database or loader changes.

---

## The problem

The two offer lists are sibling routes under a shared layout:

```
_profile.offers.tsx              <- layout: header, tab nav, <Outlet />
_profile.offers.internships.tsx  <- tab 1
_profile.offers.full-time.tsx    <- tab 2
```

Both tabs filter by company using a `company` search param, which holds the
company's **id**. Each loader reads it and resolves it two ways:

- `getAppliedCompany(company)` looks the company up in the `companies` table to
  render the selected pill (name + logo).
- `listInternshipOffers` / `listFullTimeOffers` use it in the `WHERE` clause via
  `eb.or([eb('companies.id', '=', company), eb('companies.name', 'ilike', company)])`.

The tab links in `OffersNavigation` were plain pathnames:

```tsx
<NavigationItem to={Route['/offers/internships']}>Internships</NavigationItem>
<NavigationItem to={Route['/offers/full-time']}>Full-Time</NavigationItem>
```

A React Router `<Link>`/`<NavLink>` with a bare pathname navigates to that
pathname with an **empty** query string. So every tab switch discarded
`?company=...`, and the destination loader saw no filter and returned the
unfiltered list. That was the reset behavior being reported.

---

## Change 1 — carry `company` across the tab links

**File:** `apps/member-profile/app/routes/_profile.offers.tsx`

### What was added

`useSearchParams` was added to the existing `react-router` import:

```tsx
import { Outlet, useSearchParams } from 'react-router';
```

And `OffersNavigation` now reads the current `company` param and appends it to
both destinations:

```tsx
function OffersNavigation({ className }: OffersNavigationProps) {
  const [searchParams] = useSearchParams();

  const company = searchParams.get('company');

  const search = company
    ? '?' + new URLSearchParams({ company }).toString()
    : '';

  return (
    <nav className={cx('mr-auto', className)}>
      <ul className="flex items-center gap-4">
        <NavigationItem to={Route['/offers/internships'] + search}>
          Internships
        </NavigationItem>

        <NavigationItem to={Route['/offers/full-time'] + search}>
          Full-Time
        </NavigationItem>
      </ul>
    </nav>
  );
}
```

### Why this location

`OffersNavigation` is rendered twice by the layout — once inside
`<Dashboard.Header>` for `sm` and up, once below it for mobile:

```tsx
<OffersNavigation className="hidden sm:block" />
...
<OffersNavigation className="block sm:hidden" />
```

Because the logic lives inside the component rather than at the call sites, both
the desktop and mobile navs pick it up with no duplication.

### Why only `company`, and not all search params

Deliberate. The other params are scoped to exactly one of the two lists, and
blindly forwarding them would produce confusing results:

| Param | Scope | Decision |
|---|---|---|
| `company` | Both tabs; same meaning, same values (company id) | **Forwarded** |
| `hourlyRate` | Internships only (`$0-20/hr`, `$20-30/hr`, …) | Dropped |
| `totalCompensation` | Full-time only (`$0-100K`, `$100-125K`, …) | Dropped |
| `location` | Both tabs, but the option lists are built by separate `listAllLocations()` queries — one over `internshipOffers`, one over `fullTimeOffers` | Dropped |
| `page` | Both tabs, but the lists have independent lengths | Dropped |

`location` is the debatable one. It was dropped because a location present in
one list is not guaranteed to exist in the other, so forwarding it could land a
member on a tab filtered by a location whose pill they cannot find in that tab's
filter dropdown — a confusing state that would look like a bug. Dropping `page`
also avoids landing on page 4 of a list that only has one page.

### Why string concatenation rather than a `To` object

`NavigationItem` types its prop as `to: string` and passes it straight to
`NavLink`. Appending a query string keeps that contract intact and required no
change to the shared `NavigationItem` component, which is also used by other
sections of the app (`/companies`, `/peer-help`, `/resources`, …). Changing its
signature would have been a wider blast radius than this fix warrants.

### Active-tab highlighting is unaffected

`NavigationItem` styles the active tab via `NavLink`'s `isActive`, which matches
on **pathname only** and ignores the query string. Adding `?company=...` does not
change which tab renders as active. This also still holds when a detail modal is
open at `/offers/internships/:id`, since `NavLink` matches descendant paths by
default.

---

## Change 2 — a specific empty state per tab

**Files:** `_profile.offers.internships.tsx`, `_profile.offers.full-time.tsx`

With the filter now persisting, a new state becomes reachable: a member viewing
a company that has offers of one type but not the other. Before this change the
table would have shown:

> No internship offers found matching the criteria.

That copy reads like a failed search. The table now shows:

> No record exists for internship offers at Meta yet.

### Internships implementation

```tsx
function InternshipOffersTable() {
  const { appliedCompany, offers } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const hasOtherFilters =
    !!searchParams.getAll('hourlyRate').length ||
    !!searchParams.getAll('location').length;

  const emptyMessage =
    appliedCompany && !hasOtherFilters
      ? `No record exists for internship offers at ${appliedCompany.name} yet.`
      : 'No internship offers found matching the criteria.';

  // ...

  return <Table columns={columns} data={offers} emptyMessage={emptyMessage} ... />;
}
```

The full-time version is identical except it checks `totalCompensation` instead
of `hourlyRate` and says "full-time offers".

### Notable details

- **`appliedCompany` was already in the loader payload** for both routes — it
  powers the selected pill on `CompanyFilter`. The only change was destructuring
  it in the table component, which already called `useLoaderData`. No loader,
  query, or network change was needed.
- **`appliedCompany.name` is the company's real name from the `companies`
  table**, not the raw search param. So the message reads "at Meta", not
  "at 16", even though the param holds an id.
- **The `hasOtherFilters` guard matters.** If a member filters by Google *and*
  `$70+/hr` and gets nothing, the cause is probably the rate filter, not a
  missing company record — claiming "no record exists at Google" would be wrong.
  The specific message therefore only appears when company is the sole active
  filter; otherwise the original generic copy is used.
- **`Table` accepts `emptyMessage?: string`** (`packages/ui/src/components/table.tsx:74`)
  and renders it inside a `<Text>`. Passing a computed string required no change
  to the shared component and inherits its existing typography.

---

## Wording

The requested template was `No record exists for {job-type} at {company-name} yet`.

Job type is rendered as **"internship offers"** and **"full-time offers"** rather
than bare "internships" / "full-time". "No record exists for full-time at Google
yet" is awkward, and the chosen phrasing matches the vocabulary already used
elsewhere in the section ("No internship offers found matching the criteria.",
"No companies found that are linked to full-time offers."). Easy to change if a
different phrasing is preferred.

---

## What was deliberately left alone

Per the constraint to avoid altering existing UI design choices:

- **No styling was written.** Both changes reuse existing components and their
  existing classes; not one Tailwind class was added, removed, or edited across
  the three files.
- **The clear ("x") affordance is untouched.** It comes from the `Pill` inside
  `FilterTrigger` (`packages/ui/src/components/filter.tsx:230`), which builds its
  own href by deleting the `company` and `page` params from the current URL.
  Clearing the company still works exactly as before, on both tabs, and now
  correctly clears the carried-over filter too.
- **No changes to loaders, queries, aggregations, the filter components, the
  table columns, `NavigationItem`, or the route structure.**

---

## Known consequences

None of the following are defects introduced by this change, and none were
altered by it. They are behaviors that already existed but that a persisting
company filter makes **easier to reach**, so they are documented here rather
than left for someone to rediscover in review.

### 1. Zeroed aggregation tiles on an empty list

When a filtered list returns no rows, the aggregation tiles above the table show
`$0.00/hr` / `$0` instead of being hidden. `AVG()` over zero rows returns SQL
`NULL`, and `Number(null)` evaluates to `0`, which the currency formatter
renders as zero rather than as "no data".

This was already true for any empty filter result. It is only more visible now,
because it sits directly above the new "No record exists…" message — a member
reading both together could plausibly misread "$0.00/hr average" as a claim
about the company's pay rather than as an absence of data. Worth a follow-up if
that reads badly; the fix would be to hide or dash out the tiles when
`totalOffers === 0`.

### 2. The selected company can be absent from the Company dropdown

**The short version:** the pill showing the selected company and the list of
options inside the Company dropdown are populated by two *different* queries
with two *different* rules about which companies qualify. Persisting the filter
across tabs is the first thing that can push those two out of agreement.

**Where the two sources diverge.** Each offers route runs both of these in its
loader:

```ts
// Feeds the selected pill. No existence check -- it resolves ANY company row.
async function getAppliedCompany(companyFromSearch: string | null) {
  return db.selectFrom('companies')
    .select(['id', 'name', 'imageUrl'])
    .where((eb) => eb.or([
      eb('companies.id', '=', companyFromSearch),
      eb('companies.name', 'ilike', companyFromSearch),
    ]))
    .executeTakeFirst();
}

// Feeds the dropdown options. Only companies that have an offer OF THIS TYPE.
async function listAllCompanies() {
  return db.selectFrom('companies')
    .select(['id', 'name', 'imageUrl'])
    .where((eb) => eb.exists(() => {
      return eb.selectFrom('fullTimeOffers')   // 'internshipOffers' on the other tab
        .whereRef('fullTimeOffers.companyId', '=', 'companies.id');
    }))
    .orderBy('name', 'asc')
    .execute();
}
```

Both results are handed to the same component:

```tsx
<CompanyFilter
  allCompanies={allCompanies}         // <- the EXISTS-filtered list (dropdown)
  selectedCompany={appliedCompany}    // <- the unfiltered lookup (pill)
  emptyMessage="No companies found that are linked to full-time offers."
/>
```

**Why this never surfaced before.** Previously the only way to put a value into
`?company=` was to click an item in that tab's own dropdown (or hand-edit the
URL). So the selected company was, by construction, always a member of that
tab's option list. The two queries could not disagree in practice.

**What changes.** A company can now arrive in `?company=` from the *other* tab,
where it qualified under a different `EXISTS` check. Walking through it with
Amazon, which has internship offers but no full-time offers:

1. On **Internships**, pick Amazon from the dropdown. URL becomes
   `/offers/internships?company=14`. Pill reads "Amazon"; the table lists
   Amazon's internship offers.
2. Click **Full-Time**. URL becomes `/offers/full-time?company=14`.
3. `getAppliedCompany('14')` has no existence check, so it still resolves
   Amazon → **the pill still reads "Amazon"**.
4. `listAllCompanies()` requires an existing `fullTimeOffers` row, so
   **Amazon is not in the dropdown's options**.
5. The table is empty → the new message renders.
6. Open the Company dropdown: you see every company that *does* have full-time
   offers, and Amazon is not among them.

**The two visible symptoms.**

- *No checkmark anywhere in the list.* `FilterItem` decides whether to show its
  check icon with `selectedValues.some((v) => v.value === value)`
  (`packages/ui/src/components/filter.tsx:459`). Amazon is never rendered as an
  item, so nothing in the open dropdown appears selected — even though the pill
  right above it says a company is selected.
- *Searching for the selected company inside the dropdown returns "not found".*
  `CompanyFilterList` filters `allCompanies` by the search term and, on no
  matches, renders the `emptyMessage`. So typing "Amazon" into the Company
  filter on the Full-Time tab yields *"No companies found that are linked to
  full-time offers."* while the pill still reads "Amazon".

**What still works correctly.** Nothing is broken or stuck:

- The pill renders with the correct name and logo, since it comes from the
  unrestricted lookup.
- The "x" on the pill clears the filter normally — its href is built by deleting
  `company` and `page` from the current URL (`filter.tsx:225-227`) and does not
  consult the options list at all.
- Picking a different company from the dropdown replaces the filter cleanly.
  The Company filter is single-select, so `FilterItem` runs
  `params.set(name, value)` (`filter.tsx:452`), overwriting the carried-over id
  rather than appending to it.
- The `Reset` button clears it too.

**Why it was left alone.** There is a reasonable argument that the current
behavior is *correct*: the dropdown's purpose is to pick a company that actually
has data on this tab, and listing companies with zero offers would produce
guaranteed-empty results. The counter-argument is that a selected value not
appearing in its own control is a UI smell a reviewer may well raise.

Resolving it either way means changing the loader queries or the component's
props — for example, unioning `appliedCompany` into `allCompanies`, or giving
`listAllCompanies()` an offer count per company and rendering zero-count entries
in a distinct style. Both are beyond the scope of "persist the filter across
tabs", and both are design decisions rather than mechanical fixes, so they are
flagged here for a maintainer to decide rather than made unilaterally.

### 3. The company filter now reaches the "Add Offer" link on both tabs

`AddOfferButton` (`apps/member-profile/app/shared/components/offer.tsx:18`)
already forwarded the entire current query string to the add-offer route:

```tsx
<Link to={{ pathname, search: searchParams.toString() }}>
```

That predates this change. The consequence of persisting `company` is that the
param now survives a tab switch and therefore reaches the *other* tab's add
link as well — e.g. `/offers/full-time/add?company=14` after switching over from
Internships. This appears harmless, and arguably helpful, since the add routes
read `company` for prefill. Noted only because this change widened the set of
URLs where it occurs.

---

## Verification

`bun run type-check --filter @oyster/member-profile` — **passed**
(`react-router typegen && tsc --noEmit`).

`bun run lint --filter @oyster/member-profile` — **passed** (eslint, no warnings).

All four states were then exercised against the running dev server on
`localhost:3000` with an authenticated session. Local seed data at the time:
Amazon (id `14`) had internship offers only, Meta (`16`) full-time only, and
Microsoft (`17`) had both.

| Case | URL | Result |
|---|---|---|
| Company with data in this tab | `/offers/full-time?company=17` | Table renders Microsoft's offers; no empty message |
| Company with no data in this tab | `/offers/internships?company=16` | "No record exists for internship offers at Meta yet." |
| Mirror case, other tab | `/offers/full-time?company=14` | "No record exists for full-time offers at Amazon yet." |
| Tab links carry the filter | `/offers/full-time?company=14` | Rendered HTML contains `href="/offers/internships?company=14"` and `href="/offers/full-time?company=14"` |
| No filter applied | `/offers/internships` | Links render as bare `href="/offers/internships"` and `href="/offers/full-time"` — no stray `?` |

### Regression checks

Run afterwards to confirm the change forwards only `company` and does not break
adjacent behavior.

**Full monorepo suites:** `bun run type-check` (9/9 packages passed) and
`bun run test` (2/2 passed). No test in the repo touches the offers routes — it
only contains two test files, `packages/utils/src/index.test.ts` and
`packages/core/src/modules/members/queries/list-emails.test.ts`.

**Every filter param set at once.** Loading

```
/offers/internships?company=14&hourlyRate=40-50&location=Seattle,%20WA&page=2&limit=10
```

produced exactly these two tab links:

```
href="/offers/full-time?company=14"
href="/offers/internships?company=14"
```

`hourlyRate`, `location`, `page`, and `limit` were all dropped, confirming the
forwarding is limited to `company`.

That page also contains three longer hrefs, which are **not** from this change
and should not be mistaken for it — they are the filter pills' own "x" links
from `FilterTrigger`, each of which removes one filter and `page`:

```
href="/offers/internships?company=14&hourlyRate=40-50&limit=10"
href="/offers/internships?company=14&location=Seattle,+WA&limit=10"
href="/offers/internships?hourlyRate=40-50&location=Seattle,+WA&limit=10"
```

**Edge cases:**

| Case | URL | Result |
|---|---|---|
| Company id matching no row | `?company=999999` | `appliedCompany` is `undefined`, so it falls back to the generic copy — does **not** render "at undefined" |
| Empty param value | `?company=` | Empty string is falsy, so links render bare with no stray `?` |
| Detail modal open | `/offers/internships/:id?company=14` | Tab links still carry `?company=14`; modal renders unaffected |

**Reviewed but unchanged by this work:**

- `ResetFiltersButton` — with only `company` set, `searchParams.size === 1` and
  the key is not `page`, so the button renders and `setSearchParams({})` clears
  it, exactly as before.
- Mixpanel `Page Viewed` tracking — both loaders gate on
  `new URL(request.url).pathname`, which excludes the query string, so adding
  `?company=` does not affect whether the event fires.
- All 13 other references to `Route['/offers/internships']` and
  `Route['/offers/full-time']` across the app were grepped and inspected. Every
  one is a redirect target or a modal-close destination in the add / edit /
  delete / detail routes. None were modified.

---

## Files changed

| File | Change |
|---|---|
| `apps/member-profile/app/routes/_profile.offers.tsx` | Import `useSearchParams`; `OffersNavigation` appends `?company=` to both tab links |
| `apps/member-profile/app/routes/_profile.offers.internships.tsx` | Destructure `appliedCompany`; compute `emptyMessage`; pass it to `<Table />` |
| `apps/member-profile/app/routes/_profile.offers.full-time.tsx` | Same as above, with full-time wording and the `totalCompensation` filter check |

### Unrelated incidental change

`bun.lock` picked up a single `"configVersion": 0` line from running
`bun install` locally. It is not part of this work and can be reverted with
`git checkout bun.lock` before committing.

### Note on this file

`changes.md` is a working document produced for this task. It is **not** part of
the repository's documentation set and should be deleted or kept out of the
commit before opening the pull request.
