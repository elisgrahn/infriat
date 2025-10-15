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
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { manifestText, partyAbbreviation, electionYear } = await req.json();
    
    if (!manifestText || !partyAbbreviation || !electionYear) {
      throw new Error('Missing required parameters');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Analyzing manifest for ${partyAbbreviation} ${electionYear}`);

    // Call Lovable AI to analyze the manifest
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
            content: `Du är en expert på att analysera politiska valmanifest och extrahera mätbara vallöften. 

Din uppgift är att:
1. Identifiera konkreta, mätbara vallöften i texten
2. För varje vallöfte, ge en kort sammanfattning
3. Inkludera ett direkt citat från manifestet
4. Förklara varför löftet är mätbart

ETT LÖFTE ÄR MÄTBART om det uppfyller minst ett av dessa kriterier:
- Innehåller specifika siffror eller mål (t.ex. "sänka skatten med 10%")
- Beskriver konkreta lagändringar eller politiska reformer (t.ex. "avskaffa strandskyddet", "ändra lagen om X")
- Lovar att införa eller avskaffa en specifik policy eller myndighet
- Beskriver en tydlig åtgärd som kan verifieras genom offentliga handlingar (riksdagsmotion, proposition, lagändringar)

INTE MÄTBART:
- Vaga mål utan konkret åtgärd (t.ex. "förbättra välfärden", "stärka Sverige")
- Värderingar och principer utan specifik handling
- Allmänna visioner utan tydlig leverans

Inkludera löften även om de inte har specifika siffror, så länge åtgärden är konkret och kan verifieras.`
          },
          {
            role: 'user',
            content: manifestText
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_promises",
              description: "Extrahera mätbara vallöften från valmanifestet",
              parameters: {
                type: "object",
                properties: {
                  promises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        promise_text: { 
                          type: "string",
                          description: "En mycket kort och koncis sammanfattning av vallöftet (max 10-15 ord). Ska vara så kort som möjligt men ändå fånga kärnan i löftet."
                        },
                        summary: { 
                          type: "string",
                          description: "En kort sammanfattning (max 2 meningar)"
                        },
                        direct_quote: { 
                          type: "string",
                          description: "Exakt citat från manifestet som stödjer löftet"
                        },
                        measurability_reason: { 
                          type: "string",
                          description: "Förklaring av varför löftet är mätbart"
                        }
                      },
                      required: ["promise_text", "summary", "direct_quote", "measurability_reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["promises"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_promises" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted, please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI API error');
    }

    const aiData = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const extractedPromises = JSON.parse(toolCall.function.arguments);
    
    // Get party ID (supabase client already created above for auth)
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id')
      .eq('abbreviation', partyAbbreviation)
      .single();

    if (partyError || !party) {
      throw new Error(`Party not found: ${partyAbbreviation}`);
    }

    // Check for existing promises from same party and election year
    const { data: existingPromises, error: existingError } = await supabase
      .from('promises')
      .select('promise_text, summary')
      .eq('party_id', party.id)
      .eq('election_year', electionYear);

    if (existingError) {
      console.error('Error fetching existing promises:', existingError);
    }

    // Filter out duplicates based on similar promise_text or summary
    const existingTexts = new Set(existingPromises?.map(p => p.promise_text.toLowerCase().trim()) || []);
    const existingSummaries = new Set(existingPromises?.map(p => p.summary?.toLowerCase().trim()) || []);

    const uniquePromises = extractedPromises.promises.filter((p: any) => {
      const textMatch = existingTexts.has(p.promise_text.toLowerCase().trim());
      const summaryMatch = p.summary && existingSummaries.has(p.summary.toLowerCase().trim());
      return !textMatch && !summaryMatch;
    });

    console.log(`Extracted ${extractedPromises.promises.length} promises, ${uniquePromises.length} are unique`);

    if (uniquePromises.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: 0,
          message: 'Inga nya unika löften hittades (alla verkar redan finnas i databasen)'
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert only unique promises
    const promisesToInsert = uniquePromises.map((p: any) => ({
      party_id: party.id,
      election_year: electionYear,
      promise_text: p.promise_text,
      summary: p.summary,
      direct_quote: p.direct_quote,
      measurability_reason: p.measurability_reason,
      status: 'pending-analysis'
    }));

    const { data: insertedPromises, error: insertError } = await supabase
      .from('promises')
      .insert(promisesToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to insert promises');
    }

    console.log(`Inserted ${insertedPromises.length} unique promises`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: insertedPromises.length,
        promises: insertedPromises
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-manifest:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});