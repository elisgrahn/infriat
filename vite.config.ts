// @lovable.dev/vite-tanstack-config bundles tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro (Cloudflare target), componentTagger (dev), VITE_* env,
// @ alias, React/TanStack dedupe, error loggers, and sandbox port detection.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // Compat shim so existing pages keep working without rewrites
        "react-router-dom": "/src/lib/react-router-compat.tsx",
        "react-helmet-async": "/src/lib/react-helmet-async-compat.tsx",
      },
    },
    ssr: {
      noExternal: ["pdfjs-dist"],
    },
  },
});
