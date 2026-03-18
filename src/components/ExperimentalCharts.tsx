import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";
import {
  buildAverageMeasurabilityByParty,
  buildPartyPerformanceScatterData,
  buildPartyStatusRadarData,
  CHARTABLE_STATUSES,
  type AnalyticsPromise,
} from "@/lib/promiseMetrics";

interface ExperimentalChartsProps {
  promises: AnalyticsPromise[];
  isAdmin?: boolean;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  color: "hsl(var(--foreground))",
};

export function ExperimentalCharts({
  promises,
  isAdmin = false,
}: ExperimentalChartsProps) {
  const [radarMode, setRadarMode] = useState<"share" | "count">("share");

  const visiblePromises = useMemo(
    () => promises.filter((promise) => isAdmin || promise.status !== "pending-analysis"),
    [isAdmin, promises],
  );

  const radarData = useMemo(
    () => buildPartyStatusRadarData(visiblePromises, radarMode),
    [visiblePromises, radarMode],
  );

  const measurabilityData = useMemo(
    () => buildAverageMeasurabilityByParty(visiblePromises),
    [visiblePromises],
  );

  const scatterData = useMemo(
    () => buildPartyPerformanceScatterData(visiblePromises),
    [visiblePromises],
  );

  const radarMax =
    radarMode === "share"
      ? 100
      : Math.max(3, ...radarData.map((row) => row.total));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Status-radar per parti</CardTitle>
              <CardDescription>
                Varje axel är ett parti, och varje färg visar hur löftena fördelas per status.
              </CardDescription>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <Button
                variant={radarMode === "share" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRadarMode("share")}
              >
                Andel
              </Button>
              <Button
                variant={radarMode === "count" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRadarMode("count")}
              >
                Antal
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="party"
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, radarMax]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => {
                      const label = STATUS_CONFIG[name as PromiseStatus]?.label ?? name;
                      return [
                        radarMode === "share" ? `${value}%` : `${value} st`,
                        label,
                      ];
                    }}
                  />
                  <Legend />
                  {CHARTABLE_STATUSES.map((status) => (
                    <Radar
                      key={status}
                      name={status}
                      dataKey={status}
                      stroke={STATUS_CONFIG[status].chartColor}
                      fill={STATUS_CONFIG[status].chartColor}
                      fillOpacity={0.16}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Genomsnittlig mätbarhet per parti</CardTitle>
            <CardDescription>
              Jämför snittvärdet för löften som redan fått en mätbarhetsbedömning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={measurabilityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="party"
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    domain={[0, 5]}
                    tickCount={6}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value.toFixed(2)} / 5`, "Snitt"]}
                    labelFormatter={(label) => `Parti: ${label}`}
                  />
                  <Bar dataKey="average" name="Mätbarhet" radius={[10, 10, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status mot mätbarhet</CardTitle>
          <CardDescription>
            Punktdiagram där X visar genomsnittlig statusnivå, Y visar genomsnittlig mätbarhet och punktstorlek motsvarar antal löften.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="avgStatus"
                  name="Status"
                  domain={[0, 5]}
                  tickCount={6}
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  type="number"
                  dataKey="avgMeasurability"
                  name="Mätbarhet"
                  domain={[0, 5]}
                  tickCount={6}
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <ZAxis type="number" dataKey="total" range={[90, 360]} name="Löften" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--border))" }}
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => {
                    if (name === "avgStatus") return [`${value.toFixed(2)} / 5`, "Statusnivå"];
                    if (name === "avgMeasurability") return [`${value.toFixed(2)} / 5`, "Mätbarhet"];
                    return [`${value} st`, "Löften"];
                  }}
                  labelFormatter={() => "Partijämförelse"}
                />
                <Scatter name="Partier" data={scatterData} fill="hsl(var(--secondary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {scatterData.map((point) => (
              <span key={point.party} className="rounded-full border border-border px-2.5 py-1">
                {point.party}: {point.total} löften
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
