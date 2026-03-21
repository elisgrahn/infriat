

# Fix analyze-manifest timeout + förbered asynkront flöde

## Problem
Gateway-gränsen är 150 sekunder. Chunk 1 (39k tecken) tog ~3 minuter att processa via Gemini. Funktionen fick 504 trots att den faktiskt lyckades extrahera löften.

## Del 1: Snabb fix (nu)

### Ändring 1: Minska chunk-storlek till ~18k tecken
I `supabase/functions/analyze-manifest/index.ts`:
- `CHUNK_SIZE` från 40000 → 18000
- Ger ~4 chunks för ett 73k-manifest, varje bör ta ~45-60s
- **Problem kvarstår**: total tid > 150s fortfarande → behöver asynkront flöde

### Ändring 2: Inför asynkront jobbflöde med `analysis_jobs`-tabell
Istället för att vänta på hela analysen i ett HTTP-anrop:

1. **Ny tabell `analysis_jobs`**: `id, party_id, election_year, status (pending/processing/completed/failed), progress_pct, result_count, error_message, created_at, updated_at`
2. **Edge function ändras** till att:
   - Skapa ett jobb med status `pending`
   - Returnera `{ jobId }` direkt (~2 sekunder)
   - Köra analysen i bakgrunden via `EdgeRuntime.waitUntil()` (Deno)
   - Uppdatera `analysis_jobs.status` och `progress_pct` efter varje chunk
3. **Frontend (`ManifestUpload`)** ändras till att:
   - Anropa edge function, få tillbaka `jobId`
   - Polla `analysis_jobs`-tabellen var 5:e sekund (eller realtime subscription)
   - Visa progressbar baserat på `progress_pct`
   - Vid `completed` visa resultat, vid `failed` visa felmeddelande

### Arkitektur

```text
ManifestUpload                    Edge Function
    │                                  │
    ├─ POST /analyze-manifest ────────►│
    │                                  ├─ Skapa job (pending)
    │◄─── { jobId } ──────────────────┤
    │                                  ├─ waitUntil(async () => {
    │  poll analysis_jobs              │    chunk1 → update 25%
    │  ──────────────────►             │    chunk2 → update 50%
    │  ◄── { progress: 25% }          │    chunk3 → update 75%
    │  ──────────────────►             │    chunk4 → insert + completed
    │  ◄── { status: completed }       │  })
    │                                  │
```

### Filer som skapas/ändras

| Fil | Ändring |
|-----|---------|
| Migration | Ny tabell `analysis_jobs` med RLS (admin only) |
| `supabase/functions/analyze-manifest/index.ts` | Asynkront flöde med `waitUntil`, progress-uppdateringar |
| `src/components/ManifestUpload.tsx` | Polling-logik med progressbar, ta bort 5-min timeout-hack |

### `analysis_jobs` schema

```sql
create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references public.parties(id) not null,
  election_year integer not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  progress_pct integer default 0,
  total_chunks integer default 0,
  completed_chunks integer default 0,
  result_count integer default 0,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.analysis_jobs enable row level security;
create policy "Admins can manage analysis_jobs" on public.analysis_jobs
  for all to authenticated using (public.has_role(auth.uid(), 'admin'));
```

### Frontend polling-logik (förenklad)

```typescript
// After invoke returns jobId:
const pollInterval = setInterval(async () => {
  const { data: job } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  setProgress(job.progress_pct);
  if (job.status === 'completed') {
    clearInterval(pollInterval);
    toast.success(`${job.result_count} löften extraherade!`);
  } else if (job.status === 'failed') {
    clearInterval(pollInterval);
    toast.error(job.error_message);
  }
}, 5000);
```

## Implementationsordning

1. Skapa `analysis_jobs`-tabell (migration)
2. Uppdatera `analyze-manifest` edge function med asynkront flöde + mindre chunks
3. Uppdatera `ManifestUpload.tsx` med polling + progressbar
4. Deploya edge function

