import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const STATUS_LABELS: Record<string, string> = {
  infriat: "✅ Infriat",
  "delvis-infriat": "🤝 Delvis infriat",
  utreds: "🔍 Utreds",
  "ej-infriat": "❌ Ej infriat",
  brutet: "🚫 Brutet",
  "pending-analysis": "📅 Kommande val",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const url = new URL(req.url);
    const promiseId = url.searchParams.get("id");

    if (!promiseId) {
      return new Response("Missing id", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("promises")
      .select("promise_text, status, status_tldr, summary, parties(name, abbreviation)")
      .eq("id", promiseId)
      .single();

    if (error || !data) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const party = (data.parties as any)?.name ?? "Okänt parti";
    const partyAbbr = (data.parties as any)?.abbreviation ?? "";
    const statusLabel = STATUS_LABELS[data.status] ?? data.status;
    const description = data.status_tldr || data.summary || data.promise_text;

    const ogTitle = `${partyAbbr}: ${data.promise_text.slice(0, 60)}${data.promise_text.length > 60 ? "…" : ""}`;
    const ogDescription = `${statusLabel} — ${description.slice(0, 150)}${description.length > 150 ? "…" : ""}`;
    const siteUrl = "https://infriat.lovable.app";
    const redirectUrl = `${siteUrl}/?promise=${promiseId}`;
    const ogImage = `${siteUrl}/og-image.png`;

    const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(ogTitle)} — Infriat</title>
  <meta name="description" content="${escapeHtml(ogDescription)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${redirectUrl}">
  <meta property="og:site_name" content="Infriat — Vallöftesgranskaren">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
</head>
<body>
  <p>Omdirigerar till <a href="${redirectUrl}">Infriat</a>…</p>
  <script>window.location.replace("${redirectUrl}");</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
