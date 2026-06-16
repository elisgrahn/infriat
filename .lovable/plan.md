# Fix: drawer-öppning ska inte ladda om sidan

## Orsak

Klick på ett löfte navigerar idag till en helt annan route: `/lofte/$id` (se `src/components/PromiseCard.tsx` rad 123/127 → `navigate(\`/lofte/${promiseId}\`)`).

`/lofte/$id` är en separat fil-route (`src/routes/lofte.$id.tsx`) som råkar rendera samma `Index`-komponent. TanStack Router betraktar dem dock som olika routes, så vid klick:

1. Hela route-trädet byts → `Index` avmonteras och remonteras → all lokal state (chartVisible, filter-UI) nollställs och `usePromises` kan kort visa loading.
2. TanStack Routers default scroll-restoration skrollar till toppen vid ny route.
3. Under övergången hinner SSR-/ohydrerad markup synas en kort stund → "light mode flashar förbi" (innan `ThemeProvider`s effekt återapplicerar `dark`-klassen på `<html>` efter remount).

Samma sak händer när drawern stängs (`navigate('/?…')`) — route byts tillbaka.

## Lösning

Behåll valt löfte i URL via query-param `?promise=<id>` (vilket `Index` redan stöder, rad 20). Då sker inget route-byte → ingen remount, ingen scroll-reset, ingen flash.

`/lofte/:id` behålls bara som delbar deep-link (Cloudflare-workern serverar OG-metadata där). När en användare landar direkt på `/lofte/:id` redirectar vi klient-sidan till `/?promise=<id>` så fortsatt navigering sker inom samma route.

## Ändringar

1. **`src/components/PromiseCard.tsx`** – byt de två `navigate(\`/lofte/${promiseId}\`)`-anropen mot en same-route uppdatering av query-param. Använd `useSearchParams`-settern (redan exponerad via compat-shimet):
   ```ts
   const [, setSearchParams] = useSearchParams();
   // i onClick / Enter:
   setSearchParams((p) => { p.set("promise", promiseId); return p; }, { replace: false });
   ```
   Detta triggar `router.navigate({ to: '.', search, replace: false })` utan att byta route → ingen scroll-reset, ingen remount.

2. **`src/routes/lofte.$id.tsx`** – istället för att rendera `Index` direkt, redirecta till `/?promise=<id>` så användaren hamnar på samma route som resten av appen:
   ```tsx
   export const Route = createFileRoute("/lofte/$id")({
     beforeLoad: ({ params }) => {
       throw redirect({ to: "/", search: { promise: params.id }, replace: true });
     },
   });
   ```
   (Workern fortsätter att returnera OG-HTML till crawlers innan SPA:n laddas, så delning påverkas inte.)

3. **`src/pages/Index.tsx`** – `handleOverlayClose` använder redan `navigate('/?…')`. Eftersom vi nu alltid är på `/`-routen byter vi det till en same-route `setSearchParams`-uppdatering med `replace: true`, så stängning inte heller orsakar remount:
   ```ts
   setSearchParams((p) => { p.delete("promise"); return p; }, { replace: true });
   ```

4. **Verifiering** – `bun run build:dev`, sedan i previewen: öppna ett löfte → ingen scroll-jump, ingen ljus-flash; stäng → samma. Direktbesök på `/lofte/<id>` → redirectas till `/?promise=<id>` och drawern öppnas.

## Anmärkning om temat

Själva "light flash" är en sekundäreffekt av route-bytet (ohydrerad markup syns innan `ThemeProvider`s `useEffect` hinner sätta klassen igen). När route-bytet försvinner försvinner även flashen. Om vi senare vill härda detta ytterligare kan vi inlina ett blockande theme-init-script i `__root.tsx`s `<head>` — men det är inte nödvändigt för denna fix.
