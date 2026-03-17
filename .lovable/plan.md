## Nästa steg — Prioriterad plan

Systemet fungerar bra: inline-citations `[1]`, `[2]` genereras korrekt, vertexaisearch-URLs löses upp, och källor sparas i `promise_sources`. Här är de naturliga nästa stegen:

### 1. Numrerad källförteckning under statusbedömningen

Just nu visas "Källor"-sektionen via `SourcesList` som en generisk lista. Den bör istället visa en numrerad fotnotslista (1. Titel — domän.se) som matchar `[n]`-markörerna i texten, så att användaren tydligt ser vilken källa som hör till vilken markör.

**Ändring:** I `PromiseDetailContent.tsx`, lägg till en numrerad referenslista direkt efter `CitedText`, baserad på `citationSources`-arrayen. Behåll `SourcesList` separat för manuellt tillagda admin-källor.

### 2. Inline-citations i PromiseCard-kortet

Statusförklaringen på PromiseCard visas som ren text. Byt till `CitedText` med sources hämtade via ett litet query eller medskickade som props.

**Avvägning:** Att fetcha sources per kort är dyrt. Bättre att strippa `[n]`-markörer i kortvy och bara visa dem i detaljvyn, eller inkludera sources i den befintliga promises-queryn.

### 3. Förbättra SourcesList — separera AI-källor från manuella

`SourcesList` hämtar alla `promise_sources` utan att skilja på AI-genererade och manuellt tillagda. Lägg till ett `origin`-fält (`ai` | `manual`) i `promise_sources` så att UI:t kan gruppera dem.

### 4. Batch-omanalys av befintliga löften

Många löften analyserades före inline-citations. Lägg till en admin-knapp för att köa om-analys av alla löften (eller löften utan `[n]`-markörer i `status_explanation`).  
  
**5. Billigare fetching i huvudmenyn**  
Hämta endast de värden från databasen som i behövs i huvudmenyn och hämta sedan data som källor och längre beskrivningar när PromiseDetail öppnas.  
  
**6. Ghost-animeringar**  
Använd shadcn:s ghost för att lägga till några snygga animerade ghost-kort och dylikt vid laddning av huvudsidan och data i PromiseDetail.   
  
Rekommenderad ordning

1. **Numrerad källförteckning** — snabb UI-förbättring, hög nytta
2. **Strippa citations i PromiseCard** — undvik trasiga `[n]` i kortlistan
3. **Batch-omanalys** — uppdatera gamla löften med nya citations
4. **Billigare fetching i huvudmenyn**
5. **Ghost-animeringar**
6. **Origin-fält på sources** — Framtida förbättring  
