// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Fetches all promise IDs from Supabase REST so /lofte/:id routes are indexable.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config();

const BASE_URL = "https://infriat.se";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/statistik", changefreq: "weekly", priority: "0.8" },
  { path: "/statistik/labb", changefreq: "weekly", priority: "0.6" },
  { path: "/om", changefreq: "monthly", priority: "0.5" },
];

async function fetchPromiseEntries(): Promise<SitemapEntry[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[sitemap] Supabase env vars missing — skipping dynamic promise entries.");
    return [];
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/promises?select=id,updated_at&status=neq.pending-analysis`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    );
    if (!res.ok) {
      console.warn(`[sitemap] Failed to fetch promises: ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as Array<{ id: string; updated_at?: string }>;
    return rows.map((row) => ({
      path: `/lofte/${row.id}`,
      lastmod: row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly" as const,
      priority: "0.7",
    }));
  } catch (err) {
    console.warn("[sitemap] Error fetching promises:", err);
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

const promiseEntries = await fetchPromiseEntries();
const entries = [...staticEntries, ...promiseEntries];
writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries: ${staticEntries.length} static, ${promiseEntries.length} promises)`);
