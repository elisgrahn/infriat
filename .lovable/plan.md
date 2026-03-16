

## Nästa steg

### 1. Fixa build-felet (blockerare)

Filen `src/config/governConfig.ts` är en trasig kopia av `statusConfig.ts` — den importerar `ThumbsUp, ThumbsDown, Handshake` men använder `CircleCheckBig, SearchCheck, Search, SearchX, X`. Ingen annan fil importerar den. **Lösning: ta bort filen helt.**

### 2. Funktionella prioriteringar

Efter att builden fungerar finns flera naturliga nästa steg baserat på vad som just implementerats:

**A. Testa de nya funktionerna end-to-end**
- Skapa ett vanligt konto via den nya signup-fliken
- Föreslå en statuskorrigering på ett löfte
- Rösta på ett förslag
- Logga in som admin och granska/applicera förslaget
- Verifiera att SourcesList renderar korrekt för löften med och utan källor

**B. Lägg till DELETE-policy på `status_suggestions`**
Admins kan för tillfället inte radera förslag — det saknas en DELETE RLS-policy. Behövs för att kunna rensa spam eller felaktiga förslag.

**C. Admin-notifikation för nya medborgarförslag**
Lägg till en liten räknare/badge på admin-ikonen i navbaren som visar antal obehandlade förslag med ≥ 2 röster.

**D. Edge function: promise_sources INSERT-policy för service role**
Just nu har `promise_sources` bara admin INSERT-policy. Edge function använder service role key som kringgår RLS, så det fungerar — men det kan vara värt att verifiera att analyze-promise-status faktiskt fungerar korrekt med de nya source-inserts.

### Rekommenderad ordning

1. Ta bort `governConfig.ts` → fixar builden
2. Testa allt end-to-end (auth, community notes, sources)
3. DELETE-policy för `status_suggestions`
4. Admin-badge för obehandlade förslag

