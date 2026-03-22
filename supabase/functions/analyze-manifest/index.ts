import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { requireGoogleApiKey, geminiUrl, GEMINI_MODEL } from '../_shared/gemini.ts';
import { logPrompt } from '../_shared/prompt-logger.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const POLICY_CATEGORIES = `
- valfard        (äldreomsorg, socialtjänst, funktionsstöd, barnfamiljer)
- halsa          (sjukvård, tandvård, folkhälsa, psykiatri)
- utbildning     (förskola, skola, högskola, forskning, komvux)
- arbetsmarknad  (jobb, löner, socialförsäkringar, skatter, näringsliv, ekonomi)
- migration      (invandring, asyl, flyktingmottagning, integration)
- rattssakerhet  (polis, domstolar, kriminalitet, gängvåld, straff)
- forsvar        (försvarsmakten, NATO, utrikes, bistånd, säkerhetspolitik)
- klimat-miljo   (energi, klimat, miljö, djurskydd, jordbruk)
- bostad         (bostadsbyggande, hyresrätt, infrastruktur, transport, kollektivtrafik)
- demokrati      (valsystem, grundlag, medier, offentlighet, korruption)
- ovrigt         (passar ej in i ovan)
`.trim();

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
              promise_text: { type: "STRING", description: "Kort rubrik för löftet (max 10-15 ord)" },
              summary: { type: "STRING", description: "Sammanfattning (max 2 meningar)" },
              direct_quote: { type: "STRING", description: "Exakt ordagrann citat från manifestet, 1-3 meningar" },
              category: { type: "STRING", description: `Politikområde. Välj ETT av: valfard, halsa, utbildning, arbetsmarknad, migration, rattssakerhet, forsvar, klimat-miljo, bostad, demokrati, ovrigt` },
              is_status_quo: { type: "BOOLEAN", description: "true om löftet handlar om att BEVARA något befintligt, false om det handlar om FÖRÄNDRING" },
              measurability_score: { type: "INTEGER", description: "Score 1-5. 5 = specifika siffror OCH tidsram, 4 = siffror ELLER tidsram, 3 = tydlig verifierbar åtgärd, 2 = relativ förändring, 1 = vagt" },
              measurability_reason: { type: "STRING", description: "En mening som motiverar mätbarhetspoängen" }
            },
            required: ["promise_text", "summary", "direct_quote", "category", "is_status_quo", "measurability_score", "measurability_reason"]
          }
        }
      },
      required: ["promises"]
    }
  }]
};

const VALID_CATEGORIES = [
  'valfard', 'halsa', 'utbildning', 'arbetsmarknad', 'migration',
  'rattssakerhet', 'forsvar', 'klimat-miljo', 'bostad', 'demokrati', 'ovrigt'
];

const CHUNK_SIZE = 18000;

function buildSystemPrompt(chunkInfo?: { num: number; total: number }): string {
  const chunkNote = chunkInfo
    ? `\nOBS: Detta är chunk ${chunkInfo.num} av ${chunkInfo.total} från ett större manifest. Extrahera löften endast från denna del — undvik dubbletter med tidigare chunks.`
    : '';

  return `Du är en expert på att analysera svenska politiska valmanifest och extrahera vallöften.

## Vad räknas som ett vallöfte?
Ett vallöfte är en utsaga som binder partiet vid ett konkret agerande eller utfall som går att följa upp. Det krävs INTE att texten innehåller ordet "lovar" — formuleringar som "vi ska", "vi vill", "vi föreslår" följt av en konkret åtgärd räknas. Vaga visioner som "vi vill ha ett tryggare Sverige" utan konkret åtgärd räknas INTE.

## Var generös men inte slentrianmässig
Inkludera löften som uppfyller minst ett kriterium:
- Konkreta lagändringar, reformer eller avskaffanden av policy
- Specifika siffror, mål eller tidsramar
- En tydlig åtgärd som kan verifieras (t.ex. "inrätta en ny myndighet", "sänka skatten på X")
- Relativa förändringar ("fler poliser", "kortare vårdköer") — dessa är svagare men räknas

## Citat — KRITISKT
- Citatet ska vara ORDAGRANT från manifestet, tecken för tecken
- Ändra aldrig ordning, parafrasera aldrig
- 1–3 sammanhängande meningar som bäst belyser löftet

## Kategorisering
Välj ETT primärt politikområde per löfte:
${POLICY_CATEGORIES}

