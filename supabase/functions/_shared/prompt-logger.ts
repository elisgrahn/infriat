import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface LogPromptParams {
  edgeFunction: string;
  promiseId?: string;
  model: string;
  prompt: string;
  responseRaw?: string;
  groundingSearch: boolean;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
}

const MAX_RESPONSE_LENGTH = 10000;

/**
 * Fire-and-forget prompt logger. Never throws — logs errors silently.
 */
export async function logPrompt(params: LogPromptParams): Promise<void> {
  try {
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const responseRaw = params.responseRaw
      ? params.responseRaw.slice(0, MAX_RESPONSE_LENGTH)
      : null;

    await client.from('ai_prompt_logs').insert({
      edge_function: params.edgeFunction,
      promise_id: params.promiseId || null,
      model: params.model,
      prompt: params.prompt,
      response_raw: responseRaw,
      grounding_search: params.groundingSearch,
      duration_ms: params.durationMs || null,
      success: params.success,
      error_message: params.errorMessage || null,
    });
  } catch (e) {
    console.error('logPrompt failed silently:', e);
  }
}
