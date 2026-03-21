
CREATE TABLE public.ai_prompt_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_function text NOT NULL,
  promise_id uuid REFERENCES public.promises(id) ON DELETE SET NULL,
  model text NOT NULL,
  prompt text NOT NULL,
  response_raw text,
  grounding_search boolean NOT NULL DEFAULT false,
  duration_ms integer,
  success boolean NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_prompt_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_prompt_logs"
ON public.ai_prompt_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ai_prompt_logs"
ON public.ai_prompt_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_prompt_logs_created_at ON public.ai_prompt_logs (created_at DESC);
CREATE INDEX idx_ai_prompt_logs_edge_function ON public.ai_prompt_logs (edge_function);
CREATE INDEX idx_ai_prompt_logs_promise_id ON public.ai_prompt_logs (promise_id);
