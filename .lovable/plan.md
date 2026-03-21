

# Logga alla AI-prompts — uppdaterad plan

## Ändringar från föregående plan
- **En kolumn `prompt`** istället för `system_prompt` + `user_prompt` (alla prompts är procedurellt genererade)
- **Ny boolean `grounding_search`** — markerar om Google Search-grounding användes
- `user_prompt` kan läggas till senare vid behov (t.ex. chattfunktion)

## Databasschema: `ai_prompt_logs`

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | uuid PK | |
| edge_function | text NOT NULL | Funktionsnamn |
| promise_id | uuid (nullable) | Kopplat löfte |
| model | text NOT NULL | AI-modell |
| prompt | text NOT NULL | Fullständig prompt som skickades |
| response_raw | text (nullable) | AI-svar, trunkerat till 10k tecken |
| grounding_search | boolean NOT NULL DEFAULT false | Om Google Search-grounding användes |
| duration_ms | int (nullable) | Anropstid |
| success | boolean NOT NULL | Om anropet lyckades |
| error_message | text (nullable) | Felmeddelande |
| created_at | timestamptz DEFAULT now() | |

RLS: admin-only (kan öppnas med publik SELECT-policy senare för transparens).

## Vilka funktioner använder grounding?
- `analyze-promise-status` — **ja** (`tools: [{ googleSearch: {} }]`)
- `analyze-single-measurability` — nej
- `analyze-measurability` — nej
- `analyze-manifest` — nej

## Implementation

### 1. Migration — skapa `ai_prompt_logs`
Tabell + RLS-policy för admin-only.

### 2. Ny delad hjälpfunktion `supabase/functions/_shared/prompt-logger.ts`
Fire-and-forget `logPrompt()` som skriver via service role-klient. Misslyckas tyst.

```typescript
export async function logPrompt(params: {
  edgeFunction: string;
  promiseId?: string;
  model: string;
  prompt: string;
  responseRaw?: string;
  groundingSearch: boolean;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void>
```

### 3. Uppdatera alla 4 edge functions
Lägg till `logPrompt()`-anrop efter varje Gemini-anrop. Mät tid med `Date.now()` före/efter fetch.

### 4. Admin-UI — sektion i Admin-sidan
Tabell med senaste loggar: tidpunkt, funktion, löfte-id, modell, grounding, success/fail. Expanderbar rad för prompt och svar.

## Implementationsordning
1. Migration
2. `prompt-logger.ts`
3. Uppdatera edge functions (4 st)
4. Admin-UI-komponent
5. Deploy edge functions