## Status quo vs. förändring
Markera is_status_quo: true om löftet handlar om att BEVARA något (t.ex. "vi ska inte höja skatten", "vi värnar om nuvarande pensionssystem"). Dessa löften är historiskt sett lättare att uppfylla.

## Mätbarhetsskala
- 5: Specifika numeriska mål OCH tidsram (t.ex. "1 000 nya poliser till 2026")
- 4: Numeriska mål ELLER tidsram, men inte båda
- 3: Tydlig, verifierbar åtgärd utan siffror (t.ex. "avskaffa värnskatten")
- 2: Relativ förändring utan konkreta mål (t.ex. "fler lärare")
- 1: Vag vision utan verifierbar åtgärd

Anropa funktionen extract_promises med de löften du hittar.${chunkNote}`;
}

function validateExternalUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new Error('Endast HTTPS-URL:er är tillåtna.');
  }
  const hostname = parsed.hostname.toLowerCase();
  const blockedPatterns = [
    /^localhost$/, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./, /^169\.254\./, /^0\./, /^\[/, /^metadata\.google\.internal$/,
  ];
  if (blockedPatterns.some(p => p.test(hostname))) {
    throw new Error('URL:en pekar mot en otillåten adress.');
  }
}

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function analyzeChunk(
  apiKey: string,
  chunkText: string,
  chunkNum: number,
  totalChunks: number
): Promise<{ promises: any[]; durationMs: number; prompt: string; responseRaw: string; success: boolean; errorMessage?: string }> {
  const prompt = buildSystemPrompt({ num: chunkNum, total: totalChunks }) + '\n\n' + chunkText;

  const startTime = Date.now();
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
  const durationMs = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI error for chunk ${chunkNum}:`, response.status, errorText);
    return { promises: [], durationMs, prompt, responseRaw: errorText, success: false, errorMessage: `API ${response.status}` };
  }

  const aiData = await response.json();
  const parts = aiData.candidates?.[0]?.content?.parts || [];
  const functionCall = parts.find((p: any) => p.functionCall)?.functionCall;
  // Full response — prompt-logger handles truncation at 50k
  const responseRaw = JSON.stringify(parts);

  if (!functionCall || functionCall.name !== 'extract_promises') {
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
      return { promises: parsed.promises || [], durationMs, prompt, responseRaw: textPart, success: true };
    }
    console.error(`Chunk ${chunkNum}: no function call in response`);
    return { promises: [], durationMs, prompt, responseRaw, success: false, errorMessage: 'No function call in response' };
  }

  const args = functionCall.args;
  console.log(`Chunk ${chunkNum}: extracted ${args?.promises?.length || 0} promises`);
  return { promises: args?.promises || [], durationMs, prompt, responseRaw, success: true };
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let chunkEnd = Math.min(currentPos + chunkSize, text.length);

    if (chunkEnd < text.length) {
      const searchStart = Math.max(chunkEnd - 500, currentPos);
      const lastNewline = text.lastIndexOf('\n', chunkEnd);
      if (lastNewline > searchStart) {
        chunkEnd = lastNewline + 1;
      }
    }

    chunks.push(text.slice(currentPos, chunkEnd));
    currentPos = chunkEnd;
  }

  return chunks;
}

