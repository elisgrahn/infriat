import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { requireGoogleApiKey, geminiUrl, GEMINI_MODEL } from '../_shared/gemini.ts';
import { logPrompt } from '../_shared/prompt-logger.ts';

async function resolveRedirectUrl(url: string): Promise<string> {
  if (!url.includes('vertexaisearch.cloud.google.com')) {
    return url;
  }
  try {
    const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return resp.url || url;
  } catch {
    try {
      const resp = await fetch(url, { redirect: 'follow' });
      const finalUrl = resp.url || url;
      await resp.body?.cancel();
      return finalUrl;
    } catch {
      return url;
    }
  }
}

async function buildCitedExplanation(
  explanation: string,
  groundingSupports: any[] | undefined,
  groundingChunks: any[] | undefined
): Promise<{ citedText: string; sources: { url: string; title: string | null }[] }> {
  if (!groundingSupports || !groundingChunks || groundingChunks.length === 0) {
    return { citedText: explanation, sources: [] };
  }

  const resolvedChunks = await Promise.all(
    groundingChunks.map(async (chunk: any) => {
      const uri = chunk.web?.uri;
      if (!uri) return chunk;
      const resolvedUrl = await resolveRedirectUrl(uri);
      return { ...chunk, web: { ...chunk.web, uri: resolvedUrl } };
    })
  );

  const uniqueSources: { url: string; title: string | null }[] = [];
  const urlToIndex = new Map<string, number>();

  for (const chunk of resolvedChunks) {
    const url = chunk.web?.uri;
    if (url && !urlToIndex.has(url)) {
      urlToIndex.set(url, uniqueSources.length);
      uniqueSources.push({ url, title: chunk.web?.title || null });
    }
  }

  const insertions: { position: number; citations: number[] }[] = [];

  for (const support of groundingSupports) {
    const segment = support.segment;
    if (!segment || segment.text === undefined) continue;

    const chunkIndices: number[] = support.groundingChunkIndices || [];
    if (chunkIndices.length === 0) continue;

    const segmentText = segment.text?.trim();
    if (!segmentText) continue;

    const pos = explanation.indexOf(segmentText);
    if (pos === -1) continue;

    const endPos = pos + segmentText.length;
    const citations: number[] = [];

    for (const ci of chunkIndices) {
      const chunk = resolvedChunks[ci];
      if (chunk?.web?.uri) {
        const sourceIdx = urlToIndex.get(chunk.web.uri);
        if (sourceIdx !== undefined && !citations.includes(sourceIdx)) {
          citations.push(sourceIdx);
        }
      }
    }

    if (citations.length > 0) {
      insertions.push({ position: endPos, citations });
    }
  }

  insertions.sort((a, b) => b.position - a.position);

  let citedText = explanation;
  for (const ins of insertions) {
    const markers = ins.citations.map(i => `[${i + 1}]`).join('');
    citedText = citedText.slice(0, ins.position) + markers + citedText.slice(ins.position);
  }

  return { citedText, sources: uniqueSources.slice(0, 10) };
}

