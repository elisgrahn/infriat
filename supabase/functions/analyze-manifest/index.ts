import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { requireGoogleApiKey, geminiUrl } from '../_shared/gemini.ts';

// Tool schema shared between single-request and chunked paths
const extractPromisesTool = {
  functionDeclarations: [{
    name: "extract_promises",
    description: "Extrahera mätbara vallöften från valmanifestet",
    parameters: {
      type: "OBJECT",
      properties: {
        promises: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              promise_text: { type: "STRING", description: "Kort sammanfattning (max 10-15 ord)" },
              summary: { type: "STRING", description: "Kort sammanfattning (max 2 meningar)" },
              direct_quote: { type: "STRING", description: "Exakt citat från manifestet" },
              measurability_reason: { type: "STRING", description: "Varför löftet är mätbart" },
              measurability_score: {
                type: "INTEGER",
                description: "Score 1-5. 5 = mycket mätbart med siffror och tidsram, 1 = vagt"
              }
            },
            required: ["promise_text", "summary", "direct_quote", "measurability_reason", "measurability_score"]
          }
        }
      },
      required: ["promises"]
    }
  }]
};

function buildSystemPrompt(chunkInfo?: { num: number; total: number }): string {
  const chunkNote = chunkInfo
    ? `\nOBS: Detta är chunk ${chunkInfo.num} av ${chunkInfo.total} från ett större manifest. Fokusera endast på att extrahera löften från denna del.`
    : '';

  return `Du är en expert på att analysera politiska valmanifest och extrahera mätbara vallöften.

Din uppgift är att:
1. Identifiera ALLA konkreta, mätbara vallöften i texten - var GENERÖS med vad som räknas som ett löfte
2. För varje vallöfte, ge en kort sammanfattning
3. Inkludera ett direkt citat från manifestet
4. Förklara varför löftet är mätbart
5. GE EN MEASURABILITY SCORE (1-5) baserat på hur konkret och mätbart löftet är

MEASURABILITY SCORE GUIDE:
- Score 5: Extremt mätbart - Innehåller specifika numeriska mål OCH tidsram
- Score 4: Mycket mätbart - Konkreta numeriska mål ELLER tidsram
- Score 3: Måttligt mätbart - Tydlig åtgärd utan siffror
- Score 2: Svagt mätbart - Relativa förändringar utan konkreta mål
- Score 1: Nästan omätbart - Vaga formuleringar
${chunkNote}

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
- Relativa förändringar utan konkreta siffror ÄR MÄTBARA

Anropa funktionen extract_promises med de löften du hittar.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { userClient, adminClient } = await requireAdmin(req);
    const apiKey = requireGoogleApiKey();

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
      return errorResponse('Ogiltig begäran', 400);
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
          throw new Error(`HTTP ${txtResponse.status} ${txtResponse.statusText}`);
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
    let manifestPdfUrl: string | null = null;
    if (pdfBase64) {
      console.log('Uploading PDF from base64');
      const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
      const fileName = `${partyAbbreviation}-${electionYear}-${Date.now()}.pdf`;

      const { error: uploadError } = await adminClient.storage
        .from('manifests')
        .upload(fileName, pdfBytes, { contentType: 'application/pdf' });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Kunde inte ladda upp PDF-filen. Försök igen.');
      }

      const { data: { publicUrl } } = adminClient.storage
        .from('manifests')
        .getPublicUrl(fileName);

      manifestPdfUrl = publicUrl;
      console.log('PDF uploaded:', publicUrl);
    } else if (pdfUrl) {
      console.log('Downloading PDF from URL:', pdfUrl);
      try {
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          throw new Error(`HTTP ${pdfResponse.status} ${pdfResponse.statusText}`);
        }

        const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
        const fileName = `${partyAbbreviation}-${electionYear}-${Date.now()}.pdf`;

        const { error: uploadError } = await adminClient.storage
          .from('manifests')
          .upload(fileName, pdfBytes, { contentType: 'application/pdf' });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Kunde inte ladda upp PDF-filen. Försök igen.');
        }

        const { data: { publicUrl } } = adminClient.storage
          .from('manifests')
          .getPublicUrl(fileName);

        manifestPdfUrl = publicUrl;
        console.log('PDF uploaded:', publicUrl);
      } catch (pdfError) {
        console.error('PDF download error:', pdfError);
        throw new Error('Kunde inte ladda ner PDF-filen. Kontrollera att URL:en är korrekt.');
      }
    }

    // Get party ID early
    const { data: party, error: partyError } = await userClient
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
        return errorResponse('PDF krävs för att uppdatera sidnummer', 400);
      }

      console.log('PDF-only mode: updating manifest_pdf_url for existing promises');

      const { data: updatedPromises, error: updateError } = await adminClient
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
      console.log(`PDF uploaded, updated ${updatedCount} promises`);

      return jsonResponse({
        success: true,
        count: updatedCount,
        pdfOnly: true,
        pdfUrl: manifestPdfUrl,
        message: `PDF-URL uppdaterad för ${updatedCount} löften. Sidnummer söks lokalt i webbläsaren.`
      });
    }

    // Normal mode: analyze manifest text
    if (!finalManifestText) {
      return errorResponse('Ingen manifesttext angiven', 400);
    }

    console.log(`Starting AI analysis, manifest length: ${finalManifestText.length} chars`);

    // Helper function to call Google Gemini for a single chunk
    async function analyzeChunk(
      chunkText: string,
      chunkNum: number,
      totalChunks: number
    ): Promise<any[]> {
      const response = await fetch(geminiUrl(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: buildSystemPrompt({ num: chunkNum, total: totalChunks }) },
              { text: chunkText }
            ]
          }],
          tools: [extractPromisesTool],
          toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["extract_promises"] } },
          generationConfig: { temperature: 0.2, topP: 0.8 },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI error for chunk ${chunkNum}:`, response.status, errorText);
        throw new Error(`AI-analysen misslyckades (${response.status})`);
      }

      const aiData = await response.json();

      // Extract function call response from Gemini
      const parts = aiData.candidates?.[0]?.content?.parts || [];
      const functionCall = parts.find((p: any) => p.functionCall)?.functionCall;

      if (!functionCall || functionCall.name !== 'extract_promises') {
        // Fallback: try to parse text response as JSON
        const textPart = parts.find((p: any) => p.text)?.text;
        if (textPart) {
          console.log(`Chunk ${chunkNum}: no function call, trying text parse`);
          let jsonStr = textPart.trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          const parsed = JSON.parse(jsonStr);
          return parsed.promises || [];
        }
        console.error(`Chunk ${chunkNum}: no function call in response`);
        throw new Error('AI returnerade ogiltigt svar');
      }

      const args = functionCall.args;
      console.log(`Chunk ${chunkNum}: extracted ${args?.promises?.length || 0} promises`);
      return args?.promises || [];
    }

    // Determine if we need to chunk
    const CHUNK_SIZE = 100000;
    const shouldChunk = finalManifestText.length > CHUNK_SIZE;
    let uniquePromises: any[];

    if (shouldChunk) {
      console.log(`Large manifest (${finalManifestText.length} chars), splitting into chunks...`);

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

      const allPromises: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Analyzing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);

        let chunkPromises: any[] = [];
        const MAX_RETRIES = 2;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            chunkPromises = await analyzeChunk(chunks[i], i + 1, chunks.length);
            break;
          } catch (err) {
            console.error(`Chunk ${i + 1} attempt ${attempt + 1} failed:`, err);
            if (attempt >= MAX_RETRIES) {
              console.error(`Chunk ${i + 1} failed after ${MAX_RETRIES + 1} attempts, skipping`);
              break;
            }
            const wait = 2000 * Math.pow(2, attempt);
            console.log(`Waiting ${wait}ms before retry...`);
            await new Promise(r => setTimeout(r, wait));
          }
        }

        allPromises.push(...chunkPromises);
        console.log(`Chunk ${i + 1} complete: ${chunkPromises.length} promises`);
      }

      if (allPromises.length === 0) {
        throw new Error('Inga löften kunde extraheras från manifestet.');
      }

      // Deduplicate
      const seen = new Set<string>();
      uniquePromises = allPromises.filter(p => {
        const key = p.promise_text.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      console.log(`Deduplication: ${allPromises.length} -> ${uniquePromises.length}`);
    } else {
      // Small manifest — single request
      console.log('Analyzing small manifest in single request...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 280000);

      let response: Response;
      try {
        response = await fetch(geminiUrl(apiKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: buildSystemPrompt() },
                { text: finalManifestText }
              ]
            }],
            tools: [extractPromisesTool],
            toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["extract_promises"] } },
            generationConfig: { temperature: 0.2, topP: 0.8 },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('AI-analysen tog för lång tid. Försök med ett kortare manifest.');
        }
        throw new Error('Nätverksfel vid AI-anrop. Försök igen.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        if (response.status === 429) throw new Error('AI rate limit. Försök igen om några minuter.');
        throw new Error(`AI-analysen misslyckades (${response.status}). Försök igen.`);
      }

      const aiData = await response.json();

      // Extract function call
      const parts = aiData.candidates?.[0]?.content?.parts || [];
      const functionCall = parts.find((p: any) => p.functionCall)?.functionCall;

      if (!functionCall || functionCall.name !== 'extract_promises') {
        // Fallback: try text
        const textPart = parts.find((p: any) => p.text)?.text;
        if (textPart) {
          let jsonStr = textPart.trim();
          if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
          const parsed = JSON.parse(jsonStr);
          uniquePromises = parsed.promises || [];
        } else {
          throw new Error('AI returnerade ogiltigt svar. Försök igen.');
        }
      } else {
        uniquePromises = functionCall.args?.promises || [];
      }
    }

    if (!uniquePromises || uniquePromises.length === 0) {
      throw new Error('Inga löften kunde extraheras från manifestet.');
    }

    console.log(`Preparing to insert ${uniquePromises.length} promises`);

    // NOW delete existing promises (after successful AI extraction)
    const { data: deletedPromises, error: deleteError } = await adminClient
      .from('promises')
      .delete()
      .eq('party_id', party.id)
      .eq('election_year', electionYear)
      .select('id');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      // Don't throw — we still want to insert the new promises
    }

    const deletedCount = deletedPromises?.length || 0;
    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} existing promises for ${partyAbbreviation} ${electionYear}`);
    }

    // Validate and insert
    const promisesToInsert = uniquePromises.map((p: any) => ({
      party_id: party.id,
      election_year: electionYear,
      promise_text: p.promise_text,
      summary: p.summary,
      direct_quote: p.direct_quote,
      page_number: null,
      manifest_pdf_url: manifestPdfUrl || null,
      measurability_reason: p.measurability_reason || null,
      measurability_score: p.measurability_score || null,
      status: 'pending-analysis'
    }));

    const { data: insertedPromises, error: insertError } = await adminClient
      .from('promises')
      .insert(promisesToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
      });
      throw new Error('Kunde inte spara löften i databasen. Försök igen.');
    }

    if (!insertedPromises || insertedPromises.length === 0) {
      throw new Error('Inga löften kunde sparas i databasen.');
    }

    console.log(`Successfully inserted ${insertedPromises.length} promises`);

    return jsonResponse({
      success: true,
      count: insertedPromises.length,
      duplicatesRemoved: deletedCount,
      promises: insertedPromises,
      pdfUrl: manifestPdfUrl
    });

  } catch (error: any) {
    console.error('Error in analyze-manifest:', error);
    if (error?.status && error?.message) {
      return errorResponse(error.message, error.status);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Ett fel uppstod. Försök igen.'
    );
  }
});
