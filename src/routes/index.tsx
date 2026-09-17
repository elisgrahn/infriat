import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Infriat" },
      {
        name: "description",
        content:
          "Har politikerna infriat sina vallöften? Infriat granskar och följer upp riksdagspartiernas valmanifest med AI och öppna källor.",
      },
      { property: "og:title", content: "Infriat" },
      {
        property: "og:description",
        content:
          "Har politikerna infriat sina vallöften? Infriat granskar och följer upp riksdagspartiernas valmanifest med AI och öppna källor.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://infriat.se/" },
      { property: "og:image", content: "https://infriat.se/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Infriat" },
      {
        name: "twitter:description",
        content:
          "Har politikerna infriat sina vallöften? Infriat granskar och följer upp riksdagspartiernas valmanifest med AI och öppna källor.",
      },
      { name: "twitter:image", content: "https://infriat.se/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://infriat.se/" }],
  }),
  component: Index,
});
