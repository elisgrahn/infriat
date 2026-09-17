import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";
import { PARTY_ORDER } from "@/lib/partyStats";

const BASE_URL = "https://infriat.se";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }

        // Party detail pages (fixed public party list)
        const partyRouteId = "/parti/$kort";
        if (isSitemapRouteIncluded(router.routesById[partyRouteId])) {
          for (const abbreviation of PARTY_ORDER) {
            const location = router.buildLocation({
              to: "/parti/$kort",
              params: { kort: abbreviation },
              search: () => ({}),
              hash: "",
            });
            const path = sitemapPathForLocation(router, location, partyRouteId);
            if (path) entries.push({ path });
          }
        }

        // Individual public promises (/lofte/:id), fetched with the public key.
        const promiseRouteId = "/lofte/$id";
        if (isSitemapRouteIncluded(router.routesById[promiseRouteId])) {
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
          const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
          if (!key || !url) throw new Error("Sitemap: missing public Supabase credentials");
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
              fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                // Opaque sb_ keys are not JWTs; send apikey without the default bearer.
                if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) {
                  headers.delete("Authorization");
                }
                headers.set("apikey", key);
                return fetch(input, { ...init, headers });
              },
            },
          });

          const pageSize = 1000;
          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabase
              .from("promises")
              .select("id, status")
              .neq("status", "pending-analysis")
              .order("id")
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            for (const row of data) {
              const location = router.buildLocation({
                to: "/lofte/$id",
                params: { id: row.id },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, promiseRouteId);
              if (path) entries.push({ path });
            }
            if (data.length < pageSize) break;
          }
        }

        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
