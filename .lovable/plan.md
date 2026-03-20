

# Smooth chart transitions on filter change

## What you want
When filters change, bars and lines should smoothly animate from their old size/position to the new one — the same fluid transition you see when resizing the browser window. Not a replay of the initial mount animation.

## How it works
Recharts already does this **by default**. When the data array passed to `ComposedChart` updates (same component instance, new values), bars and lines transition smoothly between old and new values. The key requirement is that the chart component must **not** remount — it must stay mounted and receive new props.

This should already be working in the current code since the data is derived from filtered promises via `useMemo`. If it's not animating, it's likely because the component unmounts/remounts due to tab switching or a parent key change.

## Changes in `TimelineComparison.tsx`

1. **Add explicit animation props** to all `<Bar>` and `<Line>` components to ensure smooth transitions:
   - `isAnimationActive={true}` (default, but explicit for clarity)
   - `animationDuration={600}` on bars, `animationDuration={800}` on lines
   - `animationEasing="ease-in-out"`

2. **Ensure no dynamic `key`** is set on `ComposedChart` or its parent `ChartContainer` — this would cause remounting instead of transitioning.

3. Apply the same props in **both** the bar-tab and area-tab chart instances (lines ~220–292 and ~296–390).

This is a single-file change adding ~3 props per `Bar`/`Line` element (~6–7 elements total).

