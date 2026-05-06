"use client"

import { VehicleDetails } from "@/components/review/VehicleDetails";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { Button } from "@/components/shared/ui/button";
import { Separator } from "@/components/shared/ui/separator";
import { formatCents } from "@/lib/formatters";
import { API } from "@/server/api";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { useSearchParams } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";
import { MiniPageLayout } from "../shared/MiniPageLayout";

function Timeline({ startDate, endDate }: { startDate: Date; endDate: Date }) {
  return (
    <div className="flex relative">
      <div className="absolute top-1.5 bottom-1.5 flex flex-col items-center">
        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white ring-1 z-10 ring-blue-400"></div>
        <div className="flex-grow border-l-2 border-dotted border-gray-300"></div>
        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white ring-1 z-10 ring-blue-400"></div>
        <div className="flex-grow border-l-2 border-dotted border-gray-300"></div>
        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white ring-1 z-10 ring-blue-400"></div>
      </div>
      <div className="flex flex-col justify-between gap-4 h-full ml-8">
        <div>
          <span className="text-sm text-gray-600">Pick-up</span>
          <p className="font-medium">{format(startDate, "PPpp")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Rental period</p>
        </div>
        <div>
          <span className="text-sm text-gray-600">Drop-off</span>
          <p className="font-medium">{format(endDate, "PPpp")}</p>
        </div>
      </div>
    </div>
  );
}

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (!id) {
    throw new Error("No reservation ID found");
  }

  const vehicle = API.getVehicle(id);

  const quote = API.getQuote({
    vehicleId: id,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  });

  const handleConfirm = () => {
    console.error("Not implemented");
  };

  const formattedDuration = formatDuration(
    intervalToDuration({
      start: startDate,
      end: endDate,
    }),
    { delimiter: ", " },
  );

  return (
    <div className="flex flex-col gap-8">
      <VehicleDetails vehicle={vehicle} />

      <Separator />

      <div className="space-y-6">
        <h3 className="text-2xl font-semibold mb-4">Reservation Summary</h3>
        <div className="grid grid-cols-2 gap-6">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-gray-600">Hourly Rate</dt>
              <dd className="flex items-baseline gap-2 flex-wrap">
                {quote.discountType === "LONG_RENTAL" && (
                  <span className="text-sm line-through text-gray-400">
                    {formatCents(quote.originalHourlyRateCents)}/hr
                  </span>
                )}
                <span className="text-lg">
                  {formatCents(quote.effectiveHourlyRateCents)}
                </span>
                <span className="text-xs text-gray-700">/hr</span>
                {quote.discountType === "LONG_RENTAL" && (
                  <span className="text-xs font-semibold text-green-700">(−$10/hr)</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Duration</dt>
              <dd>{formattedDuration}</dd>
            </div>
            {quote.discountType !== "NONE" && (
              <div>
                <dt className="text-sm text-gray-600">
                  {quote.discountType === "HOLIDAY"
                    ? "Holiday Discount (17% off)"
                    : "Long-Rental Discount (−$10/hr)"}
                </dt>
                <dd className="text-green-700 font-medium">
                  − {formatCents(quote.discountAmountCents)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-600">Total Cost</dt>
              <dd>
                {quote.discountType !== "NONE" && (
                  <span className="text-sm line-through text-gray-400 mr-2">
                    {formatCents(quote.originalTotalPriceCents)}
                  </span>
                )}
                <span className="text-2xl font-medium tracking-tight">
                  {formatCents(quote.totalPriceCents)}
                </span>
              </dd>
            </div>
          </dl>

          <Timeline startDate={startDate} endDate={endDate} />
        </div>

        <Button size="lg" className="w-full cursor-not-allowed" onClick={handleConfirm}>
          Confirm reservation
        </Button>
      </div>
    </div>
  );
}

export function ReviewPage() {
  return (
    <MiniPageLayout
      title="Almost there"
      subtitle="Your adventure is about to begin! Please confirm your reservation below."
    >
      <ErrorBoundary
        fallback={<ErrorFallback message="Failed to load reservation" />}
      >
        <Content />
      </ErrorBoundary>
    </MiniPageLayout>
  );
}
