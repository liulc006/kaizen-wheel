# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run ts       # TypeScript type check (tsc --noEmit)
```

No test runner or linter is configured in this project.

## Path Aliases

`@/*` maps to `./app/*` (configured in `tsconfig.json` and `next.config.js`).

The shadcn/ui `utils` alias resolves to `@/lib/classnames` (not the typical `@/lib/utils`) — see `components.json`.

## Architecture

**Kaizen Wheels** is a Next.js 16 vehicle rental app (TypeScript, Tailwind CSS, shadcn/ui). All data is in-memory — there is no external backend.

### Data layer (`app/server/`)

- `data.ts` — static vehicle and reservation arrays with TypeScript types (`Vehicle`, `Reservation`)
- `data_helpers.ts` — pure filter logic: `getAvailableVehicles()` takes search criteria and returns matching vehicles by checking time-overlap against existing reservations and applying price/passenger/class/make filters
- `discounts.ts` — discount logic: `HOLIDAYS` constant (10 fictional month/day pairs), `computeDiscount()` returns a `QuoteResult` with original/effective rates, discount type, and savings amount
- `api.ts` — thin API surface (`searchVehicles`, `getQuote`) that delegates to `data_helpers` and `discounts`; exports `QuoteResult`, `DiscountType`, and `SearchVehiclesResult` types

### UI layer (`app/components/`)

- `search/SearchPage.tsx` — top-level search UI; owns form state (`FormValues`) and passes it down
- `search/TimeRangeFilters.tsx` — date/time range pickers
- `search/AdditionalFilters.tsx` — price min slider (10–200 step 10) + free-form max number input, passengers, classification, make
- `search/VehicleList.tsx` — calls `API.searchVehicles()`, receives `quotesByVehicleId`, and passes each vehicle's `QuoteResult` to `VehicleListItem`
- `search/VehicleListItem.tsx` — individual vehicle card; shows struck-through rate + discount badge when a discount applies
- `review/ReviewPage.tsx` — checkout page; reads vehicle ID + times from query params, calls `API.getQuote()`; shows discount label, savings amount, and struck-through original total when a discount applies
- `shared/` — `ErrorFallback`, `MiniPageLayout`, and re-exported shadcn/ui primitives

### Routing

Two routes: `/` (search, `app/page.tsx`) and `/review` (checkout, `app/review/page.tsx`). Navigation to review passes `vehicleId`, `startTime`, and `endTime` as URL query params.

### Discount behavior

Two mutually exclusive discounts are computed by `computeDiscount()` in `discounts.ts` and surfaced through `getQuote` and `searchVehicles`:

- **Holiday discount (17% off total):** applies when the reservation spans at least one holiday strictly between the start and end dates (a reservation that starts or ends on a holiday does not qualify). Multiple holidays in range still yield a single 17% discount.
- **Long-rental discount (−$10/hr):** applies when `durationInHours > 72`. The effective hourly rate is floored at 0.
- **Conflict rule:** when both qualify, the discount producing the lower total wins; ties go to the holiday discount.

`QuoteResult` carries `originalHourlyRateCents`, `effectiveHourlyRateCents`, `originalTotalPriceCents`, `discountedTotalPriceCents`, `discountAmountCents`, and `discountType` (`"NONE" | "HOLIDAY" | "LONG_RENTAL"`). The legacy fields `totalPriceCents` and `hourlyRateCents` are aliases for the discounted values.

The price filter in `getAvailableVehicles` compares against the **original** `hourly_rate_cents`, not the discounted rate.

### Price filter behavior

`FormValues.price` is a `[number, number | null]` tuple. The first element is the minimum (driven by a slider); the second is the maximum, set via a free-form number input where an empty field stores `null`. In `api.ts`, `priceMax === null` is converted to `Number.MAX_SAFE_INTEGER` before being passed to `data_helpers.ts`, meaning null represents "no upper limit". If `priceMax` is set but less than `priceMin`, `VehicleList` skips the search and shows a prompt to adjust the range.
