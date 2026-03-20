# Copilot Instructions — Infriat

**Infriat** is a Swedish political promise tracker: citizens can browse, filter, and analyze election promises made by Swedish parties, with AI-assisted status analysis and community voting on promise outcomes.

## Stack & Dev Workflow

- **Frontend**: Vite + React 18 + TypeScript, shadcn/ui (Radix UI), Tailwind CSS, Recharts
- **Backend**: Supabase (Postgres + Auth + Edge Functions), Deno runtime
- **AI**: Google Gemini 2.5 Flash via Edge Functions (key: `GOOGLE_AI_API_KEY`)
- **Routing**: React Router v6 with URL-synced filter state

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # ESLint
```

No test suite exists. All Supabase Edge Functions run on Deno — use `https://deno.land/` and `https://esm.sh/` imports, never npm in edge functions.

## Architecture & Data Flow

```
PDF manifest → ManifestUpload → analyze-manifest (Edge Fn + Gemini) → promises table
promises table → Index page → PromiseCard (with badges, admin actions)
                → Statistics / About pages
                → PromiseDetailOverlay (URL param: ?promise=<id>)
Community votes → status_suggestions table → Admin page review → status update
```

**Promise lifecycle**: `pending-analysis` → one of `infriat | delvis-infriat | utreds | ej-infriat | brutet` (set by `analyze-promise-status` Edge Function or Admin approval of community suggestions).

**Deep-link pattern**: selected promise lives in `?promise=<id>` query param (not path). The legacy `/lofte/:id` route redirects to this pattern. `FilterContext` owns all other filter params (`parties`, `statuses`, `govStatus`, `categories`, `statusQuo`, `search`, `sort`, `period`) and syncs them to the URL using `setSearchParams` callback form to avoid clobbering `?promise=`.

## Project-Specific Conventions

### Swedish domain language — use these exact strings
- Promise statuses (DB enum + UI): `infriat`, `delvis-infriat`, `utreds`, `ej-infriat`, `brutet`, `pending-analysis`
- Policy categories (DB enum): `valfard`, `halsa`, `utbildning`, `arbetsmarknad`, `migration`, `rattssakerhet`, `forsvar`, `klimat-miljo`, `bostad`, `demokrati`, `ovrigt`
- Government role: `governing` | `support` | `opposition` (computed client-side via `getMandateType()` in `src/lib/utils.ts`)
- Party names are stored as full Swedish names in state/DB; URL params use abbreviations (S, M, SD, …). Conversion: `src/utils/partyAbbreviations.ts`

### Config-driven UI — never hardcode status/category appearance
All visual styling for statuses lives in `src/config/statusConfig.ts` (`STATUS_CONFIG`). All category styling lives in `src/config/categoryConfig.ts` (`CATEGORY_CONFIG`). Badge descriptions/tooltips live in `src/config/badgeDescriptions.ts`. Adding a new status or category requires updating the DB enum migration AND one of these config files.

### `Category` type is derived from the DB enum
```ts
// src/config/categoryConfig.ts
export type Category = Enums<"policy_category">;
```
Never manually duplicate the category list — let the Supabase-generated `types.ts` be the source of truth.

### Supabase client import
```ts
import { supabase } from "@/integrations/supabase/client";
```
`src/integrations/supabase/client.ts` is **auto-generated** — do not edit it directly.

### Edge Functions (`supabase/functions/`)
- Every function must handle `OPTIONS` preflight using helpers from `_shared/cors.ts` (`corsResponse`, `jsonResponse`, `errorResponse`).
- Admin-only functions call `requireAdmin(req)` from `_shared/auth.ts` which returns `{ userClient, adminClient, user }`. Use `adminClient` for writes (bypasses RLS), `userClient` for reads (respects RLS).
- Gemini calls use `requireGoogleApiKey()` + `geminiUrl()` from `_shared/gemini.ts`. Model is `gemini-2.5-flash`.
- Error handling: `extractFunctionError()` in `src/lib/utils.ts` normalises all Supabase function invocation errors for toast display.

### Admin access
Role check: `user_roles` table, `role = 'admin'`. The `useAuth()` hook exposes `{ user, session, isAdmin, loading }`. Admin UI (manifest upload, bulk AI analysis, suggestion approval) is gated behind `isAdmin` on the `/admin` route.

### Responsive / mobile patterns
- `ResponsiveContext` + `useResponsive` for breakpoint-aware rendering
- `StickyBarContext` (`useStickyBar`) tracks whether the mobile filter bar is stuck, used for visual feedback in `Index.tsx`
- `PromiseCard` has a `sharedCompactBadges` prop — when many cards are displayed, badge compactness is coordinated via `onCompactNeedChange` callbacks to keep the grid uniform

## Key Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Provider stack order, all routes |
| `src/pages/Index.tsx` | Main promise list, filter logic, pagination |
| `src/contexts/FilterContext.tsx` | URL-synced filter state |
| `src/config/statusConfig.ts` | Single source of truth for status UI |
| `src/config/categoryConfig.ts` | Single source of truth for category UI |
| `src/lib/utils.ts` | `cn()`, `getMandateType()`, `extractFunctionError()` |
| `src/lib/promiseMetrics.ts` | Analytics/chart data computation |
| `supabase/functions/_shared/` | Shared Edge Function utilities |
| `supabase/functions/analyze-manifest/` | PDF → promises extraction via Gemini |
| `src/integrations/supabase/types.ts` | Auto-generated DB types — do not edit |
