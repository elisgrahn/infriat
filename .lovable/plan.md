

## Investigation Results

**Why the job is stuck at "processing":**

The edge function `analyze-manifest` uses `EdgeRuntime.waitUntil()` to run the job in the background after returning the HTTP response. The job had 9 chunks to process but only completed 4 (chunks 1-4 logged successfully). The function likely crashed or timed out while processing chunk 5. Because the background task runs detached, there's no outer catch to update the job status to "failed" — it just dies silently, leaving the job permanently stuck at "processing" with `progress_pct: 40`.

**Can we extract promises from the logs?**

Partially. All 4 logged responses are truncated at 10,000 characters (the `MAX_RESPONSE_LENGTH` limit in `prompt-logger.ts`). This means:
- Each response's last promise entry is cut off mid-JSON and unrecoverable
- We'd get most promises from chunks 1-4, but lose some at each truncation boundary
- Chunks 5-9 (over half the manifest) have no data at all

**Recommendation:** Re-running the analysis is more reliable than trying to recover partial data. The existing 125 SD promises from October 2025 are still intact.

## Plan

### 1. Mark the stuck job as failed
Run a migration to update the stuck job's status to `'failed'` with an error message explaining the timeout.

### 2. Increase response log limit
Change `MAX_RESPONSE_LENGTH` in `prompt-logger.ts` from 10,000 to 50,000 characters so future responses aren't truncated (the Gemini responses are often larger than 10k).

### 3. Add resilience to the background job runner
Wrap the entire `runAnalysisJob` call inside `EdgeRuntime.waitUntil()` with an additional top-level try/catch, so if the function crashes unexpectedly the job status is updated to "failed" instead of being stuck forever.

### 4. Re-run the analysis
After deploying the fixes, you can re-trigger the SD 2022 manifest analysis from the admin panel. The improved logging and error handling will prevent the same silent failure.

### Technical Details

**Migration SQL:**
```sql
UPDATE analysis_jobs
SET status = 'failed',
    error_message = 'Edge function crashed/timed out after chunk 4 of 9',
    updated_at = now()
WHERE id = '36b1a70d-0ce0-4529-a7d0-ada8877c6a37'
  AND status = 'processing';
```

**prompt-logger.ts change:** `MAX_RESPONSE_LENGTH` from `10000` to `50000`.

**analyze-manifest/index.ts change:** Add a safety wrapper around the `EdgeRuntime.waitUntil` callback to ensure job failure is always recorded.

