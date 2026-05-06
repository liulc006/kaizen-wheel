import { FormValues } from "@/components/search/form.tsx";
import { Button } from "@/components/shared/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shared/ui/form";
import { Input } from "@/components/shared/ui/input";
import { Slider } from "@/components/shared/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/shared/ui/toggle-group";
import { formatDollars } from "@/lib/formatters.tsx";
import { FilterOptions } from "@/server/api";
import { useFormContext } from "react-hook-form";

export function AdditionalFilters({ filterOptions }: { filterOptions: FilterOptions }) {
  const form = useFormContext<FormValues>();

  const price = form.watch("price");
  const minPassengers = form.watch("minPassengers");
  const make = form.watch("make");
  const classification = form.watch("classification");

  const minPrice = price[0];
  const maxPrice = price[1];

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-xl font-semibold">Filters</h3>
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="flex w-full items-baseline justify-between mb-4">
              <FormLabel>Price</FormLabel>
              <div className="text-sm">
                {formatDollars(minPrice)} min —{" "}
                {maxPrice === null ? "no limit" : `${formatDollars(maxPrice)} max`}
              </div>
            </div>
            <FormControl>
              <Slider
                min={10}
                max={maxPrice !== null ? Math.max(maxPrice, 10) : 200}
                step={10}
                value={[minPrice]}
                onValueChange={(value) => field.onChange([value[0], maxPrice])}
              />
            </FormControl>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Max $/hr
              </span>
              <Input
                type="number"
                min={1}
                step={10}
                placeholder="No limit"
                value={maxPrice === null ? "" : maxPrice}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    field.onChange([minPrice, null]);
                    return;
                  }
                  const parsed = Number(raw);
                  if (Number.isInteger(parsed) && parsed > 0) {
                    field.onChange([minPrice, parsed]);
                  }
                }}
                className="w-28"
              />
            </div>
            {maxPrice !== null && maxPrice < minPrice && (
              <p className="text-sm font-medium text-destructive">
                Max must be greater than min
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="minPassengers"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="flex w-full items-baseline justify-between mb-4">
              <FormLabel>Passengers</FormLabel>
              <div className="text-sm">{field.value}</div>
            </div>
            <FormControl>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[field.value]}
                onValueChange={(value) => field.onChange(value[0])}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="classification"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Class</FormLabel>
            <FormControl>
              <ToggleGroup
                type="multiple"
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-wrap justify-start"
              >
                {filterOptions.classifications.map((c) => (
                  <FormItem key={c}>
                    <FormControl>
                      <ToggleGroupItem variant="outline" value={c}>
                        {c}
                      </ToggleGroupItem>
                    </FormControl>
                  </FormItem>
                ))}
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="make"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Make</FormLabel>
            <FormControl>
              <ToggleGroup
                type="multiple"
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-wrap justify-start"
              >
                {filterOptions.makes.map((m) => (
                  <FormItem key={m}>
                    <FormControl>
                      <ToggleGroupItem variant="outline" value={m}>
                        {m}
                      </ToggleGroupItem>
                    </FormControl>
                  </FormItem>
                ))}
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          form.reset();
        }}
        className="mt-4"
        disabled={
          minPassengers === 1 &&
          make.length === filterOptions.makes.length &&
          classification.length === filterOptions.classifications.length &&
          price[0] === 10 &&
          price[1] === null
        }
      >
        Reset all
      </Button>
    </div>
  );
}
