# Decisions

# Part 1
## Price filter bug fix

The root cause was a sentinel-value design in `api.ts` where a slider value of exactly `100` was hard-coded to mean "no upper limit" (`Number.MAX_SAFE_INTEGER`), while the slider's `max` prop was also `100` — making it impossible for users to set a real $100/hr cap. The fix replaces the upper slider thumb with a free-form number input whose empty state maps to `null`, which `api.ts` now treats as "no upper limit" instead of relying on a magic number. This eliminates the sentinel entirely and allows users to enter any arbitrary maximum (e.g. $125/hr) rather than being constrained to $10 increments ending at $100.

## Reset All bug

While fixing the price filter, the `disabled` guard on the "Reset all" button was found to check `form.getValues().make === undefined`, but the field's default value is an array of all makes — never `undefined` — so the button was permanently enabled regardless of state. The fix replaces all `form.getValues()` calls in the guard with `form.watch()` subscriptions, making the disabled state reactive, and corrects the make/classification checks to compare array lengths against the defaults from `filterOptions`.

## Future improvement: free-form min price input

---

# Part 2 and 3
## Discount feature refactor

After the initial implementation, a code-review pass identified several issues worth cleaning up before the feature could be considered production-ready.

The `calculateTotalPrice` wrapper in `api.ts` was a dead one-liner that simply re-called `computeDiscount` under a misleading name — it was removed and `getQuote` now calls `computeDiscount` directly. The `const parsedPriceMin = priceMin` no-op assignment was also removed. The Luxon `DateTime` validity check was changed from a brittle string comparison (`toString() === "Invalid Date"`) to the documented `.isValid` property. The legacy aliases `totalPriceCents` and `hourlyRateCents` on `QuoteResult` — originally added as a migration shim — were removed once the one remaining consumer (`ReviewPage.tsx`) was updated to use `discountedTotalPriceCents`.

In `discounts.ts`, the repeated holiday/long-rental assignment blocks were extracted into `buildHolidayCandidate` and `buildLongRentalCandidate` helper functions, eliminating the duplicated mutation logic. Magic numbers were replaced with named constants (`HOLIDAY_DISCOUNT_RATE`, `LONG_RENTAL_HOURLY_DISCOUNT_CENTS`, `LONG_RENTAL_THRESHOLD_HOURS`). The conflict-resolution if/else chain was replaced with a `candidates.reduce` that picks the lower total, making the tie-break rule (holiday wins on equal totals) explicit by insertion order rather than a hidden else. `reservationSpansHoliday` was exported so it could be tested in isolation. Vitest was added as the test runner (`npm test`) and 21 tests were written covering every branch: no discount, holiday-only, long-rental-only, both-qualify with each winner, tie-break, rate-floor edge cases, year-boundary spans, and the intentional exclusion of start/end days.

## What I would have done differently

**Show total price on search cards.** The search results currently show a per-hour rate, which forces customers to do mental arithmetic to understand what they will actually pay for the dates they selected. Displaying the total cost for the chosen time window directly on each card — alongside the hourly rate — removes that friction and makes the discount savings immediately concrete (e.g. "was $1,440 → $1,195" rather than just a "17% off" badge). This matters especially for holiday and long-rental discounts where the saving is only visible in the total, not the hourly rate.

**Document the feature in a PRD before building.** For a feature that introduces new business rules (discount eligibility, conflict resolution, tie-breaking), writing a short PRD first with the PM agent would have produced a single company-level record of why each decision was made. Without it, the reasoning lives only in this file and in commit messages. A PRD would also have caught the ambiguity around whether a rental that starts or ends on a holiday qualifies before implementation, avoiding back-and-forth during code review.

The min price is still controlled by a slider capped at $200, meaning users cannot express a minimum above that value (e.g. "show me only vehicles over $250/hr"). A natural follow-up would be to replace the min slider with a free-form number input mirroring the max price input, with symmetric validation ensuring min stays below max. This would also remove the hard-coded `min={10}` floor, which currently silently excludes any future vehicles priced below $10/hr.

---

# Bonus
## Drop-off date UX

The drop-off date calendar currently disables only past dates, allowing users to select a drop-off before their pick-up with no visible error — the app silently returns empty results, which looks like no vehicles are available rather than an invalid date range. The drop-off calendar should be correlated to the pick-up selection, disabling any date before the chosen pick-up date and ideally defaulting to the next available day, so the two fields guide the user toward a valid range rather than punishing them after the fact.
