import { createFileRoute } from "@tanstack/react-router";
import Statistics from "@/pages/Statistics";

export const Route = createFileRoute("/statistik")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Statistik – svenska vallöften i siffror | Infriat" },
      {
        name: "description",
        content:
          "Statistik och visualiseringar av svenska partiers vallöften: statusfördelning, mätbarhet och jämförelser mellan partier.",
      },
      { property: "og:title", content: "Statistik – svenska vallöften i siffror | Infriat" },
      {
        property: "og:description",
        content:
          "Statistik och visualiseringar av svenska partiers vallöften: statusfördelning, mätbarhet och jämförelser mellan partier.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://infriat.se/statistik" },
      { property: "og:image", content: "https://infriat.se/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Statistik – svenska vallöften i siffror | Infriat" },
      {
        name: "twitter:description",
        content:
          "Statistik och visualiseringar av svenska partiers vallöften: statusfördelning, mätbarhet och jämförelser mellan partier.",
      },
      { name: "twitter:image", content: "https://infriat.se/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://infriat.se/statistik" }],
  }),
  component: Statistics,
});
