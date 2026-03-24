CREATE POLICY "Admins can delete ai_prompt_logs"
  ON public.ai_prompt_logs
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));