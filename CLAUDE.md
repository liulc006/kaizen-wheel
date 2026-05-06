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
- `api.ts` — thin API surface (`searchVehicles`, `getQuote`) that delegates to `data_helpers` and computes pricing; `getQuote` calculates `durationInHours * hourlyRateCents`

### UI layer (`app/components/`)

- `search/SearchPage.tsx` — top-level search UI; owns form state (`FormValues`) and passes it down
- `search/TimeRangeFilters.tsx` — date/time range pickers
- `search/AdditionalFilters.tsx` — price slider (10–100 step 10), passengers, classification, make
- `search/VehicleList.tsx` — calls `API.searchVehicles()` and renders results
- `search/VehicleListItem.tsx` — individual vehicle card with "Reserve" button
- `review/ReviewPage.tsx` — checkout page; reads vehicle ID + times from query params, calls `API.getQuote()`
- `shared/` — `ErrorFallback`, `MiniPageLayout`, and re-exported shadcn/ui primitives

### Routing

Two routes: `/` (search, `app/page.tsx`) and `/review` (checkout, `app/review/page.tsx`). Navigation to review passes `vehicleId`, `startTime`, and `endTime` as URL query params.

### Price filter behavior

A slider value of `100` is treated as "no maximum" (converted to `Number.MAX_SAFE_INTEGER`) in `data_helpers.ts`.
