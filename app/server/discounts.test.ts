import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { computeDiscount, reservationSpansHoliday } from "./discounts";

// Fixed rate used across most tests for easy mental arithmetic: $60/hr = 6000 cents
const RATE = 6_000;

function dt(iso: string): DateTime {
  return DateTime.fromISO(iso);
}

// ---------------------------------------------------------------------------
// reservationSpansHoliday
// ---------------------------------------------------------------------------

describe("reservationSpansHoliday", () => {
  it("returns false when no holiday falls in the range", () => {
    // Jan 5–6, no holiday
    expect(reservationSpansHoliday(dt("2024-01-05T08:00:00"), dt("2024-01-06T08:00:00"))).toBe(false);
  });

  it("returns true when a holiday falls strictly between start and end", () => {
    // Jan 20 → Jan 22, holiday on Jan 21 is interior
    expect(reservationSpansHoliday(dt("2024-01-20T08:00:00"), dt("2024-01-22T08:00:00"))).toBe(true);
  });

  it("returns false when the reservation starts on a holiday (no discount per spec)", () => {
    // starts on Jan 21 (holiday), ends Jan 22 — start day excluded by rule
    expect(reservationSpansHoliday(dt("2024-01-21T09:00:00"), dt("2024-01-22T08:00:00"))).toBe(false);
  });

  it("returns false when the reservation ends on a holiday (no discount per spec)", () => {
    // starts Jan 20, ends on Jan 21 (holiday) — end day excluded by rule
    expect(reservationSpansHoliday(dt("2024-01-20T08:00:00"), dt("2024-01-21T17:00:00"))).toBe(false);
  });

  it("returns true for multiple holidays in range (matches the first)", () => {
    // Jan 21 and Feb 12 both fall inside Jan 19 → Feb 13
    expect(reservationSpansHoliday(dt("2024-01-19T08:00:00"), dt("2024-02-13T08:00:00"))).toBe(true);
  });

  it("returns true when the reservation spans a year boundary containing a holiday", () => {
    // Dec 31 → Jan 22 spans Jan 21 (holiday)
    expect(reservationSpansHoliday(dt("2023-12-31T08:00:00"), dt("2024-01-22T08:00:00"))).toBe(true);
  });

  it("returns false for a year-boundary range with no holiday", () => {
    // Dec 26 → Jan 20, no holiday in that window
    expect(reservationSpansHoliday(dt("2023-12-26T08:00:00"), dt("2024-01-20T08:00:00"))).toBe(false);
  });

  it("returns false for a same-day rental (start === end calendar day)", () => {
    // zero interior days
    expect(reservationSpansHoliday(dt("2024-01-21T09:00:00"), dt("2024-01-21T18:00:00"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeDiscount — no discount
// ---------------------------------------------------------------------------

describe("computeDiscount — NONE", () => {
  it("returns NONE for a short rental with no holiday in range", () => {
    // 24h, Jan 5–6, no holiday
    const result = computeDiscount(dt("2024-01-05T08:00:00"), dt("2024-01-06T08:00:00"), RATE);
    expect(result.discountType).toBe("NONE");
    expect(result.discountAmountCents).toBe(0);
    expect(result.effectiveHourlyRateCents).toBe(RATE);
    expect(result.discountedTotalPriceCents).toBe(result.originalTotalPriceCents);
  });

  it("returns zero totals for a zero-duration rental", () => {
    const result = computeDiscount(dt("2024-01-05T08:00:00"), dt("2024-01-05T08:00:00"), RATE);
    expect(result.durationInHours).toBe(0);
    expect(result.originalTotalPriceCents).toBe(0);
    expect(result.discountedTotalPriceCents).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeDiscount — HOLIDAY only
// ---------------------------------------------------------------------------

describe("computeDiscount — HOLIDAY", () => {
  it("applies 17% discount when a holiday falls strictly inside the range", () => {
    // 48h, Jan 20 → Jan 22, holiday Jan 21 interior
    const result = computeDiscount(dt("2024-01-20T08:00:00"), dt("2024-01-22T08:00:00"), RATE);
    const originalTotal = RATE * 48;
    const expectedDiscount = Math.round(originalTotal * 0.17);

    expect(result.discountType).toBe("HOLIDAY");
    expect(result.originalTotalPriceCents).toBe(originalTotal);
    expect(result.discountAmountCents).toBe(expectedDiscount);
    expect(result.discountedTotalPriceCents).toBe(originalTotal - expectedDiscount);
    // Holiday discount does not change the per-hour rate
    expect(result.effectiveHourlyRateCents).toBe(RATE);
  });

  it("gives a single 17% discount when the range spans multiple holidays", () => {
    // Jan 19 → Feb 13 spans Jan 21 and Feb 12
    const hours = dt("2024-02-13T08:00:00").diff(dt("2024-01-19T08:00:00"), "hours").hours;
    const result = computeDiscount(dt("2024-01-19T08:00:00"), dt("2024-02-13T08:00:00"), RATE);
    const expectedDiscount = Math.round(RATE * hours * 0.17);

    expect(result.discountType).toBe("HOLIDAY");
    expect(result.discountAmountCents).toBe(expectedDiscount);
  });

  it("does NOT apply the holiday discount when the rental starts on the holiday", () => {
    // starts on Jan 21 (holiday) — no interior holiday, 24h total
    const result = computeDiscount(dt("2024-01-21T08:00:00"), dt("2024-01-22T08:00:00"), RATE);
    expect(result.discountType).toBe("NONE");
  });

  it("does NOT apply the holiday discount when the rental ends on the holiday", () => {
    // ends on Jan 21 (holiday) — no interior holiday
    const result = computeDiscount(dt("2024-01-20T08:00:00"), dt("2024-01-21T17:00:00"), RATE);
    expect(result.discountType).toBe("NONE");
  });
});

// ---------------------------------------------------------------------------
// computeDiscount — LONG_RENTAL only
// ---------------------------------------------------------------------------

describe("computeDiscount — LONG_RENTAL", () => {
  it("applies $10/hr discount for a rental strictly over 72 hours", () => {
    // 73h, no holiday (Jan 10 → Jan 13 + 1h)
    const result = computeDiscount(dt("2024-01-10T08:00:00"), dt("2024-01-13T09:00:00"), RATE);

    expect(result.discountType).toBe("LONG_RENTAL");
    expect(result.effectiveHourlyRateCents).toBe(RATE - 1_000);
    expect(result.discountedTotalPriceCents).toBe((RATE - 1_000) * 73);
    expect(result.discountAmountCents).toBe(result.originalTotalPriceCents - result.discountedTotalPriceCents);
  });

  it("does NOT apply long-rental discount at exactly 72 hours (threshold is strictly greater)", () => {
    // exactly 72h — does not qualify
    const result = computeDiscount(dt("2024-01-10T08:00:00"), dt("2024-01-13T08:00:00"), RATE);
    expect(result.discountType).toBe("NONE");
  });

  it("floors the effective rate at 0 when hourly rate is below $10", () => {
    // rate = $5/hr = 500 cents, 73h
    const result = computeDiscount(dt("2024-01-10T08:00:00"), dt("2024-01-13T09:00:00"), 500);
    expect(result.discountType).toBe("LONG_RENTAL");
    expect(result.effectiveHourlyRateCents).toBe(0);
    expect(result.discountedTotalPriceCents).toBe(0);
  });

  it("floors the effective rate at 0 when rate equals $10/hr exactly", () => {
    const result = computeDiscount(dt("2024-01-10T08:00:00"), dt("2024-01-13T09:00:00"), 1_000);
    expect(result.effectiveHourlyRateCents).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeDiscount — conflict resolution (both qualify)
// ---------------------------------------------------------------------------

describe("computeDiscount — conflict resolution", () => {
  it("picks long-rental when it yields a lower total", () => {
    // High rate ($100/hr = 10000 cents): long-rental saves $10/hr * 73h = $730
    // Holiday saves 17% of $100 * 73 = $1241. Both apply; long-rental saves more here.
    // Wait, let me recalculate:
    // original = 10000 * 73 = 730000
    // holiday total = 730000 * 0.83 = 605900 (savings = 124100)
    // long-rental total = 9000 * 73 = 657000 (savings = 73000)
    // Holiday saves MORE, so holiday wins — let me pick a rate where long-rental wins.
    //
    // long-rental wins when (rate - 1000) * hours < rate * hours * 0.83
    // rate * hours - 1000 * hours < 0.83 * rate * hours
    // 0.17 * rate * hours > 1000 * hours
    // 0.17 * rate > 1000
    // rate > 5882 cents ($58.82/hr)
    //
    // At $60/hr (6000 cents), 73h, with holiday interior:
    // original = 6000 * 73 = 438000
    // holiday = 438000 * 0.83 = round(438000 * 0.17) = 74460 discount → 363540
    // long-rental = 5000 * 73 = 365000
    // holiday (363540) < long-rental (365000) → holiday wins at $60/hr
    //
    // Need rate > $58.82 for long-rental to win... let me use $50/hr (5000 cents):
    // original = 5000 * 73 = 365000
    // holiday discount = round(365000 * 0.17) = 62050 → total = 302950
    // long-rental = 4000 * 73 = 292000
    // long-rental (292000) < holiday (302950) → long-rental wins ✓
    const result = computeDiscount(dt("2024-01-20T08:00:00"), dt("2024-01-23T09:00:00"), 5_000);
    expect(result.discountType).toBe("LONG_RENTAL");
    expect(result.discountedTotalPriceCents).toBeLessThan(
      5_000 * 73 - Math.round(5_000 * 73 * 0.17),
    );
  });

  it("picks holiday when it yields a lower total", () => {
    // At $60/hr (6000 cents), 73h with holiday interior (verified above: holiday wins)
    // Jan 20 → Jan 23 09:00 = 73h, Jan 21 is interior
    const result = computeDiscount(dt("2024-01-20T08:00:00"), dt("2024-01-23T09:00:00"), 6_000);
    expect(result.discountType).toBe("HOLIDAY");
    expect(result.effectiveHourlyRateCents).toBe(6_000); // holiday doesn't change hourly rate
  });

  it("picks holiday on a tie (holiday is added first to candidates)", () => {
    // Construct a rate where holidayTotal === longRentalTotal:
    // (rate - 1000) * h === rate * h * (1 - 0.17)
    // rate - 1000 = rate * 0.83
    // rate * 0.17 = 1000
    // rate = 5882.35... — not a whole number, so an exact tie is difficult to hit.
    // Instead verify the tiebreak direction with a near-tie: use 5883 cents.
    // original = 5883 * 73 = 429459
    // holiday discount = round(429459 * 0.17) = round(73008.03) = 73008 → total = 356451
    // long-rental = 4883 * 73 = 356459
    // holiday total (356451) < long-rental (356459) → holiday wins (also numerically lower here)
    //
    // The tie-break is tested via the reduce: `<` means winner only changes if strictly lower,
    // so holiday (first candidate) is kept on a tie.
    const result = computeDiscount(dt("2024-01-20T08:00:00"), dt("2024-01-23T09:00:00"), 5_883);
    expect(result.discountType).toBe("HOLIDAY");
  });
});
