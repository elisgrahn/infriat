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
    const prompt = `Analysera detta svenska politiska vallöfte:

Parti: ${promise.parties.name}
Valår: ${promise.election_year}
Vallöfte: ${promise.promise_text}
Sammanfattning: ${promise.summary}

${context ? `Ytterligare kontext: ${context}` : ''}

Ge en strukturerad bedömning enligt detta format:

**Status:** [välj: kept, broken, eller in-progress]

**Förklaring:** [3-5 meningar som förklarar statusen baserat på konkreta åtgärder, lagförslag, beslut och aktuella nyheter]

**Källor:** [lista med relevanta källor]`;

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

    // Extract status from text response - look for the exact pattern
    let status: 'kept' | 'broken' | 'in-progress' = 'in-progress';
    
    const lowerText = textContent.toLowerCase();
    if (lowerText.includes('status:** kept') || lowerText.includes('status: kept')) {
      status = 'kept';
    } else if (lowerText.includes('status:** broken') || lowerText.includes('status: broken')) {
      status = 'broken';
    }
    
    // Extract explanation - get text between Status and Källor sections
    const explanationMatch = textContent.match(/\*\*Förklaring:\*\*\s*([^*]+?)(?=\n\n\*\*Källor|\n\*\*Källor|$)/is) ||
                            textContent.match(/Förklaring:\s*([^*]+?)(?=Källor|$)/is);
    
    let explanation = explanationMatch ? explanationMatch[1].trim() : textContent;
    
    // Extract real URLs from grounding metadata
    const sources: string[] = [];
    const groundingMetadata = aiData.candidates?.[0]?.groundingMetadata;
    
    // Try to extract from groundingSupports which contains the actual web URIs
    if (groundingMetadata?.groundingSupports) {
      for (const support of groundingMetadata.groundingSupports) {
        // Each support references chunks which should contain web URIs
        if (support.groundingChunkIndices) {
          for (const chunkIndex of support.groundingChunkIndices) {
            const webChunks = groundingMetadata.webSearchQueries || groundingMetadata.groundingChunks;
            if (webChunks && webChunks[chunkIndex]) {
              const chunk = webChunks[chunkIndex];
              if (chunk.uri) {
                sources.push(chunk.uri);
              } else if (chunk.web?.uri) {
                sources.push(chunk.web.uri);
              }
            }
          }
        }
      }
    }
    
    // Fallback: Parse URLs from the text content itself (avoid redirect links)
    if (sources.length === 0) {
      // Extract real URLs from text, avoiding the grounding-api-redirect links
      const urlMatches = textContent.matchAll(/https?:\/\/(?!vertexaisearch\.cloud\.google\.com)[^\s\)]+/g);
      for (const match of urlMatches) {
        sources.push(match[0]);
      }
    }

    const analysis = {
      status,
      explanation: explanation,
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