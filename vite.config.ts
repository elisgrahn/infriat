import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// TanStack Start on Cloudflare Workers. The Lovable shared config composes
// @tanstack/router-plugin, @vitejs/plugin-react-swc, Tailwind, and
// @cloudflare/vite-plugin. We override the server entry so our error-wrapping
// server.ts is actually invoked (otherwise the bundled
// virtual:tanstack-start-server-entry is used directly and h3 swallows errors).
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: "::",
      port: 8080,
    },
  },
});
