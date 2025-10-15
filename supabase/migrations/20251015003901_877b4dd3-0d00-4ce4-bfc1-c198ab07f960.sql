-- Remove defaults first
ALTER TABLE promises ALTER COLUMN status DROP DEFAULT;

-- Create new enum type
CREATE TYPE promise_status_new AS ENUM (
  'fulfilled',
  'partially-fulfilled', 
  'in-progress',
  'delayed',
  'broken',
  'unclear',
  'pending-analysis'
);

-- Update promises table
ALTER TABLE promises 
  ALTER COLUMN status TYPE promise_status_new USING 
    CASE status::text
      WHEN 'kept' THEN 'fulfilled'::promise_status_new
      WHEN 'in-progress' THEN 'in-progress'::promise_status_new
      WHEN 'broken' THEN 'broken'::promise_status_new
      WHEN 'pending-analysis' THEN 'pending-analysis'::promise_status_new
      ELSE 'unclear'::promise_status_new
    END;

-- Update status_suggestions table
ALTER TABLE status_suggestions
  ALTER COLUMN suggested_status TYPE promise_status_new USING suggested_status::text::promise_status_new;

-- Drop old enum and rename new one
DROP TYPE promise_status;
ALTER TYPE promise_status_new RENAME TO promise_status;

-- Restore default
ALTER TABLE promises ALTER COLUMN status SET DEFAULT 'pending-analysis'::promise_status;