const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Returns the Google AI API key from environment, or throws a structured error.
 */
export function requireGoogleApiKey(): string {
  const key = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!key) {
    throw { message: 'GOOGLE_AI_API_KEY is not configured', status: 500 };
  }
  return key;
}

/**
 * Build the full Gemini generateContent URL for a given model.
 */
export function geminiUrl(apiKey: string, model = GEMINI_MODEL): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

export { GEMINI_MODEL };
