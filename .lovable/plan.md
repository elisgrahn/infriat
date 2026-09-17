# Förbättringar: Partisidor + SEO & delning

Två spår enligt dina val: **partisidor** (ny funktionalitet) och **SEO & delning** (Google Search Console + sociala förhandsvisningar). Ingen designpolering av befintliga sidor.

## Spår 1: Partisidor

### Ny sida `/parti` (partiöversikt)
- Ny route `src/routes/parti.tsx` + sida `src/pages/Parties.tsx`.
- Visar alla 8 riksdagspartier i fast ordning (V, S, MP, C, L, KD, M, SD) som kort med partifärg, antal löften och andel infriade — en klickbar ingång till varje partisida.
- Fungerar som SEO-hub: länkar till alla partisidor på ett ställe.

### Ny sida `/parti/:kort` (partidetalj, t.ex. `/parti/S`)
- Ny route `src/routes/parti.$kort.tsx` + sida `src/pages/PartyDetail.tsx`.
- Vid ogiltig förkortning: `notFoundComponent` (404).
- Innehåll:
  1. **Sidhuvud** — partinamn, förkortning, partifärg (från `src/utils/partyColors.ts`) och roll-badge (Regeringsparti/Stödparti/Opposition, via `getMandateType()` i `src/lib/utils.ts`).
  2. **Nyckeltal** — antal löften, % infriat, delvis infriat, brutet, under utredning (beräknat ur befintlig `PromiseData`-struktur, exkl. `pending-analysis` för icke-admin).
  3. **Kategori-diagram** — stapeldiagram: antal löften per politikområde, staplarna färgkodade efter status (återanvänder statusfärger från `src/config/badgeConfig.ts`).
  4. **Utveckling per valår** — infriade-andel per valår som partiet ställt upp.
  5. **Populäraste löften** — topp 5 efter `view_count`, länkade till respektive löfte.
- Data hämtas med TanStack Query via loader (`ensureQueryData` på `fetchPromises` från `src/services/promises.ts`) så sidan kan renderas med data vid SSR. Om Supabase-anropet inte funkar i SSR faller vi tillbaka på klient-hämtning (samma mönster som startsidan) — metadata byggs i så fall från parametrarna.

### Metadata per partisida (SSR)
- `head()` genererar unik titel, beskrivning, canonical, `og:title`/`og:description`/`og:url` per parti, t.ex. "Socialdemokraternas vallöften — 323 granskade | Infriat".
- Navigering: partisidorna länkas från partiöversikten samt från partibadgen på löfteskorten (klick på parti → dess sida).

### Sitemap
- Lägg till `/parti` och alla åtta `/parti/:kort` i sitemap-genereringen (`scripts/generate-sitemap.ts`), exkludera inga.

## Spår 2: SEO & delning

### Google Search Console (vill du koppla nu — görs först)
1. Öppna kopplingskortet för Google Search Console i chatten (OAuth, ~2 min).
2. Hämta META-verifieringstagg, lägg in den i `src/routes/__root.tsx` (`head()`), publicera appen, verifiera domänen och lägg till den i GSC.
3. Skicka in `https://infriat.se/sitemap.xml` till vald verifierad property.

### Sociala förhandsvisningar
- Lägg till `og:image` + `twitter:image` på blad-rutter (startsida, /om, /statistik, /parti, partisidor) som pekar på `https://infriat.se/og-image.png` — kontrollerar först att bilden är delstorlek (1200×630), annars beskär vi en kopia. `og:image` hamnar aldrig i `__root.tsx`.
- Löftessidor får fortsatt unika taggar via befintliga per-löfte-metadata.

### Fräsch SEO-genomgång
- Scanernas status är inaktuell sedan TanStack-migreringen — kör en ny scan, åtgärda det som faktiskt failar och markera föråldrade fynd (t.ex. "sociala förhandsvisningar identiska") som åtgärdade när koden bekräftar det.

## Verifiering
- `build:dev` grönt; partisidor renderar med data i preview och vid direkt-URL (SSR).
- `/sitemap.xml` innehåller partisidorna.
- Efter publicering: verifieringstagg live på infriat.se, GSC-verifiering + sitemap-inlämning genomförd, delningsförhandsvisning testad för en partisida.
- Obs: ändringarna når infriat.se först vid nästa publicering.
