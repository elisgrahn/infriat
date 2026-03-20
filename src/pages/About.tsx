import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Info } from "lucide-react";
import { ALL_BADGE_CATEGORIES } from "@/config/badgeDescriptions";
import { cn } from "@/lib/utils";

export default function About() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }
  }, [hash]);

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-12">
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tillbaka
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">Om kategoriseringarna</h1>
        <p className="text-muted-foreground leading-relaxed">
          Varje vallöfte på Infriat.se analyseras och kategoriseras med hjälp av AI (Gemini).
          Nedan beskrivs de olika klassificeringarna som används. All data är öppen för granskning
          och vi välkomnar förslag på förbättringar.
        </p>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            Statusbedömningarna genereras av AI och kan innehålla felaktigheter.
            Kontrollera alltid mot de angivna källorna.
          </p>
        </div>
      </div>

      {ALL_BADGE_CATEGORIES.map((category) => (
        <section key={category.anchor} id={category.anchor} className="scroll-mt-24 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">{category.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{category.intro}</p>

          <div className="space-y-3">
            {category.variants.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.key}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 gap-1.5 mt-0.5", v.colorClass)}
                  >
                    <Icon className="w-3 h-3" />
                    {v.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
