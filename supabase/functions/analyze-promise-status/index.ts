import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Takes the raw explanation text and groundingSupports/groundingChunks from Gemini,
 * and returns an annotated explanation with inline [n] citation markers.
 */
function buildCitedExplanation(
  explanation: string,
  groundingSupports: any[] | undefined,
  groundingChunks: any[] | undefined
): { citedText: string; sources: { url: string; title: string | null }[] } {
  if (!groundingSupports || !groundingChunks || groundingChunks.length === 0) {
    return { citedText: explanation, sources: [] };
  }

  // Build unique source list from grounding chunks
  const uniqueSources: { url: string; title: string | null }[] = [];
  const urlToIndex = new Map<string, number>();

  for (const chunk of groundingChunks) {
    const url = chunk.web?.uri;
    if (url && !urlToIndex.has(url)) {
      urlToIndex.set(url, uniqueSources.length);
      uniqueSources.push({ url, title: chunk.web?.title || null });
    }
  }

  // Collect insertions: at each endIndex, insert citation markers
  // groundingSupports[].segment.startIndex/endIndex refer to the full AI text,
  // but we match against the explanation substring
  const insertions: { position: number; citations: number[] }[] = [];

  for (const support of groundingSupports) {
    const segment = support.segment;
    if (!segment || segment.text === undefined) continue;

    const chunkIndices: number[] = support.groundingChunkIndices || [];
    if (chunkIndices.length === 0) continue;

    // Find where this segment text appears in our explanation
    const segmentText = segment.text?.trim();
    if (!segmentText) continue;

    const pos = explanation.indexOf(segmentText);
    if (pos === -1) continue;

    const endPos = pos + segmentText.length;

    // Map chunk indices to our unique source indices
    const citations: number[] = [];
    for (const ci of chunkIndices) {
      const chunk = groundingChunks[ci];
      if (chunk?.web?.uri) {
        const sourceIdx = urlToIndex.get(chunk.web.uri);
        if (sourceIdx !== undefined && !citations.includes(sourceIdx)) {
          citations.push(sourceIdx);
        }
      }
    }

    if (citations.length > 0) {
      insertions.push({ position: endPos, citations });
    }
  }

  // Sort insertions by position descending so we can insert without shifting
  insertions.sort((a, b) => b.position - a.position);

  let citedText = explanation;
  for (const ins of insertions) {
    const markers = ins.citations.map(i => `[${i + 1}]`).join('');
    citedText = citedText.slice(0, ins.position) + markers + citedText.slice(ins.position);
  }

  return { citedText, sources: uniqueSources.slice(0, 10) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData, error: roleError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestSchema = z.object({
      promiseId: z.string().uuid(),
      context: z.string().max(5000).optional()
    });

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Ogiltig begäran' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { promiseId, context } = validation.data;

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Tjänsten är inte konfigurerad' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: promise, error: promiseError } = await supabaseUser
      .from('promises')
      .select('*, parties(*)')
      .eq('id', promiseId)
      .single();

    if (promiseError || !promise) {
      return new Response(JSON.stringify({ error: 'Vallöftet hittades inte' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing status for promise: ${promise.promise_text}`);

    const prompt = `Analysera detta svenska politiska vallöfte:

Parti: ${promise.parties.name}
Valår: ${promise.election_year}
Vallöfte: ${promise.promise_text}
Sammanfattning: ${promise.summary}

${context ? `Ytterligare kontext: ${context}` : ''}

Ge en strukturerad bedömning enligt detta format:

**Status:** [välj EN av: fulfilled, partially-fulfilled, in-progress, not-fulfilled, eller broken]

Statusdefinitioner:
- fulfilled: Löftet är helt genomfört – beslut fattat och målet uppnått.
- partially-fulfilled: Regeringen har vidtagit konkreta åtgärder, t.ex. lagt en proposition, ökat utbildningsplatser eller påbörjat reformen, men målet är inte helt nått.
- in-progress: En utredning, departementspromemoria eller liknande arbete pågår för att möjliggöra reformen, men inga politiska beslut har fattats.
- not-fulfilled: Inga tydliga steg mot genomförande har tagits, men regeringen sitter fortfarande kvar och kan agera.
- broken: Regeringsperioden är avslutad och löftet har inte uppfyllts.

**Förklaring:** [3-5 meningar som förklarar statusen baserat på konkreta åtgärder, lagförslag, beslut och aktuella nyheter]

**Källor:** [lista med relevanta källor]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.3, topK: 40, topP: 0.95 }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API error:', response.status, errorText);
      throw new Error('AI-analysen misslyckades. Försök igen.');
    }

    const aiData = await response.json();
    
    const parts = aiData.candidates?.[0]?.content?.parts || [];
    const textContent = parts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join('\n')
      .trim();
      
    if (!textContent) {
      throw new Error('AI-analysen gav inget svar. Försök igen.');
    }

    // Parse status
    let status: 'infriat' | 'delvis-infriat' | 'utreds' | 'ej-infriat' | 'brutet' = 'utreds';
    
    const lowerText = textContent.toLowerCase();
    if (lowerText.includes('status:** fulfilled') || lowerText.includes('status: fulfilled')) {
      status = 'infriat';
    } else if (lowerText.includes('status:** partially-fulfilled') || lowerText.includes('status: partially-fulfilled')) {
      status = 'delvis-infriat';
    } else if (lowerText.includes('status:** in-progress') || lowerText.includes('status: in-progress')) {
      status = 'utreds';
    } else if (lowerText.includes('status:** not-fulfilled') || lowerText.includes('status: not-fulfilled')) {
      status = 'ej-infriat';
    } else if (lowerText.includes('status:** broken') || lowerText.includes('status: broken')) {
      status = 'brutet';
    }
    
    // Extract raw explanation
    const explanationMatch = textContent.match(/\*\*Förklaring:\*\*\s*([^*]+?)(?=\n\n\*\*Källor|\n\*\*Källor|$)/is) ||
                            textContent.match(/Förklaring:\s*([^*]+?)(?=Källor|$)/is);
    
    const rawExplanation = explanationMatch ? explanationMatch[1].trim() : textContent;

    // Build cited explanation with inline [n] markers
    const groundingMetadata = aiData.candidates?.[0]?.groundingMetadata;
    const groundingSupports = groundingMetadata?.groundingSupports;
    const groundingChunks = groundingMetadata?.groundingChunks;

    console.log(`Grounding supports: ${groundingSupports?.length || 0}, chunks: ${groundingChunks?.length || 0}`);

    const { citedText, sources } = buildCitedExplanation(
      rawExplanation,
      groundingSupports,
      groundingChunks
    );

    console.log(`Cited explanation preview: ${citedText.slice(0, 200)}`);

    const sourceUrls = sources.map(s => s.url);

    // Update promise status
    const { error: updateError } = await supabaseAdmin
      .from('promises')
      .update({
        status,
        status_explanation: citedText,
        status_sources: sourceUrls
      })
      .eq('id', promiseId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Kunde inte uppdatera vallöftet. Försök igen.');
    }

    // Delete old promise_sources, then insert new ones
    const { error: deleteSourcesError } = await supabaseAdmin
      .from('promise_sources')
      .delete()
      .eq('promise_id', promiseId);

    if (deleteSourcesError) {
      console.error('Error deleting old sources:', deleteSourcesError);
    }

    if (sources.length > 0) {
      const sourceRows = sources.map((s) => ({
        promise_id: promiseId,
        url: s.url,
        title: s.title,
        source_type: 'news' as const,
      }));

      const { error: insertSourcesError } = await supabaseAdmin
        .from('promise_sources')
        .insert(sourceRows);

      if (insertSourcesError) {
        console.error('Error inserting sources:', insertSourcesError);
      }
    }

    console.log(`Updated promise status to: ${status}, ${sources.length} sources with inline citations`);

    return new Response(
      JSON.stringify({ success: true, analysis: { status, explanation: citedText, sources: sourceUrls } }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-promise-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Ett fel uppstod. Försök igen.' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