function normalizeTldr(rawTldr: string, partyName: string, partyAbbreviation: string): string {
  let tldr = rawTldr
    .replace(/\s+/g, ' ')
    .replace(/^[-•]\s*/, '')
    .trim();

  if (!tldr) {
    return `${partyAbbreviation}.`;
  }

  tldr = tldr.split(/(?<=[.!?])\s+/)[0]?.trim() || tldr;
  tldr = tldr.replace(/[.!?]+$/, '').trim();

  const escapedPartyName = partyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  tldr = tldr.replace(new RegExp(escapedPartyName, 'gi'), partyAbbreviation);
  tldr = tldr.replace(new RegExp(`^${partyAbbreviation}\s+(har|hade|bedöms|anses)\s+`, 'i'), `${partyAbbreviation} `);

  if (!new RegExp(`\\b${partyAbbreviation}\\b`, 'i').test(tldr)) {
    tldr = `${partyAbbreviation} ${tldr.charAt(0).toLowerCase()}${tldr.slice(1)}`;
  }

  return `${tldr}.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { userClient, adminClient } = await requireAdmin(req);
    const apiKey = requireGoogleApiKey();

    const requestSchema = z.object({
      promiseId: z.string().uuid(),
      context: z.string().max(5000).optional()
    });

    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Ogiltig begäran', 400);
    }

    const { promiseId, context } = validation.data;

    const { data: promise, error: promiseError } = await userClient
      .from('promises')
      .select('*, parties(*)')
      .eq('id', promiseId)
      .single();

    if (promiseError || !promise) {
      return errorResponse('Vallöftet hittades inte', 404);
    }

    console.log(`Analyzing status for promise: ${promise.promise_text}`);

    let mandateType: 'government' | 'support' | 'opposition' = 'opposition';
    const partyAbbreviation = promise.parties.abbreviation;

    const { data: govPeriods } = await userClient
      .from('government_periods')
      .select('*')
      .gte('start_year', promise.election_year)
      .order('start_year', { ascending: true })
      .limit(1);

    if (govPeriods && govPeriods.length > 0) {
      const period = govPeriods[0];
      const partyName = promise.parties.name;
      if (period.governing_parties?.includes(partyName)) {
        mandateType = 'government';
      } else if (period.support_parties?.includes(partyName)) {
        mandateType = 'support';
      }
    }

    console.log(`Mandate type for ${partyAbbreviation}: ${mandateType}`);

    const mandateContext = {
      government: `${promise.parties.name} ingick i REGERINGEN efter valet ${promise.election_year} och hade fullt mandat att genomföra sin politik via propositioner och budgetarbete.`,
      support: `${promise.parties.name} var STÖDPARTI efter valet ${promise.election_year}. Partiet ingick inte i regeringen men gav den parlamentariskt stöd och hade därmed visst inflytande, men lade inte egna propositioner.`,
      opposition: `${promise.parties.name} var OPPOSITIONSPARTI efter valet ${promise.election_year} och saknade mandat att självständigt genomföra politik. Partiet kunde påverka via motioner och voteringar, men inte lägga propositioner.`
    }[mandateType];

    const statusDefinitions = mandateType === 'opposition'
      ? `
Statusdefinitioner (oppositionsparti — använd ALDRIG "broken"):
- fulfilled:           Löftet genomfördes under mandatperioden OCH partiet drev aktivt frågan (motioner, voteringar, offentliga uttalanden i linje med löftet).
- partially-fulfilled: Löftet genomfördes delvis och partiet drev det aktivt.
- in-progress:         Frågan bereds av sittande regering och partiet har drivit den.
- not-fulfilled:       Löftet genomfördes inte. STANDARDSTATUS för ouppfyllda oppositionslöften — ett oppositionsparti kan inte bryta ett löfte det inte hade mandat att genomföra.
- broken:              ANVÄND EJ för oppositionspartier.`
      : `
Statusdefinitioner:
- fulfilled:           Löftet är helt genomfört. Proposition överensstämmer med löftet och har bifallits, ELLER motsvarande förändring har genomförts via budget eller myndighetsbeslut.
- partially-fulfilled: Proposition eller budgetåtgärd har vidtagits men överensstämmer bara delvis med löftet, eller riksdagen har bara delvis bifallit.
- in-progress:         Utredning, kommission eller departementspromemoria pågår. Inga politiska beslut fattade ännu.
- not-fulfilled:       Inga konkreta steg tagna. Mandatperioden pågår fortfarande — partiet kan fortfarande agera.
- broken:              Partiet har AKTIVT verkat mot löftet (proposition i motsatt riktning, explicit uppgivet ståndpunkten), ELLER mandatperioden är avslutad utan att ens initiala steg tagits trots fullt mandat.`;

    const evidenceChain = `
## Beviskedja att söka igenom (i prioritetsordning)
1. PROPOSITION — Har en proposition lagts och bifallits av riksdagen? Överensstämmer den med löftet?
2. BUDGETPROPOSITION — Finns anslagsförändringar i linje med löftet?
3. MYNDIGHETSBESLUT / REGLERINGSBREV — Har regeringen instruerat myndighet att agera enligt löftet?
4. UTREDNING / KOMMISSION — Har en utredning tillsatts?
5. MOTIONER (oppositionspartier) — Har partiet lämnat motioner i linje med löftet?
6. INGET AGERANDE — Inga av ovan.`;

    const prompt = `Du analyserar ett svensk politiskt vallöfte från valåret ${promise.election_year}.

## Partiets mandatsituation
${mandateContext}

## Löftet
Parti: ${promise.parties.name}
Partiförkortning: ${partyAbbreviation}
Löfte: ${promise.promise_text}
Sammanfattning: ${promise.summary}
Politikområde: ${promise.category ?? 'okänt'}
${promise.direct_quote ? `Direktcitat: "${promise.direct_quote}"` : ''}
${context ? `\nYtterligare kontext: ${context}` : ''}
${evidenceChain}

## Statusdefinitioner
${statusDefinitions}

## Svar
Ge din bedömning i detta format:

**Status:** [en av: fulfilled, partially-fulfilled, in-progress, not-fulfilled, broken]

**Förklaring:** [3–5 meningar. Utgå från beviskedjan ovan. Nämn konkreta beslut, propositionsnummer, budgetposter eller motionsnummer om sådana finns. Förklara varför du valt just denna status utifrån mandattypen.]

**Källor:** [lista med relevanta källor och URL:er]

**TL;DR:** [En kort mening på svenska som sammanfattar förklaringen. Den ska vara ett komplement till statusen och förklaringen, upprepa inte statusen. Använd partiförkortningen ${partyAbbreviation} om du nämner partiet och fokusera på den viktigaste konkreta åtgärden, effekten eller siffran. Skriv detta SIST av allt, först när du är helt färdig med analysen ovan, så att TL;DR bygger på din slutliga status och förklaring.]`;

    const startTime = Date.now();
    const response = await fetch(geminiUrl(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.3, topK: 40, topP: 0.95 }
      }),
    });
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API error:', response.status, errorText);
      logPrompt({ edgeFunction: 'analyze-promise-status', promiseId, model: GEMINI_MODEL, prompt, responseRaw: errorText, groundingSearch: true, durationMs, success: false, errorMessage: `API ${response.status}` });
      throw new Error(`AI-analysen misslyckades (${response.status}). Försök igen.`);
    }

    const aiData = await response.json();

    const parts = aiData.candidates?.[0]?.content?.parts || [];
    const textContent = parts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join('\n')
      .trim();

    if (!textContent) {
      logPrompt({ edgeFunction: 'analyze-promise-status', promiseId, model: GEMINI_MODEL, prompt, responseRaw: JSON.stringify(aiData).slice(0, 500), groundingSearch: true, durationMs, success: false, errorMessage: 'Empty AI response' });
      throw new Error('AI-analysen gav inget svar. Försök igen.');
    }

    let status: 'infriat' | 'delvis-infriat' | 'utreds' | 'ej-infriat' | 'brutet' = 'utreds';

    const lowerText = textContent.toLowerCase();
    if (lowerText.includes('status:** fulfilled') || lowerText.includes('status: fulfilled')) {
      status = 'infriat';
    } else if (lowerText.includes('status:** partially-fulfilled') || lowerText.includes('status: partially-fulfilled')) {
      status = 'delvis-infriat';
    } else if (lowerText.includes('status:** in-progress') || lowerText.includes('status: in-progress')) {
      status = 'utreds';
    } else if (lowerText.includes('status:** not-fulfilled') || lowerText.includes('status: not-fulfilled')) {
      status = 'ej-infriat';
    } else if (lowerText.includes('status:** broken') || lowerText.includes('status: broken')) {
      status = 'brutet';
    }

    const explanationMatch = textContent.match(/\*\*Förklaring:\*\*\s*([\s\S]+?)(?=\n\n\*\*Källor|\n\*\*Källor|$)/i) ||
      textContent.match(/Förklaring:\s*([\s\S]+?)(?=\n\n(?:\*\*)?Källor|\n(?:\*\*)?Källor|$)/i);
    const tldrMatch = textContent.match(/\*\*TL;DR:\*\*\s*([\s\S]+?)$/i) ||
      textContent.match(/TL;DR:\s*([\s\S]+?)$/i);

    const rawExplanation = explanationMatch ? explanationMatch[1].trim() : textContent;
    const rawTldr = tldrMatch?.[1]?.trim() || rawExplanation.split(/(?<=[.!?])\s+/)[0]?.trim() || rawExplanation;
    const normalizedTldr = normalizeTldr(rawTldr, promise.parties.name, partyAbbreviation);

    const groundingMetadata = aiData.candidates?.[0]?.groundingMetadata;
    const groundingSupports = groundingMetadata?.groundingSupports;
    const groundingChunks = groundingMetadata?.groundingChunks;

    console.log(`Grounding supports: ${groundingSupports?.length || 0}, chunks: ${groundingChunks?.length || 0}`);

    const { citedText, sources } = await buildCitedExplanation(
      rawExplanation,
      groundingSupports,
      groundingChunks
    );

    // Log prompt with full response
    logPrompt({ edgeFunction: 'analyze-promise-status', promiseId, model: GEMINI_MODEL, prompt, responseRaw: textContent, groundingSearch: true, durationMs, success: true });

    console.log(`Cited explanation preview: ${citedText.slice(0, 200)}`);

    const sourceUrls = sources.map(s => s.url);

    const { error: updateError } = await adminClient
      .from('promises')
      .update({
        status,
        status_explanation: citedText,
        status_sources: sourceUrls,
        status_tldr: normalizedTldr,
      })
      .eq('id', promiseId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Kunde inte uppdatera vallöftet. Försök igen.');
    }

    const { error: deleteSourcesError } = await adminClient
      .from('promise_sources')
      .delete()
      .eq('promise_id', promiseId);

    if (deleteSourcesError) {
      console.error('Error deleting old sources:', deleteSourcesError);
    }

    if (sources.length > 0) {
      const sourceRows = sources.map((s) => ({
        promise_id: promiseId,
        url: s.url,
        title: s.title,
        source_type: 'news' as const,
      }));

      const { error: insertSourcesError } = await adminClient
        .from('promise_sources')
        .insert(sourceRows);

      if (insertSourcesError) {
        console.error('Error inserting sources:', insertSourcesError);
      }
    }

    console.log(`Updated promise status to: ${status}, ${sources.length} sources with inline citations`);

    return jsonResponse({
      success: true,
      analysis: { status, tldr: normalizedTldr, explanation: citedText, sources: sourceUrls }
    });

  } catch (error: any) {
    console.error('Error in analyze-promise-status:', error);
    if (error?.status && error?.message) {
      return errorResponse(error.message, error.status);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Ett fel uppstod. Försök igen.'
    );
  }
});
