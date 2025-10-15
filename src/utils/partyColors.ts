export const partyColors: Record<string, string> = {
  Socialdemokraterna:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-[hsl(352,86%,49%)] data-[state=on]:hover:bg-[hsl(352,86%,44%)] bg-[hsl(352,86%,49%)] hover:bg-[hsl(352,86%,44%)]",
  Moderaterna:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-[hsl(198,81%,62%)] data-[state=on]:hover:bg-[hsl(198,81%,57%)] bg-[hsl(198,81%,62%)] hover:bg-[hsl(198,81%,57%)]",
  Sverigedemokraterna:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-[hsl(60,100%,43%)] data-[state=on]:hover:bg-[hsl(60,100%,38%)] bg-[hsl(60,100%,43%)] hover:bg-[hsl(60,100%,38%)]",
  Centerpartiet:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-[hsl(140,100%,30%)] data-[state=on]:hover:bg-[hsl(140,100%,25%)] bg-[hsl(140,100%,30%)] hover:bg-[hsl(140,100%,25%)]",
  Vänsterpartiet:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-[hsl(4,77%,48%)] data-[state=on]:hover:bg-[hsl(4,77%,43%)] bg-[hsl(4,77%,48%)] hover:bg-[hsl(4,77%,43%)]",
  Kristdemokraterna:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-[hsl(205,100%,32%)] data-[state=on]:hover:bg-[hsl(205,100%,32%)] bg-[hsl(205,100%,32%)] hover:bg-[hsl(205,100%,32%)]",
  Liberalerna:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-[hsl(204,100%,35%)] data-[state=on]:hover:bg-[hsl(204,100%,30%)] bg-[hsl(204,100%,35%)] hover:bg-[hsl(204,100%,30%)]",
  Miljöpartiet:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-[hsl(90,61%,52%)] data-[state=on]:hover:bg-[hsl(90,61%,47%)] bg-[hsl(90,61%,52%)] hover:bg-[hsl(90,61%,47%)]",
};

export const statusColors: Record<string, string> = {
  Infriat:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-emerald-700 data-[state=on]:hover:bg-emerald-800",
  "Delvis infriat":
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-emerald-400 data-[state=on]:hover:bg-emerald-500",
  Pågående:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-amber-500 data-[state=on]:hover:bg-amber-600",
  Försenat:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-rose-400 data-[state=on]:hover:bg-rose-500",
  Brutet:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-rose-700 data-[state=on]:hover:bg-rose-800",
  Oklart:
    "data-[state=off]:bg-background data-[state=off]:hover:bg-muted data-[state=on]:bg-purple-500 data-[state=on]:hover:bg-purple-600",
};
