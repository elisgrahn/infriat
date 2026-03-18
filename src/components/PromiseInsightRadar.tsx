import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Activity } from "lucide-react";
import { buildPromiseProfileRadarData, type PromiseProfileSource } from "@/lib/promiseMetrics";

interface PromiseInsightRadarProps {
  promise: PromiseProfileSource;
  citationCount: number;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  color: "hsl(var(--foreground))",
};

export function PromiseInsightRadar({
  promise,
  citationCount,
}: PromiseInsightRadarProps) {
  const data = buildPromiseProfileRadarData(promise, citationCount);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card/70 p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Activity className="w-4 h-4" />
          Löftesprofil
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Ett experimentellt kompositdiagram baserat på status, mätbarhet, källstöd och dokumentation.
        </p>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="68%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tickCount={6}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, _name, payload) => [
                `${value} / 5`,
                payload?.payload?.description ?? "Värde",
              ]}
            />
            <Radar
              name="Löftesprofil"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
