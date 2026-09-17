import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye } from "lucide-react";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchGovernmentPeriods, fetchPromises, promiseKeys } from "@/services/promises";
import { computePartyStats, fulfilledShare, type AnalysedStatus } from "@/lib/partyStats";
import type { GovernmentPeriod, PromiseData } from "@/types/promise";
import { CATEGORY_CONFIG, STATUS_CONFIG, type Category } from "@/config/badgeConfig";
import { PARTY_ABBREVIATION_TO_NAME } from "@/utils/partyAbbreviations";
import { getBadgeColor } from "@/utils/partyColors";
import { getMandateType } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GovernmentBadge } from "@/components/badges/GovernmentBadge";
import { useNavigate } from "react-router-dom";

const STATUS_BAR_ORDER: AnalysedStatus[] = [
  "infriat",
  "delvis-infriat",
  "utreds",
  "ej-infriat",
  "brutet",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
} as const;

interface PartyDetailProps {
  kort: string;
  initialPromises?: PromiseData[];
  initialPeriods?: GovernmentPeriod[];
}

export default function PartyDetail({
  kort,
  initialPromises,
  initialPeriods,
}: PartyDetailProps) {
  const navigate = useNavigate();
  const name = PARTY_ABBREVIATION_TO_NAME[kort] ?? kort;
  const abbreviation = PARTY_ABBREVIATION_TO_NAME[kort] ? kort : undefined;

  const { data: promises = [], isLoading } = useQuery({
    queryKey: promiseKeys.all,
    queryFn: fetchPromises,
    initialData: initialPromises,
  });
  const { data: periods = [] } = useQuery({
    queryKey: promiseKeys.governmentPeriods,
    queryFn: fetchGovernmentPeriods,
    initialData: initialPeriods,
  });

  const partyPromises = useMemo(
    () => promises.filter((p) => p.parties?.name === name),
    [promises, name],
  );
  const stats = useMemo(() => computePartyStats(promises, name), [promises, name]);
  const share = fulfilledShare(stats);

  const mandate = useMemo(() => {
    const active = periods.find((p) => p.end_year === null);
    if (!active) return null;
    return getMandateType(name, active.start_year, periods);
  }, [periods, name]);

  const categoryData = useMemo(() => {
    const categories = Object.keys(CATEGORY_CONFIG) as Category[];
    return categories
      .map((category) => {
        const row: Record<string, string | number> = {
          name: CATEGORY_CONFIG[category].label,
        };
        for (const status of STATUS_BAR_ORDER) row[status] = 0;
        for (const promise of partyPromises) {
          if (promise.category === category && promise.status !== "pending-analysis") {
            row[promise.status] = (row[promise.status] as number) + 1;
          }
        }
        return row;
      })
      .filter((row) => STATUS_BAR_ORDER.some((status) => (row[status] as number) > 0));
  }, [partyPromises]);

  const [categoryChart, setCategoryChart] = useState<"bar" | "radar">("bar");

  const radarData = useMemo(
    () =>
      categoryData.map((row) => {
        const total = STATUS_BAR_ORDER.reduce(
          (sum, status) => sum + (row[status] as number),
          0,
        );
        const fulfilled =
          (row["infriat"] as number) + 0.5 * (row["delvis-infriat"] as number);
        return {
          name: row.name as string,
          total,
          share: total > 0 ? Math.round((fulfilled / total) * 100) : 0,
        };
      }),
    [categoryData],
  );


  const yearData = useMemo(() => {
    const years = [...new Set(partyPromises.map((p) => p.election_year))].sort(
      (a, b) => a - b,
    );
    return years.map((year) => {
      const row: Record<string, string | number> = { year: String(year) };
      for (const status of STATUS_BAR_ORDER) row[status] = 0;
      for (const promise of partyPromises) {
        if (promise.election_year === year && promise.status !== "pending-analysis") {
          row[promise.status] = (row[promise.status] as number) + 1;
        }
      }
      return row;
    });
  }, [partyPromises]);

  const topPromises = useMemo(
    () =>
      [...partyPromises]
        .filter((p) => p.status !== "pending-analysis")
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 5),
    [partyPromises],
  );

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-8">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const statCards: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: "Granskade löften",
      value: String(stats.total),
      hint: stats.upcoming ? `${stats.upcoming} väntar på analys` : undefined,
    },
    {
      label: STATUS_CONFIG.infriat.label,
      value: share != null ? `${share} %` : "–",
      hint: `${stats.infriat} av ${stats.total}`,
    },
    {
      label: STATUS_CONFIG["delvis-infriat"].label,
      value: String(stats["delvis-infriat"]),
    },
    { label: STATUS_CONFIG.brutet.label, value: String(stats.brutet) },
    {
      label: STATUS_CONFIG.utreds.label,
      value: String(stats.utreds + stats["ej-infriat"]),
      hint: "utreds + ej infriat",
    },
  ];

  return (
    <div className="bg-background">
      <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-3 text-muted-foreground"
            onClick={() => navigate("/parti")}
          >
            <ArrowLeft data-icon="inline-start" />
            Alla partier
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            {abbreviation && (
              <Badge variant="outline" className={getBadgeColor(name)}>
                {abbreviation}
              </Badge>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{name}</h1>
            {mandate && <GovernmentBadge governmentStatus={mandate} compact={false} />}
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {stats.total
              ? `Vi följer ${stats.total} vallöften från ${name}. ${share != null ? `${share} % är infriade.` : ""}`
              : `Inga analyserade vallöften från ${name} ännu.`}
          </p>
        </div>
      </section>

      <main className="container mx-auto space-y-6 px-4 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {statCards.map((card) => (
            <Card key={card.label} className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
              {card.hint && (
                <p className="text-xs text-muted-foreground">{card.hint}</p>
              )}
            </Card>
          ))}
        </div>

        {/* Category chart */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Löften per politikområde
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {categoryChart === "bar"
                    ? "Antal vallöften per status i varje politikområde"
                    : "Andel infriade löften per politikområde"}
                </p>
              </div>
              <Tabs
                value={categoryChart}
                onValueChange={(value) => setCategoryChart(value as "bar" | "radar")}
              >
                <TabsList>
                  <TabsTrigger value="bar">Staplar</TabsTrigger>
                  <TabsTrigger value="radar">Radar</TabsTrigger>
                </TabsList>
                <TabsContent value="bar" className="hidden" />
                <TabsContent value="radar" className="hidden" />
              </Tabs>
            </CardHeader>
            <CardContent>
              {categoryChart === "bar" ? (
                <ResponsiveContainer width="100%" height={Math.max(240, categoryData.length * 44)}>
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Legend formatter={(value) => STATUS_CONFIG[value as AnalysedStatus]?.label ?? value} />
                    {STATUS_BAR_ORDER.map((status) => (
                      <Bar
                        key={status}
                        dataKey={status}
                        stackId="a"
                        fill={STATUS_CONFIG[status].chartColor}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="name"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tickCount={5}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickFormatter={(value: number) => `${value} %`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, _name, payload) => [
                        `${value} % infriat`,
                        `${payload?.payload?.total ?? 0} granskade löften`,
                      ]}
                    />
                    <Radar
                      name="Andel infriade"
                      dataKey="share"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Election year chart */}
        {yearData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Status per valår</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yearData} margin={{ left: 0, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="year"
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <YAxis
                    width={40}
                    allowDecimals={false}
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Legend formatter={(value) => STATUS_CONFIG[value as AnalysedStatus]?.label ?? value} />
                  {STATUS_BAR_ORDER.map((status) => (
                    <Bar
                      key={status}
                      dataKey={status}
                      stackId="a"
                      fill={STATUS_CONFIG[status].chartColor}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Most popular promises */}
        {topPromises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Mest lästa löften</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {topPromises.map((promise) => (
                <button
                  key={promise.id}
                  type="button"
                  onClick={() => navigate(`/?promise=${promise.id}`)}
                  className="flex w-full items-start justify-between gap-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-sm font-medium text-foreground">
                    {promise.promise_text}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    {promise.view_count}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
