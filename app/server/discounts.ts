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
  // Legacy aliases so existing callers don't need immediate updates
  totalPriceCents: number;
  hourlyRateCents: number;
}

const HOLIDAYS: Array<{ month: number; day: number }> = [
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

function reservationSpansHoliday(start: DateTime, end: DateTime): boolean {
  const startDay = start.startOf("day");
  const endDay = end.startOf("day");
  let d = startDay.plus({ days: 1 });
  while (d < endDay) {
    if (HOLIDAYS.some((h) => h.month === d.month && h.day === d.day)) {
      return true;
    }
    d = d.plus({ days: 1 });
  }
  return false;
}

export function computeDiscount(
  start: DateTime,
  end: DateTime,
  hourlyRateCents: number,
): QuoteResult {
  const durationInHours = end.diff(start, "hours").hours || 0;
  const originalTotalPriceCents = hourlyRateCents * durationInHours;

  const holidayQualifies = reservationSpansHoliday(start, end);
  const longRentalQualifies = durationInHours > 72;

  const holidayDiscountAmount = Math.round(originalTotalPriceCents * 0.17);
  const holidayTotal = originalTotalPriceCents - holidayDiscountAmount;

  const effectiveLongRentalRate = Math.max(0, hourlyRateCents - 1000);
  const longRentalTotal = effectiveLongRentalRate * durationInHours;
  const longRentalDiscountAmount = originalTotalPriceCents - longRentalTotal;

  let discountType: DiscountType = "NONE";
  let discountedTotalPriceCents = originalTotalPriceCents;
  let discountAmountCents = 0;
  let effectiveHourlyRateCents = hourlyRateCents;

  if (holidayQualifies && longRentalQualifies) {
    if (longRentalTotal < holidayTotal) {
      discountType = "LONG_RENTAL";
      discountedTotalPriceCents = longRentalTotal;
      discountAmountCents = longRentalDiscountAmount;
      effectiveHourlyRateCents = effectiveLongRentalRate;
    } else {
      discountType = "HOLIDAY";
      discountedTotalPriceCents = holidayTotal;
      discountAmountCents = holidayDiscountAmount;
    }
  } else if (holidayQualifies) {
    discountType = "HOLIDAY";
    discountedTotalPriceCents = holidayTotal;
    discountAmountCents = holidayDiscountAmount;
  } else if (longRentalQualifies) {
    discountType = "LONG_RENTAL";
    discountedTotalPriceCents = longRentalTotal;
    discountAmountCents = longRentalDiscountAmount;
    effectiveHourlyRateCents = effectiveLongRentalRate;
  }

  return {
    durationInHours,
    originalHourlyRateCents: hourlyRateCents,
    effectiveHourlyRateCents,
    originalTotalPriceCents,
    discountedTotalPriceCents,
    discountAmountCents,
    discountType,
    totalPriceCents: discountedTotalPriceCents,
    hourlyRateCents: effectiveHourlyRateCents,
  };
}