// ─── Self-invocation: trigger next chunk in a new edge function call ───
function selfInvokeNextChunk(jobId: string, chunkIndex: number) {
  const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-manifest`;
  fetch(selfUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ continueJobId: jobId, chunkIndex }),
  }).catch(err => console.error(`Self-invoke for chunk ${chunkIndex} failed:`, err));
}

// ─── Process a single chunk, update job state, trigger next or finalize ───
async function processChunk(jobId: string, chunkIndex: number) {
  const adminClient = getAdminClient();
  const apiKey = requireGoogleApiKey();

  try {
    // Load job state
    const { data: job, error: jobErr } = await adminClient
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      console.error(`processChunk: job ${jobId} not found`, jobErr);
      return;
    }

    if (job.status === 'failed' || job.status === 'completed') {
      console.log(`processChunk: job ${jobId} already ${job.status}, skipping`);
      return;
    }

    const manifestText = job.manifest_text;
    if (!manifestText) {
      throw new Error('No manifest_text stored on job');
    }

    const chunks = splitIntoChunks(manifestText, CHUNK_SIZE);
    const totalChunks = chunks.length;

    if (chunkIndex >= totalChunks) {
      console.error(`processChunk: chunkIndex ${chunkIndex} >= totalChunks ${totalChunks}`);
      return;
    }

    // Update status to processing on first chunk
    if (chunkIndex === 0) {
      await adminClient.from('analysis_jobs').update({
        status: 'processing',
        total_chunks: totalChunks,
        updated_at: new Date().toISOString(),
      }).eq('id', jobId);
    }

    console.log(`Job ${jobId}: processing chunk ${chunkIndex + 1}/${totalChunks} (${chunks[chunkIndex].length} chars)`);

    // Analyze with retries
    let chunkResult: Awaited<ReturnType<typeof analyzeChunk>> | null = null;
    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        chunkResult = await analyzeChunk(apiKey, chunks[chunkIndex], chunkIndex + 1, totalChunks);
        if (chunkResult.success) break;
        if (attempt >= MAX_RETRIES) break;
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
      } catch (err) {
        console.error(`Job ${jobId}: chunk ${chunkIndex + 1} attempt ${attempt + 1} failed:`, err);
        if (attempt >= MAX_RETRIES) break;
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
      }
    }

    // Log prompt
    if (chunkResult) {
      logPrompt({
        edgeFunction: 'analyze-manifest',
        model: GEMINI_MODEL,
        prompt: chunkResult.prompt,
        responseRaw: chunkResult.responseRaw,
        groundingSearch: false,
        durationMs: chunkResult.durationMs,
        success: chunkResult.success,
        errorMessage: chunkResult.errorMessage,
      });
    }

    // Accumulate promises
    const existingPromises: any[] = job.accumulated_promises || [];
    const newPromises = chunkResult?.promises || [];
    const allAccumulated = [...existingPromises, ...newPromises];

    const completedChunks = chunkIndex + 1;
    const progressPct = Math.round((completedChunks / totalChunks) * 90);

    // Update job state
    await adminClient.from('analysis_jobs').update({
      completed_chunks: completedChunks,
      progress_pct: progressPct,
      current_chunk: chunkIndex,
      accumulated_promises: allAccumulated,
      updated_at: new Date().toISOString(),
    }).eq('id', jobId);

    console.log(`Job ${jobId}: chunk ${completedChunks}/${totalChunks} done, ${newPromises.length} new promises, total ${allAccumulated.length}, ${progressPct}%`);

    // If more chunks remain, self-invoke for the next one
    if (completedChunks < totalChunks) {
      selfInvokeNextChunk(jobId, chunkIndex + 1);
      return;
    }

    // ─── Final chunk: dedup, delete old, insert new ───
    console.log(`Job ${jobId}: all chunks complete, finalizing...`);

    if (allAccumulated.length === 0) {
      throw new Error('Inga löften kunde extraheras från manifestet.');
    }

    const seen = new Set<string>();
    const uniquePromises = allAccumulated.filter((p: any) => {
      const key = p.promise_text.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`Job ${jobId}: dedup ${allAccumulated.length} -> ${uniquePromises.length}`);

    const partyId = job.party_id;
    const electionYear = job.election_year;
    const manifestPdfUrl = job.manifest_pdf_url;

    const { data: deletedPromises } = await adminClient
      .from('promises')
      .delete()
      .eq('party_id', partyId)
      .eq('election_year', electionYear)
      .select('id');

    const deletedCount = deletedPromises?.length || 0;
    if (deletedCount > 0) {
      console.log(`Job ${jobId}: deleted ${deletedCount} existing promises`);
    }

    const promisesToInsert = uniquePromises.map((p: any) => ({
      party_id: partyId,
      election_year: electionYear,
      promise_text: p.promise_text,
      summary: p.summary,
      direct_quote: p.direct_quote,
      page_number: null,
      manifest_pdf_url: manifestPdfUrl || null,
      category: VALID_CATEGORIES.includes(p.category) ? p.category : 'ovrigt',
      is_status_quo: typeof p.is_status_quo === 'boolean' ? p.is_status_quo : false,
      measurability_reason: p.measurability_reason || null,
      measurability_score: p.measurability_score || null,
      status: 'pending-analysis'
    }));

    const { data: insertedPromises, error: insertError } = await adminClient
      .from('promises')
      .insert(promisesToInsert)
      .select();

    if (insertError) {
      console.error(`Job ${jobId}: insert error:`, insertError);
      throw new Error('Kunde inte spara löften i databasen.');
    }

    const resultCount = insertedPromises?.length || 0;
    console.log(`Job ${jobId}: inserted ${resultCount} promises`);

    // Clear manifest_text to free storage, mark complete
    await adminClient.from('analysis_jobs').update({
      status: 'completed',
      progress_pct: 100,
      result_count: resultCount,
      manifest_text: null,
      accumulated_promises: null,
      updated_at: new Date().toISOString(),
    }).eq('id', jobId);

  } catch (error: any) {
    console.error(`Job ${jobId} chunk ${chunkIndex} failed:`, error);
    await adminClient.from('analysis_jobs').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Ett okänt fel uppstod',
      updated_at: new Date().toISOString(),
    }).eq('id', jobId);
  }
}

// ─── HTTP handler ───
serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const body = await req.json();

    // ─── Continuation path: process a single chunk (self-invoked) ───
    if (body.continueJobId && typeof body.chunkIndex === 'number') {
      const jobId = body.continueJobId;
      const chunkIndex = body.chunkIndex;
      console.log(`Continuation call: job ${jobId}, chunk ${chunkIndex}`);

      // Process chunk in background and return immediately
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(processChunk(jobId, chunkIndex));
      } else {
        processChunk(jobId, chunkIndex).catch(err =>
          console.error(`processChunk error:`, err)
        );
      }

      return jsonResponse({ success: true, continuing: true, jobId, chunkIndex });
    }

    // ─── Initial analysis path: requires admin auth ───
    const { userClient, adminClient } = await requireAdmin(req);
    const apiKey = requireGoogleApiKey();

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

    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return errorResponse('Ogiltig begäran', 400);
    }

    const { manifestText, txtUrl, pdfBase64, pdfUrl, partyAbbreviation, electionYear } = validation.data;

    console.log(`Analyzing manifest for ${partyAbbreviation} ${electionYear}`);

    let finalManifestText = manifestText;
    if (!finalManifestText && txtUrl) {
      validateExternalUrl(txtUrl);
      console.log('Downloading TXT from URL:', txtUrl);
      try {
        const txtResponse = await fetch(txtUrl, { signal: AbortSignal.timeout(30000) });
        if (!txtResponse.ok) {
          throw new Error(`HTTP ${txtResponse.status} ${txtResponse.statusText}`);
        }
        finalManifestText = await txtResponse.text();
      } catch (txtError) {
        console.error('TXT download error:', txtError);
        throw new Error('Kunde inte ladda ner TXT-filen. Kontrollera att URL:en är korrekt.');
      }
    }

    const pdfOnlyMode = !finalManifestText && (pdfBase64 || pdfUrl);

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
      validateExternalUrl(pdfUrl);
      console.log('Downloading PDF from URL:', pdfUrl);
      try {
        const pdfResponse = await fetch(pdfUrl, { signal: AbortSignal.timeout(60000) });
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

    const { data: party, error: partyError } = await userClient
      .from('parties')
      .select('id')
      .eq('abbreviation', partyAbbreviation)
      .single();

    if (partyError || !party) {
      console.error('Party not found:', partyAbbreviation, partyError);
      throw new Error('Partiet hittades inte i databasen.');
    }

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

    if (!finalManifestText) {
      return errorResponse('Ingen manifesttext angiven', 400);
    }

    console.log(`Starting AI analysis, manifest length: ${finalManifestText.length} chars`);

    // Create job with manifest_text stored for chunk-per-invocation processing
    const { data: job, error: jobError } = await adminClient
      .from('analysis_jobs')
      .insert({
        party_id: party.id,
        election_year: electionYear,
        status: 'pending',
        progress_pct: 0,
        manifest_text: finalManifestText,
        manifest_pdf_url: manifestPdfUrl,
        accumulated_promises: [],
        current_chunk: 0,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Job creation error:', jobError);
      throw new Error('Kunde inte skapa analysjobb.');
    }

    const jobId = job.id;
    console.log(`Created analysis job: ${jobId}`);

    // Trigger chunk 0 via self-invocation (runs in its own edge function call)
    selfInvokeNextChunk(jobId, 0);

    return jsonResponse({
      success: true,
      jobId: jobId,
      message: 'Analysjobb skapat. Följ progress via analysis_jobs-tabellen.',
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
