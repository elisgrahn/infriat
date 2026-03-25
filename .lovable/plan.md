

## Uppdaterad plan: Exkludera admin från popularitetsräkning

Enkelt tillägg till den redan godkända planen. När klienten anropar `increment-view` edge function:

### Ändring i edge function `increment-view`

Innan räknaren uppdateras, kontrollera om användaren är admin genom att kolla `user_roles`-tabellen. Om JWT finns och användaren har rollen `admin` — returnera `200 OK` utan att öka räknaren.

```text
Request → Parse JWT (om finns) → Är admin? → Ja → return 200 (no-op)
                                             → Nej → UPDATE view_count + 1
```

Konkret:
1. Läs `Authorization`-headern (valfri — anonyma besökare har ingen)
2. Om token finns: verifiera med Supabase, kolla `user_roles` för `role = 'admin'`
3. Om admin: returnera tidigt utan att räkna
4. Annars: öka `view_count` som vanligt

Alternativt (enklare, klientbaserat): I frontend-koden som anropar `increment-view`, kolla `isAdmin` från `useAuth()` och skippa anropet helt. Det sparar ett nätverksanrop.

### Rekommendation

Klientbaserad lösning är enklast och säkrast — admin-klienten skickar aldrig anropet. Edge function behöver ingen ändring. En rad i `PromiseDetailOverlay.tsx`:

```
if (!isAdmin) { fetch increment-view }
```

Ska jag gå vidare med hela implementationen (SEO + popularitet + admin-exkludering)?

