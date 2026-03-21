/**
 * build-prompt.mjs
 *
 * Hämtar ett vallöfte från Supabase och skriver ut den kompletta
 * analyze-promise-status-prompten – klar att kopiera till valfri modell.
 *
 * Användning:
 *   node scripts/build-prompt.mjs <promise-id>
 *   node scripts/build-prompt.mjs <promise-id> "Valfri extra kontext"
 *
 * Kräver:
 *   VITE_SUPABASE_URL  och  VITE_SUPABASE_PUBLISHABLE_KEY  i .env / miljön,
 *   eller sätt dem explicit nedan.
 *
 * Installera deps om de saknas:
 *   npm install @supabase/supabase-js dotenv
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Ladda .env manuellt (undviker beroende av dotenv om inte installerat) ──────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
try {
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Saknar VITE_SUPABASE_URL eller VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const [, , promiseId, extraContext] = process.argv;

if (!promiseId) {
  console.error("Användning: node scripts/build-prompt.mjs <promise-id> [extra kontext]");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Hämta löftet + parti ────────────────────────────────────────────────────────
const { data: promise, error } = await supabase
  .from("promises")
  .select("*, parties(*)")
  .eq("id", promiseId)
  .single();

if (error || !promise) {
  console.error("Hittade inte löfte:", error?.message ?? "okänt fel");
  process.exit(1);
}

// ── Hämta mandattyp ─────────────────────────────────────────────────────────────
const partyAbbreviation = promise.parties.abbreviation;
let mandateType = "opposition";

const { data: govPeriods } = await supabase
  .from("government_periods")
  .select("*")
  .gte("start_year", promise.election_year)
  .order("start_year", { ascending: true })
  .limit(1);

if (govPeriods && govPeriods.length > 0) {
  const period = govPeriods[0];
  const partyName = promise.parties.name;
  if (period.governing_parties?.includes(partyName)) mandateType = "government";
  else if (period.support_parties?.includes(partyName)) mandateType = "support";
}

// ── Bygg prompt (spegling av Edge Function-logiken) ────────────────────────────
const mandateContext = {
  government: `${promise.parties.name} ingick i REGERINGEN efter valet ${promise.election_year} och hade fullt mandat att genomföra sin politik via propositioner och budgetarbete.`,
  support: `${promise.parties.name} var STÖDPARTI efter valet ${promise.election_year}. Partiet ingick inte i regeringen men gav den parlamentariskt stöd och hade därmed visst inflytande, men lade inte egna propositioner.`,
  opposition: `${promise.parties.name} var OPPOSITIONSPARTI efter valet ${promise.election_year} och saknade mandat att självständigt genomföra politik. Partiet kunde påverka via motioner och voteringar, men inte lägga propositioner.`,
}[mandateType];

const statusDefinitions =
  mandateType === "opposition"
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
Politikområde: ${promise.category ?? "okänt"}
${promise.direct_quote ? `Direktcitat: "${promise.direct_quote}"` : ""}
${extraContext ? `\nYtterligare kontext: ${extraContext}` : ""}
${evidenceChain}

## Statusdefinitioner
${statusDefinitions}

## Svar
Ge din bedömning i detta format:

**Status:** [en av: fulfilled, partially-fulfilled, in-progress, not-fulfilled, broken]

**Förklaring:** [3–5 meningar. Utgå från beviskedjan ovan. Nämn konkreta beslut, propositionsnummer, budgetposter eller motionsnummer om sådana finns. Förklara varför du valt just denna status utifrån mandattypen.]

**Källor:** [lista med relevanta källor och URL:er]

**TL;DR:** [EXAKT en mening på svenska. Den ska vara ett komplement till statusbadge och den längre förklaringen, inte upprepa statusen eller partinamnet i onödan. Börja med partiförkortningen ${partyAbbreviation} och fokusera på den viktigaste konkreta åtgärden, effekten eller siffran. Skriv detta SIST av allt, först när du är helt färdig med analysen ovan, så att TL;DR bygger på din slutliga status och förklaring.]`;

// ── Skriv ut ────────────────────────────────────────────────────────────────────
const separator = "─".repeat(72);

console.log(`\n${separator}`);
console.log(`  Löfte: ${promise.promise_text.slice(0, 80)}${promise.promise_text.length > 80 ? "…" : ""}`);
console.log(`  Parti: ${promise.parties.name} (${partyAbbreviation}) · Valår: ${promise.election_year} · Mandattyp: ${mandateType}`);
console.log(`  Nuvarande status: ${promise.status ?? "—"}`);
console.log(`${separator}\n`);
console.log(prompt);
console.log(`\n${separator}`);
console.log("  ✓ Kopiera texten ovan och klistra in i valfri modell.");
console.log(separator + "\n");
