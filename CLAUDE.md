# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server at http://localhost:8080
npm run build    # production build
npm run lint     # ESLint
```

No test suite exists. Use `npm run build` to type-check and catch errors.

## What This Project Is

**Infriat** is a Swedish political promise tracker at [infriat.se](https://infriat.se). Users browse, filter, and analyze election promises made by Swedish parties, with AI-assisted status analysis (Google Gemini) and community voting on promise outcomes.

## Architecture & Data Flow

```
PDF manifest → ManifestUpload → analyze-manifest (Edge Fn + Gemini) → promises table
promises table → Index page → PromiseCard (with badges, admin actions)
              → Statistics / About pages
              → PromiseDetailOverlay (URL param: ?promise=<id>)
Community votes → status_suggestions table → Admin page review → status update
```

**Promise lifecycle**: `pending-analysis` → one of `infriat | delvis-infriat | utreds | ej-infriat | brutet` (set by `analyze-promise-status` Edge Function or Admin approval of community suggestions).

**Deep-link pattern**: selected promise lives in `?promise=<id>` query param (not path). The `/lofte/:id` route renders `Index` with the overlay open. `FilterContext` owns all other filter params (`parties`, `statuses`, `govStatus`, `categories`, `statusQuo`, `search`, `sort`, `period`) and syncs them to the URL using the `setSearchParams` callback form to avoid clobbering `?promise=`.

**Cloudflare Worker** (`cloudflare-worker/`): routes `infriat.se/lofte/*` — crawlers get OG metadata HTML from the `og-metadata` Edge Function; real users get the SPA transparently proxied from the Lovable CDN.

## Project-Specific Conventions

### Swedish domain language — use these exact strings
- Promise statuses (DB enum + UI): `infriat`, `delvis-infriat`, `utreds`, `ej-infriat`, `brutet`, `pending-analysis`
- Policy categories (DB enum): `valfard`, `halsa`, `utbildning`, `arbetsmarknad`, `migration`, `rattssakerhet`, `forsvar`, `klimat-miljo`, `bostad`, `demokrati`, `ovrigt`
- Government role: `governing` | `support` | `opposition` (computed client-side via `getMandateType()` in `src/lib/utils.ts`)
- Party names are stored as full Swedish names in state/DB; URL params use abbreviations (S, M, SD, …). Conversion: `src/utils/partyAbbreviations.ts`

### Config-driven UI — never hardcode status/category appearance
All visual styling for statuses lives in `src/config/badgeConfig.ts` (`STATUS_CONFIG`). All category styling is in `CATEGORY_CONFIG` in the same file. Adding a new status or category requires updating the DB enum migration AND this config file.

### `Category` type is derived from the DB enum
```ts
export type Category = Enums<"policy_category">;  // in src/config/badgeConfig.ts
```
Never manually duplicate the category list — `src/integrations/supabase/types.ts` is the source of truth and is **auto-generated; do not edit it directly**.

### Supabase client import
```ts
import { supabase } from "@/integrations/supabase/client";
```

### Edge Functions (`supabase/functions/`)
- Deno runtime — use `https://deno.land/` and `https://esm.sh/` imports, never npm.
- Every function must handle `OPTIONS` preflight using `corsResponse`, `jsonResponse`, `errorResponse` from `_shared/cors.ts`.
- Admin-only functions call `requireAdmin(req)` from `_shared/auth.ts` → returns `{ userClient, adminClient, user }`. Use `adminClient` for writes (bypasses RLS).
- Gemini calls use `requireGoogleApiKey()` + `geminiUrl()` from `_shared/gemini.ts`. Model: `gemini-2.5-flash`.
- `extractFunctionError()` in `src/lib/utils.ts` normalises all Supabase function invocation errors for toast display.

### Admin access
Role check via `user_roles` table (`role = 'admin'`). The `useAuth()` hook exposes `{ user, session, isAdmin, loading }`. Admin UI is gated behind `isAdmin` on the `/admin` route.

### Responsive / mobile patterns
- `ResponsiveContext` + `useResponsive` for breakpoint-aware rendering
- `StickyBarContext` / `useStickyBar` tracks whether the mobile filter bar is stuck
- `PromiseCard` has `sharedCompactBadges` prop — badge compactness is coordinated across cards via `onCompactNeedChange` callbacks to keep the grid uniform

## Key Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Provider stack (no routes/layout) |
| `src/router.tsx` | All route definitions |
| `src/layouts/MainLayout.tsx` | Navbar + Footer + Outlet |
| `src/pages/Index.tsx` | Main promise list page |
| `src/store/FilterContext.tsx` | URL-synced filter state (split into `useFilterState` / `useFilterDispatch` for perf) |
| `src/types/promise.ts` | Core types: `PromiseData`, `GovernmentPeriod`, `SORT_OPTIONS` |
| `src/services/promises.ts` | Data fetching (`fetchPromises`, `fetchGovernmentPeriods`) |
| `src/hooks/usePromises.ts` | Hook: fetching, filtering, sorting, computed stats |
| `src/config/badgeConfig.ts` | Single source of truth for all status, category, measurability, and statusQuo UI |
| `src/lib/utils.ts` | `cn()`, `getMandateType()`, `extractFunctionError()` |
| `src/lib/promiseMetrics.ts` | Chart/analytics data computation |
| `supabase/functions/_shared/` | Shared Edge Function utilities (CORS, auth, Gemini) |
| `supabase/functions/analyze-manifest/` | PDF → promises extraction via Gemini |
| `src/integrations/supabase/types.ts` | Auto-generated DB types — do not edit |
