

## Plan: Nästa steg för Infriat

### 1. Footer: "Bidra"-sektion med Swish + GitHub

Byt ut den nuvarande "Stöd projektet"-kolumnen i footern mot en "Bidra"-sektion med två tydliga alternativ:
- **Swish**: Visa Swish-nummer (eller placeholder tills det finns)
- **GitHub**: Länk till GitHub-repot med AGPL-licens-notering, t.ex. "Projektet är öppen källkod (AGPL v3)"

**Fil:** `src/layouts/Footer.tsx`

---

### 2. Byt namn på "Under analys" → "Kommande val"

Statusen `pending-analysis` representerar löften från valmanifest där valet ännu inte hållts. Byt label, tooltip och ikon för att reflektera detta:
- Label: "Kommande val" (eller "Inväntar val")
- Tooltip: "Löftet kommer från ett valmanifest för ett val som ännu inte hållts"
- Ikon: t.ex. `CalendarClock` istället för `Search`
- StatusBadge ska inte visa status-färgkodning (behåll muted-stil)

**Fil:** `src/config/badgeConfig.ts` — uppdatera `pending-analysis`-posten

---

### 3. Visa TL;DR istället för sammanfattning i PromiseCard

I `PromiseList.tsx` skickas `promise.summary` som `description` till `PromiseCard`. Ändra logiken:
- Om löftet har `status_tldr` (dvs. analyserats): visa `status_tldr` som description
- Annars: visa `summary` som idag

Kräver att `status_tldr` finns i `PromiseData`-typen (den finns redan i DB och Supabase-typen, behöver läggas till i `fetchPromises` select och `PromiseData`-interfacet om det saknas).

**Filer:** `src/types/promise.ts`, `src/services/promises.ts`, `src/components/PromiseList.tsx`

---

### 4. Bättre ordning i PromiseDetailContent

Nuvarande ordning:
1. Sammanfattning
2. Citat ur valmanifest
3. Mätbarhet
4. Statusbedömning (TL;DR + förklaring)
5. Källor

Föreslagen ordning — flytta statusbedömningen uppåt direkt efter sammanfattningen, eftersom det är det mest relevanta:
1. Sammanfattning
2. **Statusbedömning** (TL;DR + förklaring med källor)
3. **Källor**
4. Citat ur valmanifest
5. Mätbarhet

**Fil:** `src/components/PromiseDetailContent.tsx` — flytta sektionernas JSX-block

---

### 5. Ytterligare förslag

Utöver dina idéer, här är några förslag:

- **Delningslänk med OG-preview per löfte**: Dynamisk `og:title`/`og:description` per löfte-URL, så att delade länkar på sociala medier visar löftets text och status. Kräver en edge function som returnerar HTML med rätt meta-taggar.
- **"Senast uppdaterade" som standardsortering**: Visa löften som nyligen fått en statusuppdatering överst, så återkommande besökare ser vad som ändrats.
- **Notifieringar / RSS-flöde**: Ett RSS-flöde eller en enkel "prenumerera på uppdateringar"-funktion för användare som vill följa statusändringar.
- **Filtrera per valår direkt i hero/navbar**: Snabbknappar för "Val 2022", "Val 2026" etc. istället för att behöva öppna filterpanelen.

---

### Teknisk sammanfattning

| Ändring | Filer |
|---------|-------|
| Footer "Bidra" | `src/layouts/Footer.tsx` |
| Byt namn pending-analysis | `src/config/badgeConfig.ts` |
| TL;DR i PromiseCard | `src/types/promise.ts`, `src/services/promises.ts`, `src/components/PromiseList.tsx` |
| Omordna PromiseDetail | `src/components/PromiseDetailContent.tsx` |

