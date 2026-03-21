import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Info, Maximize2 } from "lucide-react";
import { ALL_BADGE_CATEGORIES } from "@/config/badgeConfig";
import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangleIcon } from "lucide-react"

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

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
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tillbaka
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">Om Infriat</h1>
        <p className="text-muted-foreground leading-relaxed">
          Varje vallöfte på Infriat.se analyseras och kategoriseras med hjälp av AI.
          Nedan beskrivs de olika klassificeringarna som används. All data är öppen för granskning
          och vi välkomnar förslag på förbättringar.
        </p>
      </div>

      {ALL_BADGE_CATEGORIES.map((category) => (
        <section key={category.anchor} id={category.anchor} className="scroll-mt-24">
          <h2 className="text-xl font-semibold tracking-tight">{category.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{category.intro}</p>

          <ItemGroup className="mt-4">
            {category.variants.map((v) => {
              const Icon = v.icon;
              return (
                // <Item variant="outline" size="xs" key={v.key} className="bg-card border-2">
                <Item variant="outline" size="sm" className={cn("border bg-card", v.itemClass)}>
                  <ItemMedia variant="icon">
                    <Icon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{v?.label}</ItemTitle>
                    <ItemDescription>
                      {v?.description}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        </section>
      ))}
    </main>
  );
}
