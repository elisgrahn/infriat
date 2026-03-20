# Publiceringsplan för Infriat.se

## Sammanfattning

Du har en rad saker att åtgärda innan publicering. Här är en plan uppdelad i konkreta steg. Jag besvarar också dina frågor om juridik, branching, och "köp mig en kaffe".

---

## Frågor & svar

### Branching

Lovable stödjer inte Git-branching direkt, men vi kan lösa det med **feature flags** istället. Vi döljer medborgarförslag (CommunityNotes) och login-knappen bakom admin-check — funktionaliteten finns kvar i koden men syns inte för vanliga besökare.

### Juridik & footer

För en svensk hobbywebbplats behöver du:

- **Kontaktuppgift** — e-post räcker ([elis@grahn.ai](mailto:elis@grahn.ai))
- **AI-disclaimer** — viktigt att ha tydligt
- **Cookieinformation** — om du inte sätter cookies (ni verkar inte ha analytics) behövs ingen banner, men nämn det
- Inget krav på organisationsnummer eller personuppgiftsansvarig om du inte samlar personuppgifter (inloggning hanteras av backend och visas inte publikt)

### "Köp mig en kaffe" / Swish

- Under **24 925 kr/år** (2025) räknas det som hobby/gåva och är skattefritt — ingen firma behövs
- En Swish-QR-kod eller Swish-nummer i footern fungerar bra
- Alternativt: buymeacoffee.com eller ko-fi.com (inga svenska skatteregler gäller på gåvor under gränsen)
- Du kan lägga en enkel "Stöd projektet"-sektion med Swish-QR i footern

### OG/preview (Open Graph)

- `index.html` har redan OG-taggar men `og:image` pekar på Lovable-default. Vi behöver en egen OG-bild
- För enskilda löften (/lofte/:id) behöver vi dynamiska OG-taggar — detta kräver server-side rendering. Bästa lösningen: en edge function som returnerar en HTML-sida med rätt meta-taggar och redirectar till SPA:n
- I den ursprungliga planen föreslås en edge function som skapar OG-metadata dynamiskt vid varje delning — det kan du ersätta med ett förbyggnadssteg. Istället för en edge function skapar du ett litet Node-skript som körs manuellt (eller som ett npm-skript) och som hämtar alla löften från Supabase och genererar en statisk HTML-fil per löfte i `public/share/`. Varje sådan fil innehåller hårdkodade OG-taggar med löftets titel, parti och status, plus en omedelbar redirect till SPA-routen. Filerna committas till repot och Vite paketerar dem som vanliga statiska assets utan att behöva känna till dem. Nackdelen jämfört med edge-lösningen är att OG-datan kan bli inaktuell om statusar ändras — men löser du det genom att köra skriptet i samband med varje statusuppdatering (eller periodiskt) är det inget praktiskt problem, och du slipper helt serverlogik vid runtime.

---

## Implementationsplan

### 1. Dölj login-knapp och medborgarförslag för icke-admins

- **Navbar.tsx**: Ta bort login-knappen helt (synlig LogIn-ikon). Admin navigerar manuellt till `/auth`
- **CommunityNotes.tsx**: Wrappa hela komponenten i `if (!isAdmin) return null` — eller skicka `isAdmin` som prop och dölja den
- **Routes**: Behåll `/auth` och `/admin`-routes i koden men gör dem osynliga i UI

### 2. Fixa kontrastproblem i mörkt läge (Politikområde & Typ av löfte)

- I `PromiseFilters.tsx` rad 292 och 325: ändra `data-[state=on]:text-white` → `data-[state=on]:text-background` (eller `data-[state=on]:text-primary-foreground`) för att fungera i både ljust och mörkt tema
- Statusfilter och partifilter lämnas orörda

### 3. Återställ "Filtrera"-rubrik och sökrutan på desktop

- I `PromiseFilters.tsx`: sökrutan styrs av `showSearch` prop (default `true`). Desktop-sidebar i `Index.tsx` rad 411-418 har redan rubrik "Filtrera" och `<PromiseFilters />` utan props, så sök ska synas. Behöver undersöka om det regredierat — men rubriken "Filtrera" finns på rad 413-415 i Index.tsx. Troligt att det fungerar men CSS döljer det. Verifierar och fixar vid implementation.

### 4. Step-linje "hela vägen ut" i diagrammet

- I `TimelineComparison.tsx`: Lägg till `padding={{ left: 20, right: 20 }}` på `XAxis` eller använd `XAxis padding` prop. Alternativt wrappa data med extra datapunkter i ändarna. Enklaste: sätt `XAxis padding={{ left: 30, right: 30 }}` så att step-linjen börjar och slutar utanför yttersta ticken.

### 5. AI-disclaimer

- Lägg till en diskret men tydlig banner/text. Två platser:
  - **Hero**: En liten `Badge` eller text under hero-texten: "Statusbedömningar genereras med hjälp av AI och kan innehålla fel"
  - **Löfteskort**: En liten ikon + tooltip på varje kort vid statusförklaringen
- Föreslår: i hero + i footern. Inte i varje kort (för rörigt).

### 6. Footer med kontaktinfo, disclaimer och "Stöd projektet"

- Bygg ut befintlig footer (Index.tsx rad 567-578) med:
  - AI-disclaimer-text
  - Kontakt: [elis@grahn.ai](mailto:elis@grahn.ai)
  - "Stöd projektet" med Swish-nummer/QR (du får ange ditt Swish-nummer, vi skapar en QR-kod-bild eller text)
  - Upphovsrätt: "© 2025 Elis Grahn"

### 7. Open Graph / delningspreviews

- **Statisk OG (hela sidan)**: Uppdatera `index.html` med en egen OG-bild (du behöver skapa/tillhandahålla en bild, t.ex. 1200x630px)
- **Dynamisk OG (enskilda löften)**: Skapa en edge function `og-image` eller `share-meta` som:
  1. Tar emot `promiseId` som query param
  2. Hämtar löftesdata från databasen
  3. Returnerar en HTML-sida med korrekta `og:title`, `og:description`, `og:image` meta-taggar + en redirect/JavaScript som skickar vidare till SPA:n
  - ShareButton uppdateras att peka på denna URL
  - Alternativt enklare: bara uppdatera meta-taggar statiskt och skippa per-löfte OG tills vidare

---

## Tekniska detaljer


| Steg                           | Filer som ändras                                                 |
| ------------------------------ | ---------------------------------------------------------------- |
| 1. Dölj login/medborgarförslag | `Navbar.tsx`, `PromiseDetailContent.tsx` (CommunityNotes-import) |
| 2. Kontrastfix mörkt läge      | `PromiseFilters.tsx` (rad ~290-296, ~322-326)                    |
| 3. Desktop-filter regression   | `PromiseFilters.tsx` och/eller `Index.tsx` — debug & fix         |
| 4. Step-linje padding          | `TimelineComparison.tsx` (XAxis padding prop)                    |
| 5. AI-disclaimer               | `Index.tsx` (hero + footer)                                      |
| 6. Footer                      | `Index.tsx` (footer-sektion)                                     |
| 7. OG-taggar                   | `index.html`, ev. ny edge function                               |
