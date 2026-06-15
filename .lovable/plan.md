**Problem found**

The app is not actually stable after the migration. The latest dev-server logs show the real recurring failure:

```text
Failed to run dependency scan
radix-ui (imported by /src/components/ui/toggle.tsx)
Cannot find module 'radix-ui' imported from '/src/components/ui/tooltip.tsx'
```

So the issue is not the previous TypeScript errors anymore. It is unresolved bare `radix-ui` imports in many shadcn UI files. This project already has the scoped Radix packages installed, and project memory explicitly says Radix primitives must be imported from scoped packages. The current code violates that rule in multiple files.

**Why it seemed to pass, then failed later**

Vite/TanStack Start can initially start or build parts of the app, then fail when dependency scanning or SSR module evaluation reaches a lazily imported UI file. Because the root route imports `TooltipProvider`, one missing bare `radix-ui` import can bring down SSR and produce the later 500/build failure.

**Files implicated**

Bare `radix-ui` imports currently appear in UI primitives such as:

- `src/components/ui/tooltip.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/item.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/radio-group.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/accordion.tsx`

**Fix plan**

1. **Replace every bare `radix-ui` import with scoped Radix imports**
   - Example: `import { Tooltip as TooltipPrimitive } from "radix-ui"` becomes `import * as TooltipPrimitive from "@radix-ui/react-tooltip"`.
   - Example: `import { Slot as SlotPrimitive } from "radix-ui"` becomes `import { Slot as SlotPrimitive } from "@radix-ui/react-slot"`.
   - Do this consistently across all affected `src/components/ui/*` files.

2. **Verify no unresolved aggregate imports remain**
   - Search the codebase for `from "radix-ui"` and `from 'radix-ui'`.
   - The result must be empty except unrelated text/comments.

3. **Fix the visible React 19 console warnings while touching the same area**
   - `src/components/icons/LaneChange.tsx` uses SVG attributes like `stroke-width`; convert them to React attributes: `strokeWidth`, `strokeLinecap`, `strokeLinejoin`.
   - Investigate the `inert=""` warning only if the source is in project code; otherwise leave dependency behavior alone.

4. **Add a stricter validation pass after edits**
   - Run the project’s normal build check once.
   - Then inspect fresh dev-server logs after the server has restarted, specifically for unresolved imports and SSR 500s.
   - Also re-run the `radix-ui` import search after build so the same issue cannot reappear unnoticed.

5. **Only then report success**
   - I will not call it “passing” based on a single short build output.
   - Success criteria: no bare `radix-ui` imports, no unresolved-import errors in dev logs, and the build command exits cleanly.