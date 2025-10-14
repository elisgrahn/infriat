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

Ge din bedömning med:
1. Status: "kept", "broken" eller "in-progress"
2. En detaljerad förklaring (3-5 meningar)
3. Källor (URL:er) som stödjer din bedömning

Svara i ett strukturerat format.`;

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
            googleSearch: {}
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95
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
    
    // Combine all text parts from the response
    const parts = aiData.candidates?.[0]?.content?.parts || [];
    const textContent = parts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join('\n')
      .trim();
      
    if (!textContent) {
      throw new Error('No content in AI response');
    }

    // Extract status from text response
    let status: 'kept' | 'broken' | 'in-progress' = 'in-progress';
    
    const statusMatch = textContent.match(/\*\*Status:\*\*\s*(kept|broken|in-progress)/i) || 
                       textContent.match(/Status:\s*(kept|broken|in-progress)/i);
    
    if (statusMatch) {
      status = statusMatch[1].toLowerCase() as 'kept' | 'broken' | 'in-progress';
    }
    
    // Extract explanation from text
    const explanationMatch = textContent.match(/\*\*Förklaring:\*\*\s*([^*]+)/i) ||
                            textContent.match(/Förklaring:\s*([^*]+)/i);
    
    const explanation = explanationMatch ? explanationMatch[1].trim() : textContent;
    
    // Extract real URLs from grounding metadata
    const sources: string[] = [];
    const groundingMetadata = aiData.candidates?.[0]?.groundingMetadata;
    
    if (groundingMetadata?.groundingSupports) {
      for (const support of groundingMetadata.groundingSupports) {
        if (support.segment?.text && support.groundingChunkIndices) {
          for (const chunkIndex of support.groundingChunkIndices) {
            const chunk = groundingMetadata.retrievalMetadata?.[chunkIndex];
            if (chunk?.webChunk?.uri) {
              sources.push(chunk.webChunk.uri);
            }
          }
        }
      }
    }
    
    // Also try to extract from webSearchQueries metadata
    if (groundingMetadata?.webSearchQueries && sources.length === 0) {
      console.log('No direct URIs found in grounding metadata');
    }

    const analysis = {
      status,
      explanation: explanation.substring(0, 500), // Limit length
      sources: [...new Set(sources)] // Remove duplicates
    };

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