import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

    // Validate request body
    const requestSchema = z.object({
      manifestText: z.string().max(1000000).optional(),
      txtUrl: z.string().url().max(2000).optional(),
      pdfBase64: z.string().optional(),
      pdfUrl: z.string().url().max(2000).optional(),
      partyAbbreviation: z.string().min(1).max(10),
      electionYear: z.number().int().min(1900).max(2100)
    }).refine(
      (data) => data.manifestText || data.txtUrl || data.pdfBase64 || data.pdfUrl,
      { message: "At least one of manifestText, txtUrl, pdfBase64, or pdfUrl must be provided" }
    );

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return new Response(JSON.stringify({ error: 'Ogiltig begäran' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { manifestText, txtUrl, pdfBase64, pdfUrl, partyAbbreviation, electionYear } = validation.data;

    console.log(`Analyzing manifest for ${partyAbbreviation} ${electionYear}`);

    // Get manifest text (either from input or download from URL)
    let finalManifestText = manifestText;
    if (!finalManifestText && txtUrl) {
      console.log('Downloading TXT from URL:', txtUrl);
      try {
        const txtResponse = await fetch(txtUrl);
        if (!txtResponse.ok) {
          console.error(`Failed to download TXT: HTTP ${txtResponse.status} ${txtResponse.statusText}`);
          throw new Error('Kunde inte ladda ner TXT-filen. Kontrollera URL:en.');
        }
        finalManifestText = await txtResponse.text();
      } catch (txtError) {
        console.error('TXT download error:', txtError);
        throw new Error('Kunde inte ladda ner TXT-filen. Kontrollera att URL:en är korrekt.');
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
          throw new Error('Kunde inte ladda upp PDF-filen. Försök igen.');
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
          console.error(`Failed to download PDF: HTTP ${pdfResponse.status} ${pdfResponse.statusText}`);
          throw new Error('Kunde inte ladda ner PDF-filen. Kontrollera URL:en.');
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
          throw new Error('Kunde inte ladda upp PDF-filen. Försök igen.');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('manifests')
          .getPublicUrl(fileName);
        
        manifestPdfUrl = publicUrl;
        console.log('PDF uploaded:', publicUrl);
      } catch (pdfError) {
        console.error('PDF download error:', pdfError);
        throw new Error('Kunde inte ladda ner PDF-filen. Kontrollera att URL:en är korrekt.');
      }
    }

    // Get party ID early as we need it for both modes
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id')
      .eq('abbreviation', partyAbbreviation)
      .single();

    if (partyError || !party) {
      console.error('Party not found:', partyAbbreviation, partyError);
      throw new Error('Partiet hittades inte i databasen.');
    }

    // Handle PDF-only mode: just update manifest_pdf_url for existing promises
    if (pdfOnlyMode) {
      if (!manifestPdfUrl) {
        return new Response(JSON.stringify({ error: 'PDF krävs för att uppdatera sidnummer' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
        console.error('Update error:', updateError);
        throw new Error('Kunde inte uppdatera vallöften med PDF-URL. Försök igen.');
      }

      const updatedCount = updatedPromises?.length || 0;

      // Page numbers will be searched locally in the browser by the client
      console.log(`PDF uploaded, page numbers will be searched in browser`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          count: updatedCount,
          pdfOnly: true,
          pdfUrl: manifestPdfUrl,
          message: `PDF-URL uppdaterad för ${updatedCount} löften. Sidnummer söks lokalt i webbläsaren.`
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
        max_completion_tokens: 30000,
        messages: [
          {
            role: 'system',
            content: `Du är en expert på att analysera politiska valmanifest och extrahera mätbara vallöften.

Din uppgift är att:
1. Identifiera ALLA konkreta, mätbara vallöften i texten - var GENERÖS med vad som räknas som ett löfte
2. För varje vallöfte, ge en kort sammanfattning
3. Inkludera ett direkt citat från manifestet
4. Förklara varför löftet är mätbart
5. GE EN MEASURABILITY SCORE (1-5) baserat på hur konkret och mätbart löftet är

MEASURABILITY SCORE GUIDE:
- Score 5: Extremt mätbart - Innehåller specifika numeriska mål OCH tidsram (ex: "Öka X med 25% till 2026", "Bygga 10,000 bostäder innan 2027")
- Score 4: Mycket mätbart - Konkreta numeriska mål ELLER tidsram (ex: "Halvera utsläppen", "Bygga 5000 bostäder", "Avskaffa X före 2025")
- Score 3: Måttligt mätbart - Tydlig åtgärd utan siffror (ex: "Införa lag om X", "Avskaffa bidrag Y", "Öka anslaget till Z")
- Score 2: Svagt mätbart - Relativa förändringar utan konkreta mål (ex: "Förbättra villkoren för X", "Stärka Y", "Öka satsningar på Z")
- Score 1: Nästan omätbart - Vaga formuleringar (ex: "Få ordning på landet", "Skapa trygghet", "Förbättra samhället")

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
                        measurability_reason: { type: "string", description: "Varför löftet är mätbart" },
                        measurability_score: { 
                          type: "integer", 
                          description: "Score 1-5 som mäter hur konkret löftet är. 5 = mycket mätbart med siffror och tidsram, 1 = vagt",
                          minimum: 1,
                          maximum: 5
                        }
                      },
                      required: ["promise_text", "summary", "direct_quote", "measurability_reason", "measurability_score"],
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
        console.error(`AI error for chunk ${chunkNum}:`, response.status, errorText);
        throw new Error('AI-analysen misslyckades. Försök igen.');
      }

      console.log(`Starting to read AI response body for chunk ${chunkNum}...`);
      let responseText: string;
      try {
        responseText = await response.text();
        console.log(`AI response body read successfully for chunk ${chunkNum}, length: ${responseText.length}`);
      } catch (readError) {
        console.error(`Failed to read AI response body for chunk ${chunkNum}:`, readError);
        throw new Error('Kunde inte läsa AI-svar. Svaret kan vara för stort. Försök igen.');
      }

      let aiData: any;
      try {
        aiData = JSON.parse(responseText);
        console.log(`AI response parsed successfully for chunk ${chunkNum}`);
      } catch (parseError) {
        console.error(`Failed to parse AI response for chunk ${chunkNum}:`, parseError);
        console.error(`Response text (first 500 chars):`, responseText.slice(0, 500));
        throw new Error('AI returnerade ogiltigt svar. Försök igen.');
      }

      console.log(`AI response structure for chunk ${chunkNum}:`, {
        hasChoices: !!aiData.choices,
        choicesLength: aiData.choices?.length,
        hasMessage: !!aiData.choices?.[0]?.message,
        hasToolCalls: !!aiData.choices?.[0]?.message?.tool_calls,
        toolCallsLength: aiData.choices?.[0]?.message?.tool_calls?.length
      });

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error(`No tool call in chunk ${chunkNum} response`);
        throw new Error('AI returnerade ogiltigt svar. Försök igen.');
      }

      console.log(`Tool call extracted for chunk ${chunkNum}:`, {
        hasFunction: !!toolCall.function,
        hasArguments: !!toolCall.function?.arguments,
        argumentsLength: toolCall.function?.arguments?.length
      });

      let extractedPromises: any;
      try {
        extractedPromises = JSON.parse(toolCall.function.arguments);
        console.log(`Tool call arguments parsed successfully for chunk ${chunkNum}`);
      } catch (argsError) {
        console.error(`Failed to parse tool call arguments for chunk ${chunkNum}:`, argsError);
        throw new Error('Kunde inte läsa löften från AI-svar. Försök igen.');
      }

      console.log(`Extracted promises structure for chunk ${chunkNum}:`, {
        hasPromises: !!extractedPromises.promises,
        isArray: Array.isArray(extractedPromises.promises),
        promisesCount: extractedPromises.promises?.length
      });

      return extractedPromises.promises || [];
    }

    // Normal mode: analyze manifest text
    if (!finalManifestText) {
      return new Response(JSON.stringify({ error: 'Ingen manifesttext angiven' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Tjänsten är inte konfigurerad' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        
        let chunkPromises: any[] = [];
        let retries = 0;
        const MAX_RETRIES = 2;
        
        while (retries <= MAX_RETRIES) {
          try {
            chunkPromises = await analyzeManifestChunk(
              chunks[i],
              i + 1,
              chunks.length
            );
            break; // Success, exit retry loop
          } catch (chunkError) {
            retries++;
            console.error(`Chunk ${i + 1} failed (attempt ${retries}/${MAX_RETRIES + 1}):`, chunkError);
            
            if (retries > MAX_RETRIES) {
              console.error(`Chunk ${i + 1} failed after ${MAX_RETRIES + 1} attempts, skipping...`);
              // Continue to next chunk instead of failing entire analysis
              break;
            }
            
            // Wait before retry (exponential backoff)
            const waitTime = 2000 * Math.pow(2, retries - 1); // 2s, 4s
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        allPromises.push(...chunkPromises);
        console.log(`Chunk ${i + 1} complete: found ${chunkPromises.length} promises`);
      }
      
      if (allPromises.length === 0) {
        throw new Error(`Inga löften kunde extraheras från manifestet. Detta kan bero på timeout eller AI-fel.`);
      }
      
      console.log(`Total promises extracted from all chunks: ${allPromises.length}`);
      
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
5. GE EN MEASURABILITY SCORE (1-5) baserat på hur konkret och mätbart löftet är

MEASURABILITY SCORE GUIDE:
- Score 5: Extremt mätbart - Innehåller specifika numeriska mål OCH tidsram (ex: "Öka X med 25% till 2026", "Bygga 10,000 bostäder innan 2027")
- Score 4: Mycket mätbart - Konkreta numeriska mål ELLER tidsram (ex: "Halvera utsläppen", "Bygga 5000 bostäder", "Avskaffa X före 2025")
- Score 3: Måttligt mätbart - Tydlig åtgärd utan siffror (ex: "Införa lag om X", "Avskaffa bidrag Y", "Öka anslaget till Z")
- Score 2: Svagt mätbart - Relativa förändringar utan konkreta mål (ex: "Förbättra villkoren för X", "Stärka Y", "Öka satsningar på Z")
- Score 1: Nästan omätbart - Vaga formuleringar (ex: "Få ordning på landet", "Skapa trygghet", "Förbättra samhället")

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
                        },
                        measurability_score: { 
                          type: "integer", 
                          description: "Score 1-5 som mäter hur konkret löftet är. 5 = mycket mätbart med siffror och tidsram, 1 = vagt",
                          minimum: 1,
                          maximum: 5
                        }
                      },
                      required: ["promise_text", "summary", "direct_quote", "measurability_reason", "measurability_score"],
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
          throw new Error('AI-analysen tog för lång tid. Försök med ett kortare manifest eller dela upp det i flera delar.');
        }
        console.error('AI fetch error:', fetchError);
        throw new Error('Nätverksfel vid AI-anrop. Kontrollera din anslutning och försök igen.');
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
        
        throw new Error('AI-analysen misslyckades. Försök igen.');
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
        throw new Error('Kunde inte läsa AI-svar. Svaret kan vara för stort. Försök igen.');
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
        throw new Error('AI returnerade ogiltigt svar. Försök igen.');
      }

      const firstChoice = aiData.choices[0];
      if (!firstChoice.message) {
        console.error('Invalid AI response structure - no message in first choice');
        throw new Error('AI returnerade ogiltigt svar. Försök igen.');
      }

      if (!firstChoice.message.tool_calls || !Array.isArray(firstChoice.message.tool_calls) || firstChoice.message.tool_calls.length === 0) {
        console.error('Invalid AI response structure - no tool_calls');
        console.error('Message content:', JSON.stringify(firstChoice.message).slice(0, 500));
        throw new Error('AI returnerade ogiltigt svar. Försök igen.');
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
        throw new Error('Kunde inte tolka AI:ns löften-data. Försök igen.');
      }

      if (!extractedPromises.promises || !Array.isArray(extractedPromises.promises)) {
        console.error('Invalid promises structure - not an array');
        throw new Error('AI returnerade ogiltigt svar. Försök igen.');
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
        measurability_score: p.measurability_score || null,
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
      throw new Error('Kunde inte spara löften i databasen. Försök igen.');
    }

    if (!insertedPromises || insertedPromises.length === 0) {
      console.error('No promises were inserted (insertedPromises is empty)');
      throw new Error('Inga löften kunde sparas i databasen. Försök igen.');
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Ett fel uppstod. Försök igen.' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});