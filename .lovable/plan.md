# Interaktiva badges med förklaringar

## Översikt

Skapa ett enhetligt badge-system där varje badge (utom parti) har hover-tooltip, klickbar popover med alla varianter, och en samlande metodsida. Dessutom (?) -knappar i filterpanelen.

## Arkitektur

### Ny wrapper-komponent: `InteractiveBadge`

Ja, det är klokt att skapa en generisk wrapper. Den hanterar:

- **Hover** (desktop): visar tooltip med kort förklaring (redan finns, men funkar inte i nuläget, antagligen pga eventpropagation)
- **Klick** (mobil+desktop): öppnar en `Popover` som visar den aktuella varianten markerad bland alla varianter, plus en "Visa alla →"-länk till `/om#section`

```text
┌─────────────────────────────┐
│  InteractiveBadge           │
│  ├─ TooltipProvider/Tooltip │  ← hover (desktop)
│  └─ Popover                 │  ← click (mobil+desktop)
│     ├─ Aktuell variant ✓    │
│     ├─ Övriga varianter     │
│     └─ [Fullscreen] → /om  │
└─────────────────────────────┘
```

### Filer som skapas


| Fil                                          | Syfte                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/badges/InteractiveBadge.tsx` | Generisk wrapper: tooltip + popover med alla varianter                                                                             |
| `src/config/badgeDescriptions.ts`            | Centraliserad data: förklarande text för varje variant av varje badge-typ (status, government, measurability, statusQuo, category) |
| `src/pages/About.tsx`                        | Metodsidan `/om` med ankare `#status`, `#parti-roll`, `#matbarhet`, `#typ`, `#politikomrade`                                       |


### Filer som ändras


| Fil                                            | Ändring                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/components/badges/StatusBadge.tsx`        | Wrappa i `InteractiveBadge` istället för egen Tooltip                                          |
| `src/components/badges/GovernmentBadge.tsx`    | Samma                                                                                          |
| `src/components/badges/MeasurabilityBadge.tsx` | Samma                                                                                          |
| `src/components/badges/StatusQuoBadge.tsx`     | Samma                                                                                          |
| `src/components/badges/CategoryBadge.tsx`      | Samma                                                                                          |
| `src/components/PromiseFilters.tsx`            | Lägg till (?) -knappar till höger om varje `FilterSectionHeader` som länkar till `/om#section` |
| `src/App.tsx`                                  | Lägg till route `/om` → `About`                                                                |


### `InteractiveBadge` — API

```typescript
interface BadgeVariant {
  key: string;
  label: string;
  description: string;  // förklarande text
  icon: LucideIcon | ComponentType;
  colorClass?: string;
}

interface InteractiveBadgeProps {
  children: ReactNode;           // den renderade badgen
  currentKey: string;            // vilken variant som är aktiv
  variants: BadgeVariant[];      // alla varianter i denna kategori
  sectionAnchor: string;         // t.ex. "status" → /om#status
  popoverTitle: string;          // t.ex. "Statusar"
}
```

Wrappern renderar:

1. `Tooltip` runt children med description för `currentKey`
2. `onClick` → öppnar `Popover` som listar alla varianter, markerar current, visar description
3. Popover har en liten knapp uppe till höger: `Expand` → navigerar till `/om#sectionAnchor`

### `badgeDescriptions.ts` — Innehåll

Samlar förklarande texter baserade på de faktiska AI-prompterna och statusdefinitionerna:

- **Status** (5 st): baseras på befintliga `tooltip`-texter i `statusConfig.ts`, men utökade
- **Partiroll** (3 st): Regering, Stödparti, Opposition — befintliga texter i `GovernmentBadge`
- **Mätbarhet** (5 nivåer): befintliga `TOOLTIPS` i `MeasurabilityBadge`, utökade med kriterier
- **Typ av löfte** (2 st): Bevara/Förändra — befintliga descriptions i `categoryConfig.ts`
- **Politikområde** (11 st): kort beskrivning av vad varje område täcker

### Metodsidan `/om`

Enkel sida med sektioner och ankare. Varje sektion visar:

- Rubrik med ikon
- Tabell/lista med alla varianter: badge-preview + förklaring
- Eventuell källa/referens

### Filterpanelen `(?)`-knappar

Lägg till en liten `HelpCircle`-ikon till höger om varje `FilterSectionHeader` som är en `Link` till `/om#section`. Öppnas i samma flik.

## Implementationsordning

1. Skapa `badgeDescriptions.ts` med all data
2. Skapa `InteractiveBadge.tsx` (wrapper med tooltip + popover)
3. Uppdatera alla 5 badge-komponenter att använda wrappern
4. Skapa `About.tsx` metodsida
5. Lägg till route i `App.tsx`
6. Lägg till (?)-knappar i `PromiseFilters.tsx`