import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { requireGoogleApiKey, geminiUrl, GEMINI_MODEL } from '../_shared/gemini.ts';
import { logPrompt } from '../_shared/prompt-logger.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { userClient, adminClient } = await requireAdmin(req);
    const apiKey = requireGoogleApiKey();

    const requestSchema = z.object({
      promiseId: z.string().uuid(),
    });

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Ogiltig begäran', 400);
    }

    const { promiseId } = validation.data;

    const { data: promise, error: fetchError } = await userClient
      .from('promises')
      .select('id, promise_text, direct_quote')
      .eq('id', promiseId)
      .single();

    if (fetchError || !promise) {
      return errorResponse('Promise not found', 404);
    }

    const prompt = `Du bedömer mätbarheten av ett svenskt politiskt vallöfte.

## Skala
- 5: Specifika numeriska mål OCH tidsram (t.ex. "1 000 nya poliser till 2026")
- 4: Numeriska mål ELLER tidsram, men inte båda (t.ex. "sänka skatten med 2 %")
- 3: Tydlig, verifierbar åtgärd utan siffror (t.ex. "avskaffa värnskatten", "inrätta en haverikommission")
- 2: Relativ förändring utan konkreta mål (t.ex. "fler lärare", "kortare vårdköer")
- 1: Vag vision utan verifierbar åtgärd (t.ex. "stärka välfärden", "ett tryggare Sverige")

## Löfte att bedöma
${promise.promise_text}
${promise.direct_quote ? `\nDirektcitat: "${promise.direct_quote}"` : ''}

Svara ENDAST med ett JSON-objekt utan markdown-formatering:
{"score": <1-5>, "reason": "<en mening som motiverar poängen med direkt hänvisning till vad som finns eller saknas i löftet>"}`;

    const startTime = Date.now();
    const response = await fetch(geminiUrl(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, topP: 0.8 },
      }),
    });
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API error:', response.status, errorText);
      logPrompt({ edgeFunction: 'analyze-single-measurability', promiseId, model: GEMINI_MODEL, prompt, responseRaw: errorText, groundingSearch: false, durationMs, success: false, errorMessage: `API ${response.status}` });
      return errorResponse(`AI-analysen misslyckades (${response.status}). Försök igen.`);
    }

    const aiData = await response.json();
    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('No content in AI response:', JSON.stringify(aiData).slice(0, 500));
      logPrompt({ edgeFunction: 'analyze-single-measurability', promiseId, model: GEMINI_MODEL, prompt, responseRaw: JSON.stringify(aiData).slice(0, 500), groundingSearch: false, durationMs, success: false, errorMessage: 'Empty AI response' });
      return errorResponse('AI-analysen gav inget resultat. Försök igen.');
    }

    // Extract JSON — handle markdown-fenced code blocks
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonStr);
    const score = Math.min(Math.max(result.score, 1), 5);

    const { error: updateError } = await adminClient
      .from('promises')
      .update({
        measurability_score: score,
        measurability_reason: result.reason,
      })
      .eq('id', promiseId);

    if (updateError) {
      console.error('DB update error:', updateError);
      throw new Error('Kunde inte uppdatera vallöftet. Försök igen.');
    }

    logPrompt({ edgeFunction: 'analyze-single-measurability', promiseId, model: GEMINI_MODEL, prompt, responseRaw: textContent, groundingSearch: false, durationMs, success: true });

    console.log(`Analyzed promise ${promiseId}: score ${score}`);
    return jsonResponse({ score, reason: result.reason });

  } catch (error: any) {
    console.error('Error in analyze-single-measurability:', error);
    if (error?.status && error?.message) {
      return errorResponse(error.message, error.status);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Analysen misslyckades. Försök igen.'
    );
  }
});
