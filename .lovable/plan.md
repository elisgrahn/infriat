

## Plan: Rena URL:er med `/lofte/:id` + OG-metadata fix

### Koncept

Byt från `/?promise=id` till `/lofte/:id` för löftesdetaljer. Routen finns redan i routern — den behöver bara kopplas till overlay-logiken. Detta ger:
- **Snygg delningslänk**: `infriat.se/lofte/abc123`
- **OG-metadata fungerar**: Edge function uppdateras att redirecta till `/lofte/:id`, och `og:url` pekar dit
- **Samma UX**: Overlay öppnas ovanpå Index-sidan som idag

### Ändringar

**1. `src/pages/Index.tsx`** — Använd `useParams` istället för `searchParams`
- `const { id: promiseId } = useParams()` blir den primära källan
- Ta bort `searchParams.get("promise")`-logiken
- `handleOverlayClose` navigerar till `/` istället för att ta bort query param

**2. `src/components/PromiseCard.tsx`** — Navigera till `/lofte/:id`
- Byt `navigate(\`/?promise=\${promiseId}\`)` → `navigate(\`/lofte/\${promiseId}\`)`

**3. `supabase/functions/og-metadata/index.ts`** — Uppdatera redirect + OG-URL
- Byt `siteUrl` från `infriat.lovable.app` till `infriat.se`
- Byt `redirectUrl` till `${siteUrl}/lofte/${promiseId}`
- Lägg till `og:url` som pekar på `${siteUrl}/lofte/${promiseId}`

**4. `src/components/ShareButton.tsx`** — Behåll edge function-URL för delning
- Delningslänken pekar fortfarande på edge function (för crawlers), men redirecten landar nu på `/lofte/:id`

**5. `index.html`** — Lägg till saknade meta-taggar
- `<meta property="og:url" content="https://infriat.se/" />`
- `<meta property="og:logo" content="https://infriat.se/infriat.svg" />`

**6. `src/components/PromiseDetailContent.tsx`** — Uppdatera eventuella `?promise=`-referenser

### Filer

| Fil | Ändring |
|---|---|
| `src/pages/Index.tsx` | Läs `promiseId` från `useParams`, navigera till `/` vid stängning |
| `src/components/PromiseCard.tsx` | Navigera till `/lofte/:id` |
| `supabase/functions/og-metadata/index.ts` | Redirect till `/lofte/:id`, `siteUrl` → `infriat.se` |
| `index.html` | Lägg till `og:url` och `og:logo` |
| `src/components/ShareButton.tsx` | Ingen ändring behövs (pekar redan på edge function) |

### Notering om Outlet

React Router's `<Outlet>` behövs inte här — `/lofte/:id` renderar redan `<Index />` som i sin tur renderar overlayen baserat på `useParams().id`. Samma komponentträd, bara att URL:en driver state istället för query params.

