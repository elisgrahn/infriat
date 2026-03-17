import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { requireGoogleApiKey, geminiUrl } from '../_shared/gemini.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { userClient, adminClient } = await requireAdmin(req);
    const apiKey = requireGoogleApiKey();

    // Validate request body
    const requestSchema = z.object({
      promiseId: z.string().uuid(),
    });

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Ogiltig begäran', 400);
    }

    const { promiseId } = validation.data;

    // Fetch promise (RLS-scoped read)
    const { data: promise, error: fetchError } = await userClient
      .from('promises')
      .select('id, promise_text, direct_quote')
      .eq('id', promiseId)
      .single();

    if (fetchError || !promise) {
      return errorResponse('Promise not found', 404);
    }

    const response = await fetch(geminiUrl(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Du är en expert på att bedöma mätbarheten av politiska vallöften. 
            
Bedöm mätbarheten på en skala 1-5:
- 5: Mycket mätbart - KRÄVER BÅDE konkreta siffror/mätbara mål OCH en tydlig tidsram (årtal)
- 4: Mätbart - har ANTINGEN konkreta siffror/mätbara mål ELLER en tydlig tidsram
- 3: Delvis mätbart (vissa mätbara delar)
- 2: Svårmätbart (vaga formuleringar)
- 1: Omätbart (inga konkreta mål alls)

Svara ENDAST med ett JSON-objekt: {"score": X, "reason": "kort förklaring"}

Bedöm mätbarheten för detta vallöfte:

${promise.promise_text}

${promise.direct_quote ? `Direkt citat: ${promise.direct_quote}` : ''}`
          }]
        }],
        generationConfig: { temperature: 0.2, topP: 0.8 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API error:', response.status, errorText);
      return errorResponse(`AI-analysen misslyckades (${response.status}). Försök igen.`);
    }

    const aiData = await response.json();
    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('No content in AI response:', JSON.stringify(aiData).slice(0, 500));
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

    // Write via admin client (bypasses RLS)
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
