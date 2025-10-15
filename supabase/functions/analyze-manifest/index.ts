import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

// Configure PDF.js worker for Deno environment
pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.worker.mjs";

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

    const { manifestText, txtUrl, pdfBase64, pdfUrl, partyAbbreviation, electionYear } = await req.json();
    
    if (!partyAbbreviation || !electionYear) {
      throw new Error('Missing required parameters');
    }

    console.log(`Analyzing manifest for ${partyAbbreviation} ${electionYear}`);

    // Get manifest text (either from input or download from URL)
    let finalManifestText = manifestText;
    if (!finalManifestText && txtUrl) {
      console.log('Downloading TXT from URL:', txtUrl);
      try {
        const txtResponse = await fetch(txtUrl);
        if (!txtResponse.ok) {
          throw new Error(`Failed to download TXT: HTTP ${txtResponse.status} ${txtResponse.statusText}`);
        }
        finalManifestText = await txtResponse.text();
      } catch (txtError) {
        console.error('TXT download error:', txtError);
        throw new Error(`Kunde inte ladda ner TXT från URL: ${txtError instanceof Error ? txtError.message : 'Ogiltig URL'}`);
      }
    }

    // Check if this is PDF-only mode (adding page numbers to existing promises)
    const pdfOnlyMode = !finalManifestText && (pdfBase64 || pdfUrl);

    // Handle PDF upload
    let manifestPdfUrl = null;
    if (pdfBase64) {
      // Decode base64 and upload to storage
      console.log('Uploading PDF from base64');
      const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
      const fileName = `${partyAbbreviation}-${electionYear}-${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('manifests')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload PDF');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('manifests')
        .getPublicUrl(fileName);
      
      manifestPdfUrl = publicUrl;
      console.log('PDF uploaded:', publicUrl);
    } else if (pdfUrl) {
      // Download PDF from URL and upload to storage
      console.log('Downloading PDF from URL:', pdfUrl);
      try {
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to download PDF: HTTP ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
        
        const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
        const fileName = `${partyAbbreviation}-${electionYear}-${Date.now()}.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from('manifests')
          .upload(fileName, pdfBytes, {
            contentType: 'application/pdf'
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload PDF');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('manifests')
          .getPublicUrl(fileName);
        
        manifestPdfUrl = publicUrl;
        console.log('PDF uploaded:', publicUrl);
      } catch (pdfError) {
        console.error('PDF download error:', pdfError);
        throw new Error(`Kunde inte ladda ner PDF från URL: ${pdfError instanceof Error ? pdfError.message : 'Ogiltig URL'}`);
      }
    }

    // Get party ID early as we need it for both modes
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id')
      .eq('abbreviation', partyAbbreviation)
      .single();

    if (partyError || !party) {
      throw new Error(`Party not found: ${partyAbbreviation}`);
    }

    // Handle PDF-only mode: just update manifest_pdf_url for existing promises
    if (pdfOnlyMode) {
      if (!manifestPdfUrl) {
        throw new Error('PDF required for page number updates');
      }

      console.log('PDF-only mode: updating manifest_pdf_url for existing promises');

      // Update all promises for this party/year with the new PDF URL
      const { data: updatedPromises, error: updateError } = await supabase
        .from('promises')
        .update({ manifest_pdf_url: manifestPdfUrl })
        .eq('party_id', party.id)
        .eq('election_year', electionYear)
        .select('id');

      if (updateError) {
        throw new Error('Failed to update promises with PDF URL');
      }

      const updatedCount = updatedPromises?.length || 0;

      return new Response(
        JSON.stringify({ 
          success: true, 
          count: updatedCount,
          pdfOnly: true,
          pdfUrl: manifestPdfUrl,
          message: `PDF-URL uppdaterad för ${updatedCount} löften. Söker efter sidnummer...`
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Helper function to analyze a single chunk
    async function analyzeManifestChunk(
      chunkText: string,
      chunkNum: number,
      totalChunks: number
    ): Promise<any[]> {
      
      const aiRequestBody = JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du är en expert på att analysera politiska valmanifest och extrahera mätbara vallöften.

Din uppgift är att:
1. Identifiera ALLA konkreta, mätbara vallöften i texten - var GENERÖS med vad som räknas som ett löfte
2. För varje vallöfte, ge en kort sammanfattning
3. Inkludera ett direkt citat från manifestet
4. Förklara varför löftet är mätbart

OBS: Detta är chunk ${chunkNum} av ${totalChunks} från ett större manifest. Fokusera endast på att extrahera löften från denna del.

KRITISKT VIKTIGT OM CITAT:
- Citatet MÅSTE vara en EXAKT kopia från manifestet - ord för ord, tecken för tecken
- Ändra ALDRIG ordningen på meningar i citatet
- Parafrasera ALDRIG eller omformulera texten
- Ta ett citat som är 1-3 meningar långt och som är EXAKT från texten

VIKTIGT - VAR GENERÖS: Ett löfte är mätbart om det uppfyller minst ett av dessa kriterier:
- Innehåller specifika siffror eller mål
- Beskriver konkreta lagändringar eller politiska reformer
- Lovar att införa, avskaffa, höja, sänka, stärka eller förändra en specifik policy
- Beskriver en tydlig åtgärd som kan verifieras
- Innehåller ord som "ska", "vill", "föreslår" följt av en konkret åtgärd
- Relativa förändringar utan konkreta siffror ÄR MÄTBARA`
          },
          {
            role: 'user',
            content: chunkText
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
                        promise_text: { type: "string", description: "Kort sammanfattning (max 10-15 ord)" },
                        summary: { type: "string", description: "Kort sammanfattning (max 2 meningar)" },
                        direct_quote: { type: "string", description: "Exakt citat från manifestet" },
                        measurability_reason: { type: "string", description: "Varför löftet är mätbart" }
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
      });

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: aiRequestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI error for chunk ${chunkNum}: ${response.status} - ${errorText.slice(0, 200)}`);
      }

      const responseText = await response.text();
      const aiData = JSON.parse(responseText);
      
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        throw new Error(`No tool call in chunk ${chunkNum} response`);
      }
      
      const extractedPromises = JSON.parse(toolCall.function.arguments);
      return extractedPromises.promises || [];
    }

    // Normal mode: analyze manifest text
    if (!finalManifestText) {
      throw new Error('No manifest text provided');
    }

    // Delete existing promises for this party and year to avoid duplicates
    const { data: deletedPromises, error: deleteError } = await supabase
      .from('promises')
      .delete()
      .eq('party_id', party.id)
      .eq('election_year', electionYear)
      .select('id');

    const deletedCount = deletedPromises?.length || 0;
    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} existing promises for ${partyAbbreviation} ${electionYear}`);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Starting AI analysis for ${partyAbbreviation} ${electionYear}`);
    console.log(`Manifest text length: ${finalManifestText.length} characters`);

    // Check if manifest should be chunked (> 100k characters)
    const CHUNK_SIZE = 100000;
    const shouldChunk = finalManifestText.length > 100000;
    
    let uniquePromises;

    if (shouldChunk) {
      console.log(`Manifest is large (${finalManifestText.length} chars), splitting into chunks...`);
      
      // Split manifest into chunks
      const chunks: string[] = [];
      let currentPos = 0;
      
      while (currentPos < finalManifestText.length) {
        let chunkEnd = Math.min(currentPos + CHUNK_SIZE, finalManifestText.length);
        
        // Try to find a natural breakpoint (newline) near the chunk boundary
        if (chunkEnd < finalManifestText.length) {
          const searchStart = Math.max(chunkEnd - 500, currentPos);
          const lastNewline = finalManifestText.lastIndexOf('\n', chunkEnd);
          if (lastNewline > searchStart) {
            chunkEnd = lastNewline + 1;
          }
        }
        
        chunks.push(finalManifestText.slice(currentPos, chunkEnd));
        currentPos = chunkEnd;
      }
      
      console.log(`Split into ${chunks.length} chunks`);
      
      // Analyze each chunk separately
      const allPromises = [];
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Analyzing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
        
        const chunkPromises = await analyzeManifestChunk(
          chunks[i],
          i + 1,
          chunks.length
        );
        
        allPromises.push(...chunkPromises);
        console.log(`Chunk ${i + 1} complete: found ${chunkPromises.length} promises`);
      }
      
      // Deduplicate promises based on promise_text similarity
      const seen = new Set<string>();
      const deduplicatedPromises = allPromises.filter(promise => {
        const normalized = promise.promise_text.toLowerCase().trim();
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      });
      
      console.log(`Deduplication: ${allPromises.length} -> ${deduplicatedPromises.length} promises`);
      uniquePromises = deduplicatedPromises;
    } else {
      // Small manifest - analyze in one go
      console.log('Analyzing small manifest in single request...');
      
      const aiRequestBody = JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du är en expert på att analysera politiska valmanifest och extrahera mätbara vallöften.

Din uppgift är att:
1. Identifiera ALLA konkreta, mätbara vallöften i texten - var GENERÖS med vad som räknas som ett löfte
2. För varje vallöfte, ge en kort sammanfattning
3. Inkludera ett direkt citat från manifestet
4. Förklara varför löftet är mätbart

KRITISKT VIKTIGT OM CITAT:
- Citatet MÅSTE vara en EXAKT kopia från manifestet - ord för ord, tecken för tecken
- Ändra ALDRIG ordningen på meningar i citatet
- Parafrasera ALDRIG eller omformulera texten
- Ta ett citat som är 1-3 meningar långt och som är EXAKT från texten
- Om du ser formuleringen "Vi vill" eller "Vi föreslår" följt av flera punkter, ta med varje punkt som ett separat löfte

Exempel på FELAKTIGT citat (ändrar ordning):
"Vi vill minska korruption. Biståndet är viktigt. Därför ska det vara 1% av BNI."

Exempel på KORREKT citat (exakt som i text):
"Biståndet spelar en viktig roll i en orolig värld. Därför vill vi att det svenska biståndet ska uppnå till en procent av BNI."

OBS: Ange INTE sidnummer eftersom de inte går att härleda från endast texten.

VIKTIGT - VAR GENERÖS: Ett löfte är mätbart om det uppfyller minst ett av dessa kriterier:
- Innehåller specifika siffror eller mål (t.ex. "sänka skatten med 10%", "höja straffen till 15 år")
- Beskriver konkreta lagändringar eller politiska reformer (t.ex. "avskaffa X", "ändra lagen om Y", "införa Z")
- Lovar att införa, avskaffa, höja, sänka, stärka eller förändra en specifik policy, lag eller åtgärd
- Beskriver en tydlig åtgärd som kan verifieras (t.ex. "utvisa kriminella", "förbjuda tiggeri")
- Innehåller ord som "ska", "vill", "föreslår" följt av en konkret åtgärd
- VIKTIGT: Relativa förändringar utan konkreta siffror ÄR MÄTBARA (t.ex. "sänka straffmyndighetsåldern", "höja straffen", "öka anslagen", "minska byråkratin") - dessa går att mäta genom att jämföra före och efter

VAD SOM INTE ÄR MÄTBART (var restriktiv här):
- Endast vaga mål utan någon konkret åtgärd (t.ex. "förbättra välfärden" utan att säga hur)
- Bara värderingar och principer utan handling (t.ex. "vi tror på jämlikhet")
- Endast visioner utan leverans (t.ex. "ett bättre Sverige")

GENERELL PRINCIP: Om texten säger "vi vill/ska/föreslår [göra något konkret]", inkludera det som ett löfte.`
          },
          {
            role: 'user',
            content: finalManifestText
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
                          description: "Fullständigt, exakt citat från manifestet som stödjer löftet. VIKTIGT: Använd ALDRIG [...] eller andra förkortningar - inkludera hela citatet ordagrant."
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
      });
      
      console.log(`AI request body size: ${aiRequestBody.length} bytes`);
      
      let response;
      try {
        // Call Lovable AI to analyze the manifest with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 280000); // 280 seconds (just under 300s function timeout)
        
        response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: aiRequestBody,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log('AI response received with status:', response.status);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('AI request timeout after 280 seconds');
          throw new Error('AI-analysen tog för lång tid (timeout efter 280 sekunder). Försök med ett kortare manifest eller dela upp det i flera delar.');
        }
        console.error('AI fetch error:', fetchError);
        throw new Error(`Nätverksfel vid AI-anrop: ${fetchError instanceof Error ? fetchError.message : 'Okänt fel'}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, response.statusText, errorText);
        
        if (response.status === 429) {
          throw new Error('AI rate limit överskriden. Försök igen om några minuter.');
        }
        if (response.status === 402) {
          throw new Error('AI-krediter slut. Lägg till mer credits i din Lovable workspace.');
        }
        
        throw new Error(`AI API error: ${response.status} ${response.statusText} - ${errorText.slice(0, 200)}`);
      }

      // Parse AI response with detailed error logging
      let aiData;
      
      // Read response body with error handling
      console.log('Starting to read AI response body...');
      let responseText: string;
      try {
        responseText = await response.text();
        console.log('AI response body read successfully, length:', responseText.length);
      } catch (readError) {
        console.error('Failed to read AI response body:', readError);
        throw new Error(`Kunde inte läsa AI-svar (möjligen för stort): ${readError instanceof Error ? readError.message : 'Okänt fel'}`);
      }

      // Parse the AI response JSON
      try {
        aiData = JSON.parse(responseText);
        console.log('AI response parsed successfully');
        console.log('AI response structure:', JSON.stringify({
          hasChoices: !!aiData.choices,
          choicesLength: aiData.choices?.length,
          hasMessage: !!aiData.choices?.[0]?.message,
          hasToolCalls: !!aiData.choices?.[0]?.message?.tool_calls,
          toolCallsLength: aiData.choices?.[0]?.message?.tool_calls?.length
        }));
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Response text (first 500 chars):', responseText.slice(0, 500));
        throw new Error('AI returnerade ogiltigt JSON-svar');
      }

      // Extract the tool call result with defensive checks
      console.log('Attempting to extract tool call...');
      if (!aiData.choices || !Array.isArray(aiData.choices) || aiData.choices.length === 0) {
        console.error('Invalid AI response structure - no choices array');
        throw new Error('AI-svar saknar choices array');
      }

      const firstChoice = aiData.choices[0];
      if (!firstChoice.message) {
        console.error('Invalid AI response structure - no message in first choice');
        throw new Error('AI-svar saknar message i första valet');
      }

      if (!firstChoice.message.tool_calls || !Array.isArray(firstChoice.message.tool_calls) || firstChoice.message.tool_calls.length === 0) {
        console.error('Invalid AI response structure - no tool_calls');
        console.error('Message content:', JSON.stringify(firstChoice.message).slice(0, 500));
        throw new Error('AI-svar saknar tool_calls. Möjligen har AI:n returnerat ett vanligt meddelande istället.');
      }

      const toolCall = firstChoice.message.tool_calls[0];
      console.log('Tool call extracted:', {
        hasFunction: !!toolCall.function,
        hasArguments: !!toolCall.function?.arguments,
        argumentsLength: toolCall.function?.arguments?.length
      });

      // Parse tool call arguments with error handling
      let extractedPromises;
      try {
        extractedPromises = JSON.parse(toolCall.function.arguments);
        console.log('Tool call arguments parsed successfully');
        console.log('Extracted promises structure:', {
          hasPromises: !!extractedPromises.promises,
          isArray: Array.isArray(extractedPromises.promises),
          promisesCount: extractedPromises.promises?.length
        });
      } catch (argParseError) {
        console.error('Failed to parse tool call arguments:', argParseError);
        console.error('Arguments string (first 500 chars):', toolCall.function.arguments.slice(0, 500));
        throw new Error('Kunde inte tolka AI:ns löften-data');
      }

      if (!extractedPromises.promises || !Array.isArray(extractedPromises.promises)) {
        console.error('Invalid promises structure - not an array');
        throw new Error('AI returnerade ogiltig löftesstruktur');
      }

      uniquePromises = extractedPromises.promises;
    }
    console.log(`Preparing to insert ${uniquePromises.length} promises`);

    // Validate promise structure before insert
    const promisesToInsert = uniquePromises.map((p: any, index: number) => {
      if (!p.promise_text || !p.summary || !p.direct_quote) {
        console.error(`Promise ${index} missing required fields:`, {
          hasPromiseText: !!p.promise_text,
          hasSummary: !!p.summary,
          hasDirectQuote: !!p.direct_quote
        });
      }
      return {
        party_id: party.id,
        election_year: electionYear,
        promise_text: p.promise_text,
        summary: p.summary,
        direct_quote: p.direct_quote,
        page_number: null, // Frontend will find this
        manifest_pdf_url: manifestPdfUrl || null,
        measurability_reason: p.measurability_reason || null,
        status: 'pending-analysis'
      };
    });

    console.log('Attempting database insert...');
    const { data: insertedPromises, error: insertError } = await supabase
      .from('promises')
      .insert(promisesToInsert)
      .select();

    if (insertError) {
      console.error('Database insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw new Error(`Databasfel vid insättning: ${insertError.message}`);
    }

    if (!insertedPromises || insertedPromises.length === 0) {
      console.error('No promises were inserted (insertedPromises is empty)');
      throw new Error('Inga löften kunde sparas i databasen');
    }

    console.log(`Successfully inserted ${insertedPromises.length} unique promises`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: insertedPromises.length,
        duplicatesRemoved: deletedCount,
        promises: insertedPromises,
        pdfUrl: manifestPdfUrl
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