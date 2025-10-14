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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    // Call Lovable AI to analyze the status
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du är en expert på svensk politik och faktakontroll av vallöften.

Din uppgift är att analysera om ett vallöfte har hållits, brutits eller är pågående.

Bedöm baserat på:
- Konkreta åtgärder som vidtagits
- Lagförslag och beslut
- Officiella uttalanden och dokument
- Aktuella nyheter och rapporter

KRITISKT VIKTIGT om källor:
- Du har INTE tillgång till internet eller externa källor
- Du kan ENDAST basera din analys på din träningsdata
- Inkludera ENDAST "sources" fältet om du är HELT SÄKER på att källan existerar och är korrekt
- Om du inte är säker på exakta URL:er, lämna sources som en tom array []
- UPPFINN ALDRIG URL:er eller påhittade källor
- Det är BÄTTRE att ha inga källor än felaktiga källor

Ge en tydlig bedömning och förklaring.`
          },
          {
            role: 'user',
            content: `Parti: ${promise.parties.name}
Valår: ${promise.election_year}
Vallöfte: ${promise.promise_text}
Sammanfattning: ${promise.summary}
Original citat: "${promise.direct_quote}"

${context ? `Ytterligare kontext: ${context}` : ''}

Analysera om detta vallöfte har hållits, brutits eller är pågående.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_status",
              description: "Analysera statusen för ett vallöfte",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["kept", "broken", "in-progress"],
                    description: "Status för vallöftet"
                  },
                  explanation: {
                    type: "string",
                    description: "Detaljerad förklaring av bedömningen (3-5 meningar)"
                  },
                  sources: {
                    type: "array",
                    items: { type: "string" },
                    description: "Referenser till källor som stödjer bedömningen"
                  }
                },
                required: ["status", "explanation", "sources"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_status" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI API error');
    }

    const aiData = await response.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

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