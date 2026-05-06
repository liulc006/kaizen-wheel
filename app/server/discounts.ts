import { DateTime } from "luxon";

export type DiscountType = "NONE" | "HOLIDAY" | "LONG_RENTAL";

export interface QuoteResult {
  durationInHours: number;
  originalHourlyRateCents: number;
  effectiveHourlyRateCents: number;
  originalTotalPriceCents: number;
  discountedTotalPriceCents: number;
  discountAmountCents: number;
  discountType: DiscountType;
}

const HOLIDAY_DISCOUNT_RATE = 0.17;
const LONG_RENTAL_HOURLY_DISCOUNT_CENTS = 1_000; // $10/hr in cents
const LONG_RENTAL_THRESHOLD_HOURS = 72;          // > 3 days

export const HOLIDAYS: ReadonlyArray<{ month: number; day: number }> = [
  { month: 1,  day: 21 },
  { month: 2,  day: 12 },
  { month: 3,  day: 4  },
  { month: 5,  day: 2  },
  { month: 6,  day: 16 },
  { month: 7,  day: 26 },
  { month: 8,  day: 3  },
  { month: 9,  day: 1  },
  { month: 11, day: 5  },
  { month: 12, day: 18 },
];

function isHoliday(date: DateTime): boolean {
  return HOLIDAYS.some((h) => h.month === date.month && h.day === date.day);
}

// Returns true when at least one holiday falls strictly between start and end
// (a reservation that starts or ends on a holiday does not qualify).
export function reservationSpansHoliday(start: DateTime, end: DateTime): boolean {
  const startDay = start.startOf("day");
  const endDay = end.startOf("day");
  let d = startDay.plus({ days: 1 });
  while (d < endDay) {
    if (isHoliday(d)) return true;
    d = d.plus({ days: 1 });
  }
  return false;
}

type DiscountCandidate = {
  discountType: Exclude<DiscountType, "NONE">;
  effectiveHourlyRateCents: number;
  discountedTotalPriceCents: number;
  discountAmountCents: number;
};

function buildHolidayCandidate(
  originalHourlyRateCents: number,
  originalTotalPriceCents: number,
): DiscountCandidate {
  const discountAmountCents = Math.round(originalTotalPriceCents * HOLIDAY_DISCOUNT_RATE);
  return {
    discountType: "HOLIDAY",
    effectiveHourlyRateCents: originalHourlyRateCents,
    discountedTotalPriceCents: originalTotalPriceCents - discountAmountCents,
    discountAmountCents,
  };
}

function buildLongRentalCandidate(
  originalHourlyRateCents: number,
  durationInHours: number,
  originalTotalPriceCents: number,
): DiscountCandidate {
  const effectiveHourlyRateCents = Math.max(
    0,
    originalHourlyRateCents - LONG_RENTAL_HOURLY_DISCOUNT_CENTS,
  );
  const discountedTotalPriceCents = effectiveHourlyRateCents * durationInHours;
  return {
    discountType: "LONG_RENTAL",
    effectiveHourlyRateCents,
    discountedTotalPriceCents,
    discountAmountCents: originalTotalPriceCents - discountedTotalPriceCents,
  };
}

export function computeDiscount(
  start: DateTime,
  end: DateTime,
  hourlyRateCents: number,
): QuoteResult {
  const durationInHours = end.diff(start, "hours").hours || 0;
  const originalTotalPriceCents = hourlyRateCents * durationInHours;

  const candidates: DiscountCandidate[] = [];

  if (reservationSpansHoliday(start, end)) {
    candidates.push(buildHolidayCandidate(hourlyRateCents, originalTotalPriceCents));
  }
  if (durationInHours > LONG_RENTAL_THRESHOLD_HOURS) {
    candidates.push(buildLongRentalCandidate(hourlyRateCents, durationInHours, originalTotalPriceCents));
  }

  // Pick lowest total; ties go to holiday (it appears first in candidates).
  const best = candidates.reduce<DiscountCandidate | null>(
    (winner, c) =>
      winner === null || c.discountedTotalPriceCents < winner.discountedTotalPriceCents
        ? c
        : winner,
    null,
  );

  if (best === null) {
    return {
      durationInHours,
      originalHourlyRateCents: hourlyRateCents,
      effectiveHourlyRateCents: hourlyRateCents,
      originalTotalPriceCents,
      discountedTotalPriceCents: originalTotalPriceCents,
      discountAmountCents: 0,
      discountType: "NONE",
    };
  }

  return {
    durationInHours,
    originalHourlyRateCents: hourlyRateCents,
    originalTotalPriceCents,
    ...best,
  };
}
