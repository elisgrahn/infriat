-- Fix function search path issue by dropping trigger first, then recreating function
DROP TRIGGER IF EXISTS update_promises_updated_at ON public.promises;
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_promises_updated_at
  BEFORE UPDATE ON public.promises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();