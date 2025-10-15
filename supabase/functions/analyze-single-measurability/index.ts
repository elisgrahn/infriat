import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { promiseId } = await req.json();

    if (!promiseId) {
      return new Response(JSON.stringify({ error: 'Promise ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: promise, error: fetchError } = await supabase
      .from('promises')
      .select('id, promise_text, direct_quote')
      .eq('id', promiseId)
      .single();

    if (fetchError || !promise) {
      return new Response(JSON.stringify({ error: 'Promise not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
            content: `Du är en expert på att bedöma mätbarheten av politiska vallöften. 
            
Bedöm mätbarheten på en skala 1-5:
- 5: Mycket mätbart - KRÄVER BÅDE konkreta siffror/mätbara mål OCH en tydlig tidsram (årtal)
- 4: Mätbart - har ANTINGEN konkreta siffror/mätbara mål ELLER en tydlig tidsram
- 3: Delvis mätbart (vissa mätbara delar)
- 2: Svårmätbart (vaga formuleringar)
- 1: Omätbart (inga konkreta mål alls)

Svara ENDAST med ett JSON-objekt: {"score": X, "reason": "kort förklaring"}`,
          },
          {
            role: 'user',
            content: `Bedöm mätbarheten för detta vallöfte:\n\n${promise.promise_text}\n\n${promise.direct_quote ? `Direkt citat: ${promise.direct_quote}` : ''}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI-analysen misslyckades. Försök igen.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in AI response');
      return new Response(JSON.stringify({ error: 'AI-analysen gav inget resultat. Försök igen.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract JSON from markdown code blocks if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonContent);
    const score = Math.min(Math.max(result.score, 1), 5);

    const { error: updateError } = await supabase
      .from('promises')
      .update({
        measurability_score: score,
        measurability_reason: result.reason,
      })
      .eq('id', promiseId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Analyzed promise ${promiseId}: score ${score}`);

    return new Response(JSON.stringify({ 
      score,
      reason: result.reason,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-single-measurability function:', error);
    return new Response(JSON.stringify({ error: 'Analysen misslyckades. Försök igen.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
