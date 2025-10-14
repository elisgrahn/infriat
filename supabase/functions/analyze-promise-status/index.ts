import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { promiseId, context } = await req.json();
    
    if (!promiseId) {
      throw new Error('Missing promise ID');
    }

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the promise
    const { data: promise, error: promiseError } = await supabase
      .from('promises')
      .select('*, parties(*)')
      .eq('id', promiseId)
      .single();

    if (promiseError || !promise) {
      throw new Error('Promise not found');
    }

    console.log(`Analyzing status for promise: ${promise.promise_text}`);

    // Call Google Gemini with grounding for real sources
    const prompt = `Du är en expert på svensk politik och faktakontroll av vallöften.

Analysera följande vallöfte och bedöm om det har hållits, brutits eller är pågående.

Parti: ${promise.parties.name}
Valår: ${promise.election_year}
Vallöfte: ${promise.promise_text}
Sammanfattning: ${promise.summary}
Original citat: "${promise.direct_quote}"

${context ? `Ytterligare kontext: ${context}` : ''}

Basera din analys på:
- Konkreta åtgärder som vidtagits
- Lagförslag och beslut
- Officiella uttalanden och dokument
- Aktuella nyheter och rapporter

Ge din bedömning i följande JSON-format:
{
  "status": "kept" | "broken" | "in-progress",
  "explanation": "Detaljerad förklaring av bedömningen (3-5 meningar)",
  "sources": ["URL1", "URL2", ...]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          tools: [{
            google_search_retrieval: {
              dynamic_retrieval_config: {
                mode: "MODE_DYNAMIC",
                dynamic_threshold: 0.7
              }
            }
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API error:', response.status, errorText);
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));
    
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const analysis = JSON.parse(content);
    
    // Extract grounding metadata (sources from Google Search)
    const groundingMetadata = aiData.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      const extractedSources = groundingMetadata.groundingChunks
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => chunk.web.uri);
      
      if (extractedSources.length > 0) {
        analysis.sources = extractedSources;
      }
    }

    // Update promise with analysis
    const { error: updateError } = await supabase
      .from('promises')
      .update({
        status: analysis.status,
        status_explanation: analysis.explanation,
        status_sources: analysis.sources
      })
      .eq('id', promiseId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update promise');
    }

    console.log(`Updated promise status to: ${analysis.status}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-promise-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});