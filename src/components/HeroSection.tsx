import {
  ShieldCheck,
  Scale,
  TrendingUp,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { HeroStatCard } from "@/components/HeroStatCard";
import { DisclaimerItem } from "./DisclaimerItem";

interface HeroStats {
  total: number;
  fulfilled: number;
}

interface HeroSectionProps {
  stats: HeroStats;
}

export function HeroSection({ stats }: HeroSectionProps) {
  const fulfillmentRate =
    stats.total > 0 ? Math.round((stats.fulfilled / stats.total) * 100) : 0;

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary-dark text-primary-foreground h-[30rem] flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-foreground rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-10 right-20 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container relative mx-auto px-4 sm:px-7 md:px-10 w-full">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-primary-foreground/20 shadow-lg">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Politisk transparens</span>
          </div>

          <div className="space-y-2">

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-foreground via-primary-foreground to-primary-foreground/80 drop-shadow-lg">
              Infriat
            </h1>

            <p className="text-md sm:text-lg md:text-xl text-primary-foreground/95 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto leading-relaxed font-light">
              Granskar svenska politiska partier och följer upp deras
              vallöften. 
              Transparens och ansvar är grunden för ett demokratiskt
              samhälle.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-4xl mx-auto">
            <HeroStatCard
              icon={Scale}
              value={stats.total}
              label="Antal löften"
            />
            <HeroStatCard
              icon={ShieldCheck}
              value={stats.fulfilled}
              label="Infriade löften"
            />
            <HeroStatCard
              icon={TrendingUp}
              value={`${fulfillmentRate}%`}
              label="Andel infriade"
            />
          </div>
          <DisclaimerItem 
            className="max-w-md mx-auto border border-warning/60 bg-warning/30 backdrop-blur-md rounded-2xl p-3 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-card-foreground" 
            textClass="text-primary-foreground/90"
          />
        </div>
      </div>
    </header>
  );
}
