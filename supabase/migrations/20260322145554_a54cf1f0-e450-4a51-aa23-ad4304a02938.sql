UPDATE analysis_jobs
SET status = 'failed',
    error_message = 'Edge function crashed/timed out after chunk 4 of 9',
    updated_at = now()
WHERE id = '36b1a70d-0ce0-4529-a7d0-ada8877c6a37'
  AND status = 'processing';