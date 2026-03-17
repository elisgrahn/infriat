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
      reanalyze: z.boolean().optional(),
    });

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Ogiltig begäran', 400);
    }

    const { reanalyze } = validation.data;

    // Fetch promises (RLS-scoped read via userClient)
    let query = userClient
      .from('promises')
      .select('id, promise_text, direct_quote');

    if (!reanalyze) {
      query = query.is('measurability_score', null);
    }

    const { data: promises, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching promises:', fetchError);
      return errorResponse(fetchError.message);
    }

    if (!promises || promises.length === 0) {
      return jsonResponse({ message: 'No promises to analyze', analyzed: 0 });
    }

    console.log(`Analyzing measurability for ${promises.length} promises`);

    let analyzed = 0;
    const errors: string[] = [];

    for (const promise of promises) {
      try {
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
          console.error(`AI error for promise ${promise.id}:`, response.status, errorText);
          errors.push(`${promise.id}: API ${response.status}`);
          continue;
        }

        const aiData = await response.json();
        const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
          console.error(`Empty AI response for promise ${promise.id}`);
          errors.push(`${promise.id}: empty response`);
          continue;
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
          .eq('id', promise.id);

        if (updateError) {
          console.error(`DB update error for ${promise.id}:`, updateError);
          errors.push(`${promise.id}: DB update failed`);
          continue;
        }

        analyzed++;
        console.log(`Analyzed promise ${promise.id}: score ${score}`);
      } catch (error) {
        console.error(`Error analyzing promise ${promise.id}:`, error);
        errors.push(`${promise.id}: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    return jsonResponse({
      message: `Analyzed ${analyzed} of ${promises.length} promises`,
      analyzed,
      total: promises.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Error in analyze-measurability:', error);
    if (error?.status && error?.message) {
      return errorResponse(error.message, error.status);
    }
    return errorResponse('Analysen misslyckades. Försök igen.');
  }
});
