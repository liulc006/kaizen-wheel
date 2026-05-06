# Decisions

# Part 1
## Price filter bug fix

The root cause was a sentinel-value design in `api.ts` where a slider value of exactly `100` was hard-coded to mean "no upper limit" (`Number.MAX_SAFE_INTEGER`), while the slider's `max` prop was also `100` — making it impossible for users to set a real $100/hr cap. The fix replaces the upper slider thumb with a free-form number input whose empty state maps to `null`, which `api.ts` now treats as "no upper limit" instead of relying on a magic number. This eliminates the sentinel entirely and allows users to enter any arbitrary maximum (e.g. $125/hr) rather than being constrained to $10 increments ending at $100.

## Reset All bug

While fixing the price filter, the `disabled` guard on the "Reset all" button was found to check `form.getValues().make === undefined`, but the field's default value is an array of all makes — never `undefined` — so the button was permanently enabled regardless of state. The fix replaces all `form.getValues()` calls in the guard with `form.watch()` subscriptions, making the disabled state reactive, and corrects the make/classification checks to compare array lengths against the defaults from `filterOptions`.

## Future improvement: free-form min price input

The min price is still controlled by a slider capped at $200, meaning users cannot express a minimum above that value (e.g. "show me only vehicles over $250/hr"). A natural follow-up would be to replace the min slider with a free-form number input mirroring the max price input, with symmetric validation ensuring min stays below max. This would also remove the hard-coded `min={10}` floor, which currently silently excludes any future vehicles priced below $10/hr.
