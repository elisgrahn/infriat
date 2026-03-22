

## Problem Analysis

Two root causes for the repeated job failures:

1. **Response truncation at source (line 153)**: `analyzeChunk` does `JSON.stringify(parts).slice(0, 10000)` before passing to `logPrompt`. The prompt-logger limit was raised to 50k but the data is already cut to 10k before it reaches the logger. This is why all logged responses show exactly 10,000 chars.

2. **Edge function timeout**: Each chunk takes 40-75 seconds. With 9 chunks, total processing is 6-9 minutes. Deno edge functions have a ~150 second wall-clock limit. `EdgeRuntime.waitUntil` extends this somewhat but not enough for 9 sequential chunks. When the runtime is killed, even the `safeRunJob` wrapper cannot execute its rescue logic.

## Plan

### 1. Fix the in-function response truncation

Remove the `.slice(0, 10000)` on line 153 of `analyze-manifest/index.ts`. The shared `prompt-logger.ts` already handles truncation at 50k, so the double-truncation is unnecessary and destructive.

### 2. Restructure to process one chunk per invocation

Instead of processing all chunks in one long-running background task, redesign the system so each chunk is processed in its own edge function call, staying well within the timeout:

- Add a `manifest_text` column (or use storage) to `analysis_jobs` to persist the full text.
- The initial call creates the job, stores the manifest text, and processes **chunk 1 only**.
- At the end of each chunk, the function **self-invokes** for the next chunk (fire-and-forget fetch to itself with `jobId` and `chunkIndex`).
- Each invocation: process one chunk, log it, update progress, then trigger the next chunk.
- The final chunk handles dedup, delete old promises, insert new ones, and mark job as completed.

This ensures each invocation runs for ~60-80 seconds max, well within limits.

### 3. Mark the current stuck job as failed

SQL migration to update the stuck job.

### Technical Details

**New column on `analysis_jobs`:**
```sql
ALTER TABLE analysis_jobs
  ADD COLUMN manifest_text text,
  ADD COLUMN manifest_pdf_url text,
  ADD COLUMN current_chunk integer DEFAULT 0,
  ADD COLUMN accumulated_promises jsonb DEFAULT '[]'::jsonb;
```

**Self-invocation pattern (end of each chunk):**
```typescript
// After processing chunk N, trigger chunk N+1
const nextChunk = currentChunk + 1;
if (nextChunk < totalChunks) {
  const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-manifest`;
  fetch(selfUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ continueJobId: jobId, chunkIndex: nextChunk }),
  }).catch(err => console.error('Self-invoke failed:', err));
}
```

**Request handling changes:**
- If request contains `continueJobId` + `chunkIndex`: skip auth/validation, load job state from DB, process that single chunk, self-invoke next.
- If request is a fresh analysis: create job, store manifest text, self-invoke chunk 0.

**Line 153 fix:**
```typescript
// Before (truncated):
const responseRaw = JSON.stringify(parts).slice(0, 10000);
// After (full):
const responseRaw = JSON.stringify(parts);
```

**Stuck job migration:**
```sql
UPDATE analysis_jobs
SET status = 'failed',
    error_message = 'Edge function timed out after chunk 6 of 9',
    updated_at = now()
WHERE id = '18d2b4d1-7535-49c2-8e5a-8cefc8581cbf'
  AND status = 'processing';
```

