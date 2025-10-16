-- Step 1: Rename the old enum and create a new one with updated values
-- Create new enum type with the new status values
CREATE TYPE promise_status_new AS ENUM ('infriat', 'delvis-infriat', 'utreds', 'ej-infriat', 'brutet', 'pending-analysis');

-- Add temporary column with new enum type
ALTER TABLE promises ADD COLUMN status_new promise_status_new;

-- Map old values to new values
UPDATE promises SET status_new = 
  CASE status::text
    WHEN 'fulfilled' THEN 'infriat'::promise_status_new
    WHEN 'partially-fulfilled' THEN 'delvis-infriat'::promise_status_new
    WHEN 'in-progress' THEN 'utreds'::promise_status_new
    WHEN 'delayed' THEN 'ej-infriat'::promise_status_new
    WHEN 'broken' THEN 'brutet'::promise_status_new
    WHEN 'unclear' THEN 'pending-analysis'::promise_status_new
    WHEN 'pending-analysis' THEN 'pending-analysis'::promise_status_new
  END;

-- Also update status_suggestions table
ALTER TABLE status_suggestions ADD COLUMN suggested_status_new promise_status_new;

UPDATE status_suggestions SET suggested_status_new = 
  CASE suggested_status::text
    WHEN 'fulfilled' THEN 'infriat'::promise_status_new
    WHEN 'partially-fulfilled' THEN 'delvis-infriat'::promise_status_new
    WHEN 'in-progress' THEN 'utreds'::promise_status_new
    WHEN 'delayed' THEN 'ej-infriat'::promise_status_new
    WHEN 'broken' THEN 'brutet'::promise_status_new
    WHEN 'unclear' THEN 'pending-analysis'::promise_status_new
    WHEN 'pending-analysis' THEN 'pending-analysis'::promise_status_new
  END;

-- Drop old columns
ALTER TABLE promises DROP COLUMN status;
ALTER TABLE status_suggestions DROP COLUMN suggested_status;

-- Rename new columns to original names
ALTER TABLE promises RENAME COLUMN status_new TO status;
ALTER TABLE status_suggestions RENAME COLUMN suggested_status_new TO suggested_status;

-- Set default value for status column
ALTER TABLE promises ALTER COLUMN status SET DEFAULT 'pending-analysis'::promise_status_new;

-- Set NOT NULL constraints
ALTER TABLE promises ALTER COLUMN status SET NOT NULL;
ALTER TABLE status_suggestions ALTER COLUMN suggested_status SET NOT NULL;

-- Drop old enum type
DROP TYPE promise_status;

-- Rename new enum type to original name
ALTER TYPE promise_status_new RENAME TO promise_status;