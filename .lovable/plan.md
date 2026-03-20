

# Smooth chart scaling when filters change

## Problem
When parties are filtered out, they're completely removed from the chart data array. Recharts can only animate between old and new values for **existing** data points — if a data point disappears, the bar just vanishes. Similarly, when a party is added back, it pops in without transition.

Additionally, when status filters change, the filtered `promises` array excludes those promises entirely, so bars shrink by having fewer promises counted — but since the data keys stay the same, this part should already animate. The main issue is **party filtering removing data points**.

## Solution
Always include **all parties** in the chart data, but set their values to `0` when they're filtered out. This way Recharts keeps all bars mounted and animates them scaling down to zero / back up.

### Changes in `TimelineComparison.tsx`

1. **Accept active party filters as a prop** (or consume `useFilters()` directly) to know which parties are selected.

2. **Always generate data for all 8 parties** in `partyChartData` — if a party has no promises in the filtered set, its values are all `0`. This ensures bars animate to/from zero rather than appearing/disappearing.

3. **Consume `useFilters` directly** in `TimelineComparison` instead of threading a new prop, since the filter context is already available. Use `selectedParties` to determine visibility — but importantly, the component already receives `filteredPromises` which are filtered by party. So instead, we change the approach: the component should receive **all promises** and apply party/status filtering internally, keeping all party slots in the data array.

### Revised approach (simpler)

Rather than changing the data flow, we keep the current `filteredPromises` prop but **pad the chart data** to always include all parties:

- After computing `partyChartData` from the filtered promises, ensure all 8 parties from `partyOrder` are present with zero-filled entries for missing ones
- This is ~5 lines of code: loop over `partyOrder`, if a party isn't in `partyChartData`, push a zeroed entry

### Files changed
| File | Change |
|------|--------|
| `src/components/TimelineComparison.tsx` | After line ~168 (where `partyChartData` is built), add padding logic to ensure all parties in `partyOrder` are always present with zero values |

This is a ~8-line addition to one file.

