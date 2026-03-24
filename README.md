# [Infriat](https://infriat.se)

**Det borde vara enkelt att kolla upp om partier infriat sina löften**, det är det inte. Partier lovar mycket inför valet och sen efter valet är informationen om hur det gått med alla löften ofta utspridd, svårtolkad eller sammanställd av partierna själva. Infriat är mitt försök att ändra på detta.

> [!WARNING]
> Analys av löften görs av AI och kan innehålla felaktigheter. Använd det som ett diskussionsunderlag och inte som en absolut sanning.

Infriat använder AI för att identifiera löften direkt ur partiernas valmanifest, kategorisera dem och sedan löpande analysera deras nuvarande status. Kategoriseringen grundar sig till stor del i Elin Naurins forskning vid Göteborgs universitet, se [källor](#källor). Centralt är testbarhetskriteriet, för att räknas som ett löfte **måste** det kunna avgöras om det infriats eller ej under mandatperioden. Projektet är öppet och transparent av princip, både data och kod.

## Funktioner

- **Löfteskatalog** — bläddra bland vallöften med filtrering på parti, status, kategori, mandatperiod m.m.
- **AI-analys** — automatisk statusbedömning av löften med Google Gemini (med källhänvisningar), administreras via adminpanelen
- **Statistik & visualiseringar** — diagram och insikter om löftesuppfyllelse per parti
- **Responsiv design** — fungerar fullt ut på mobil, surfplatta och desktop
- **Mörkt läge** — stöd för ljust/mörkt/systemtema

## Teknikstack

| Lager | Teknik |
| ----- | ------ |
| **Frontend** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/) |
| **UI-komponenter** | [shadcn/ui](https://ui.shadcn.com/) (Radix UI) + [Tailwind CSS](https://tailwindcss.com/) |
| **Diagram** | [Recharts](https://recharts.org/) |
| **Routing** | [React Router v6](https://reactrouter.com/) med URL-synkade filter |
| **Backend** | [Supabase](https://supabase.com/) (Postgres + Auth + Edge Functions) |
| **AI** | Google Gemini 2.5 Flash (via Supabase Edge Functions, Deno runtime) |
| **State** | React Context + [TanStack Query](https://tanstack.com/query) |

## Komma igång

### Förutsättningar

- [Node.js](https://nodejs.org/) ≥ 18 (rekommenderat: installera via [nvm](https://github.com/nvm-sh/nvm))
- npm (följer med Node.js)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (om du vill köra Edge Functions lokalt)

### Installation

```bash
# Klona repot
git clone https://github.com/elisgrahn/infriat.git
cd infriat

# Installera beroenden
npm install

# Starta utvecklingsservern
npm run dev
```

Appen körs nu på `http://localhost:5173`.

### Miljövariabler

Projektets publika Supabase-credentials finns redan i `.env` och fungerar direkt efter kloning — du behöver alltså **inte** skapa en egen `.env.local` för att köra frontend.

Om du vill peka på en egen Supabase-instans kan du kopiera `.env` till `.env.local` och byta ut värdena:

```bash
cp .env .env.local
# Redigera .env.local och lägg in dina egna värden
```

Edge Functions (Deno) behöver dessutom:

- `GOOGLE_AI_API_KEY` — API-nyckel för Google Gemini, det kan sättas upp [här](https://aistudio.google.com/welcome).

## Bidra

Alla bidrag är välkomna! Oavsett om du vill fixa en bugg, förbättra UI, lägga till en funktion eller bara korrigera en stavning, din hjälp uppskattas. Här är några idéer:

- Förbättra tillgänglighet (a11y)
- Förbättra mobilupplevelsen
- Ta fram nya statistikvisualiseringar
- Förbättra dokumentation
- Förbättra design

### Kodkonventioner

- **Konfig-drivet UI** — undvik hårdkodade färger/labels för statusar eller kategorier. Uppdatera istället `src/config/statusConfig.ts` eller `src/config/categoryConfig.ts`
- **Supabase-typer** — `src/integrations/supabase/types.ts` är autogenererad. Redigera den inte direkt
- **Edge Functions** — körs på Deno. Använd `https://deno.land/` och `https://esm.sh/`-importer, aldrig npm

### Mappstruktur

```text
src/
├── components/        # React-komponenter
│   ├── badges/        # Löftesbadges (status, kategori, mätbarhet)
│   ├── icons/         # Custom SVG-ikoner
│   └── ui/            # Baskomponenter från shadcn/ui
├── config/            # Konfigurationsfiler (status, kategorier, badges)
├── hooks/             # Custom React hooks
├── integrations/      # Supabase-klient (autogenererad — redigera ej)
├── layouts/           # Layout-komponenter (Navbar, Footer)
├── lib/               # Hjälpfunktioner (utils, metrics)
├── pages/             # Sidkomponenter (Index, Statistics, Admin, etc.)
├── services/          # Datafetching-funktioner
├── store/             # Context providers (filter, responsive, sticky bar)
├── types/             # TypeScript-typer
└── utils/             # Partifärkoder, förkortningar m.m.

supabase/
├── functions/         # Edge Functions (Deno runtime)
│   ├── _shared/       # Delade hjälpfunktioner (CORS, auth, Gemini)
│   ├── analyze-manifest/           # Identifiering av löften från manifest
│   └── analyze-promise-status/     # Statusanalys av löften
└── migrations/        # Databasmigrationer
```

## Licens

Det här projektet är licensierat under [GNU Affero General Public License v3.0 (AGPLv3)](https://www.gnu.org/licenses/agpl-3.0.html).

Det innebär i korthet att:

- Du får fritt använda, modifiera och distribuera koden
- Du får använda projektet kommersiellt
- Ändringar och härledda verk måste också licensieras under GNU AGPL
- Om du kör en modifierad version, som en nätverkstjänst, måste du tillhandahålla källkoden

Se filen [LICENSE](LICENSE) för fullständig licenstext.

## Att göra

- [ ] **Communityröstning** — låt alla användare föreslå status på löften, med admingranskning och godkännande *(pågår på `dev`)*
- [ ] **Äldre mandatperioder** — fullt stöd för att analysera löften och status från tidigare mandatperioder *(pågår på `dev`)*
- [ ] **Färska löften** — presentera löften under perioden från att manifesten släppts till att valet hålls
- [ ] **Lokala partier** — stöd för att analysera löften från kommun- och regionpartier
- [ ] **Översättningar** — översätta innehåll till engelska för ökad tillgänglighet, med språkval i UI

## Källor

### Valmanifest

Valmanifesten hämtas från Svensk nationell datatjänst (SND):
[snd.se/sv/vivill](https://snd.se/sv/vivill)

### Forskning om vallöften

Relevanta källor som agerat inspiration för kategoriseringen:

- **Statusbedömningar:** Naurin, E. (2009). *Promising Democracy: Parties, Citizens and Election Promises*. Gothenburg Studies in Politics. Göteborgs universitet. (s. 80–86)
- **Testbarhetsdefinition:** Naurin, E. (2018). *Partiernas vallöften 1991–2014*. Valforskningsprogrammets faktablad 2018:27. Statsvetenskapliga institutionen, Göteborgs universitet. [PDF](https://www.gu.se/sites/default/files/2020-06/2018-27%20Partiernas%20vallo%CC%88ften%201991-2014.pdf)
- Naurin, E., Royed, T. & Thomson, R. (red.) (2019). *Party Mandates and Democracy: Making, Breaking and Keeping Election Pledges in Twelve Democracies*. University of Michigan Press.