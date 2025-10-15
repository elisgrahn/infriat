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
      const txtResponse = await fetch(txtUrl);
      if (!txtResponse.ok) throw new Error('Failed to download TXT file');
      finalManifestText = await txtResponse.text();
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
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) throw new Error('Failed to download PDF file');
      
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

    // Handle PDF-only mode: update page numbers for existing promises
    if (pdfOnlyMode) {
      if (!manifestPdfUrl) {
        throw new Error('PDF required for page number updates');
      }

      console.log('PDF-only mode: updating page numbers for existing promises');

      // Fetch existing promises without page numbers
      const { data: existingPromises, error: fetchError } = await supabase
        .from('promises')
        .select('id, direct_quote')
        .eq('party_id', party.id)
        .eq('election_year', electionYear)
        .is('page_number', null);

      if (fetchError) {
        throw new Error('Failed to fetch existing promises');
      }

      if (!existingPromises || existingPromises.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            count: 0,
            pdfOnly: true,
            message: 'Inga löften utan sidnummer hittades för detta parti och år'
          }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`Found ${existingPromises.length} promises without page numbers`);

      // Load and search PDF
      const pdfResponse = await fetch(manifestPdfUrl);
      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: pdfArrayBuffer });
      const pdf = await loadingTask.promise;

      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/- /g, '')
          .replace(/\n/g, ' ')
          .trim();
      };

      // Extract all text from PDF
      const pageTexts: Array<{pageNum: number, normalized: string}> = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        pageTexts.push({ pageNum: i, normalized: normalizeText(pageText) });
      }

      // Find page numbers for each promise
      let updatedCount = 0;
      for (const promise of existingPromises) {
        const normalizedQuote = normalizeText(promise.direct_quote);
        let foundPage = null;

        // Try exact match
        for (const { pageNum, normalized } of pageTexts) {
          if (normalized.includes(normalizedQuote)) {
            foundPage = pageNum;
            break;
          }
        }

        // Try fuzzy match for longer quotes
        if (!foundPage && normalizedQuote.length > 30) {
          const words = normalizedQuote.split(' ').filter(w => w.length > 0);
          const requiredWords = Math.floor(words.length * 0.8);

          for (const { pageNum, normalized } of pageTexts) {
            const matchedWords = words.filter(word => 
              word.length > 3 && normalized.includes(word)
            );

            if (matchedWords.length >= requiredWords) {
              foundPage = pageNum;
              break;
            }
          }
        }

        // Update promise with page number if found
        if (foundPage) {
          const { error: updateError } = await supabase
            .from('promises')
            .update({ 
              page_number: foundPage,
              manifest_pdf_url: manifestPdfUrl 
            })
            .eq('id', promise.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          count: updatedCount,
          pdfOnly: true,
          message: `Sidnummer uppdaterat för ${updatedCount} av ${existingPromises.length} löften`
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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

    console.log(`Starting AI analysis`);

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

OBS: Ange INTE sidnummer eftersom de inte går att härleda från endast texten.

Ett löfte är mätbart om det uppfyller minst ett av dessa kriterier:
- Innehåller specifika siffror eller mål (t.ex. "sänka skatten med 10%")
- Beskriver konkreta lagändringar eller politiska reformer (t.ex. "avskaffa strandskyddet", "ändra lagen om X")
- Lovar att införa eller avskaffa en specifik policy eller myndighet
- Beskriver en tydlig åtgärd som kan verifieras genom offentliga handlingar (riksdagsmotion, proposition, lagändringar)

Inte mätbart:
- Vaga mål utan konkret åtgärd (t.ex. "förbättra välfärden", "stärka Sverige")
- Värderingar och principer utan specifik handling
- Allmänna visioner utan tydlig leverans

Inkludera löften även om de inte har specifika siffror, så länge åtgärden är konkret och kan verifieras.`
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
    const uniquePromises = extractedPromises.promises; // All promises are unique since we deleted old ones

    // Search for quotes in PDF if we have one
    let quoteVerification: Array<{quote: string, found: boolean, pageNumber: number | null}> = [];
    
    if (manifestPdfUrl) {
      console.log('Searching for quotes in PDF...');
      try {
        // Download PDF
        const pdfResponse = await fetch(manifestPdfUrl);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        
        // Load PDF document
        const loadingTask = pdfjs.getDocument({ data: pdfArrayBuffer });
        const pdf = await loadingTask.promise;
        
        console.log(`PDF loaded, ${pdf.numPages} pages`);
        
        // Function to normalize text for better matching
        const normalizeText = (text: string) => {
          return text
            .toLowerCase()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/- /g, '') // Remove hyphens at line breaks
            .replace(/\n/g, ' ') // Replace newlines with spaces
            .trim();
        };
        
        // Extract all text from PDF with page numbers
        const pageTexts: Array<{pageNum: number, text: string, normalized: string}> = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          pageTexts.push({ 
            pageNum: i, 
            text: pageText.toLowerCase(),
            normalized: normalizeText(pageText)
          });
        }
        
        // Search for each quote
        for (const promise of uniquePromises) {
          const quote = promise.direct_quote.toLowerCase().trim();
          const normalizedQuote = normalizeText(promise.direct_quote);
          let found = false;
          let foundPage = null;
          
          // Try exact match with normalized text
          for (const { pageNum, normalized } of pageTexts) {
            if (normalized.includes(normalizedQuote)) {
              found = true;
              foundPage = pageNum;
              console.log(`Exact match found for quote on page ${pageNum}`);
              break;
            }
          }
          
          // If no exact match, try fuzzy matching for longer quotes
          if (!found && normalizedQuote.length > 30) {
            const words = normalizedQuote.split(' ').filter(w => w.length > 0);
            const requiredWords = Math.floor(words.length * 0.8); // 80% of words must match
            
            for (const { pageNum, normalized } of pageTexts) {
              const matchedWords = words.filter(word => 
                word.length > 3 && normalized.includes(word)
              );
              
              if (matchedWords.length >= requiredWords) {
                found = true;
                foundPage = pageNum;
                console.log(`Fuzzy match found (${matchedWords.length}/${words.length} words) on page ${pageNum}`);
                break;
              }
            }
          }
          
          quoteVerification.push({
            quote: promise.direct_quote,
            found,
            pageNumber: foundPage
          });
          
          if (!found) {
            console.warn(`Quote not found in PDF: "${promise.direct_quote.substring(0, 100)}..."`);
          }
        }
      } catch (pdfError) {
        console.error('Error searching PDF:', pdfError);
        // Continue anyway, just without verification
      }
    }

    // Insert promises with verified page numbers
    const promisesToInsert = uniquePromises.map((p: any, index: number) => ({
      party_id: party.id,
      election_year: electionYear,
      promise_text: p.promise_text,
      summary: p.summary,
      direct_quote: p.direct_quote,
      page_number: quoteVerification[index]?.pageNumber || null,
      manifest_pdf_url: manifestPdfUrl || null,
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

    // Prepare warnings for unverified quotes
    const unverifiedQuotes = quoteVerification
      .filter(v => !v.found)
      .map(v => v.quote.substring(0, 100));

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: insertedPromises.length,
        duplicatesRemoved: deletedCount,
        promises: insertedPromises,
        warnings: unverifiedQuotes.length > 0 ? {
          unverifiedQuotes: unverifiedQuotes,
          message: `${unverifiedQuotes.length} citat kunde inte verifieras i PDF:en. Detta kan indikera hallucinationer.`
        } : null
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