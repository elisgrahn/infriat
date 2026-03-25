import { useState, useMemo } from "react";
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Line } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/badgeConfig";
import { getBadgeColor } from "@/utils/partyColors";

interface Promise {
  election_year: number;
  status: string;
  measurability_score: number | null;
  parties: {
    name: string;
    abbreviation: string;
  };
}

interface GovernmentPeriod {
  id: string;
  name: string;
  start_year: number;
  end_year: number | null;
  governing_parties: string[];
  support_parties: string[] | null;
}

interface TimelineComparisonProps {
  promises: Promise[];
  governmentPeriods: GovernmentPeriod[];
  isAdmin?: boolean;
}

const baseChartConfig = {
  infriade: {
    label: 'Infriade',
    color: STATUS_CONFIG['infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))',
  },
  delvisInfriade: {
    label: 'Delvis infriade',
    color: STATUS_CONFIG['delvis-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))',
  },
  utreds: {
    label: 'Utreds',
    color: STATUS_CONFIG['utreds' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))',
  },
  ejInfriade: {
    label: 'Ej infriade',
    color: STATUS_CONFIG['ej-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))',
  },
  brutna: {
    label: 'Brutna',
    color: STATUS_CONFIG['brutet' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))',
  },
  underAnalys: {
    label: 'Under analys',
    color: STATUS_CONFIG['pending-analysis' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))',
  },
  avgMeasurability: {
    label: 'Snitt mätbarhet',
    color: 'hsl(var(--foreground))',
  },
} satisfies ChartConfig;

export function TimelineComparison({ promises, isAdmin = false }: TimelineComparisonProps) {
  const [chartType, setChartType] = useState<"bar" | "area">("bar");

  // Mapping from abbreviation to full party name
  const abbrToPartyName: Record<string, string> = {
    'S': 'Socialdemokraterna',
    'M': 'Moderaterna',
    'SD': 'Sverigedemokraterna',
    'C': 'Centerpartiet',
    'V': 'Vänsterpartiet',
    'KD': 'Kristdemokraterna',
    'L': 'Liberalerna',
    'MP': 'Miljöpartiet',
  };

  // Custom tick component for party labels
  const CustomPartyTick = ({ x = 0, y = 0, payload = { value: '' } }: { x?: number; y?: number; payload?: { value: string } }) => {
    const partyAbbr = payload.value;
    const partyName = abbrToPartyName[partyAbbr] || partyAbbr;
    const badgeClass = getBadgeColor(partyName);
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-30} y={0} width={60} height={30}>
          <div className="flex items-center justify-center">
            <Badge className={cn(badgeClass, "text-xs px-1 py-0.5 rounded-sm")}>
              {partyAbbr}
            </Badge>
          </div>
        </foreignObject>
      </g>
    );
  };
  
  // Party comparison bar chart with status breakdown
  const partyData = useMemo(() => promises
    .filter(p => isAdmin || p.status !== 'pending-analysis')
    .reduce((acc, promise) => {
      const abbr = promise.parties.abbreviation;
      
      if (!acc[abbr]) {
        acc[abbr] = {
          name: abbr,
          total: 0,
          fulfilled: 0,
          partial: 0,
          broken: 0,
          investigating: 0,
          notFulfilled: 0,
          pendingAnalysis: 0,
          measurabilitySum: 0,
          measurabilityCount: 0,
        };
      }
      
      acc[abbr].total++;
      if (promise.status === 'infriat') acc[abbr].fulfilled++;
      if (promise.status === 'delvis-infriat') acc[abbr].partial++;
      if (promise.status === 'brutet') acc[abbr].broken++;
      if (promise.status === 'utreds') acc[abbr].investigating++;
      if (promise.status === 'ej-infriat') acc[abbr].notFulfilled++;
      if (promise.status === 'pending-analysis') acc[abbr].pendingAnalysis++;
      if (promise.measurability_score != null) {
        acc[abbr].measurabilitySum += promise.measurability_score;
        acc[abbr].measurabilityCount++;
      }
      
      return acc;
    }, {} as Record<string, { name: string; total: number; fulfilled: number; partial: number; broken: number; investigating: number; notFulfilled: number; pendingAnalysis: number; measurabilitySum: number; measurabilityCount: number }>),
  [promises, isAdmin]);

  // Political spectrum order from left to right
  const partyOrder = ['V', 'S', 'MP', 'C', 'L', 'KD', 'M', 'SD'];
  
  const partyChartData = useMemo(() => Object.values(partyData)
    .map(d => ({
      name: d.name,
      infriade: d.fulfilled,
      delvisInfriade: d.partial,
      utreds: d.investigating,
      ejInfriade: d.notFulfilled,
      brutna: d.broken,
      ...(isAdmin && { underAnalys: d.pendingAnalysis }),
      total: d.total,
      avgMeasurability: d.measurabilityCount > 0
        ? Math.round((d.measurabilitySum / d.measurabilityCount) * 10) / 10
        : null,
    }))
    .sort((a, b) => {
      const indexA = partyOrder.indexOf(a.name);
      const indexB = partyOrder.indexOf(b.name);
      // If party not in order array, put it at the end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    }),
  [partyData, isAdmin]);

  // Convert to percentage for area chart
  const partyChartDataPercent = useMemo(() => partyChartData.map(d => ({
    name: d.name,
    infriade: d.total > 0 ? d.infriade / d.total : 0,
    delvisInfriade: d.total > 0 ? d.delvisInfriade / d.total : 0,
    utreds: d.total > 0 ? d.utreds / d.total : 0,
    ejInfriade: d.total > 0 ? d.ejInfriade / d.total : 0,
    brutna: d.total > 0 ? d.brutna / d.total : 0,
    ...(isAdmin && { underAnalys: d.total > 0 ? (d.underAnalys ?? 0) / d.total : 0 }),
    avgMeasurability: d.avgMeasurability,
  })),
  [partyChartData, isAdmin]);

  return (
    <Card className="p-6 rounded-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Jämförelse per parti</h2>
            <p className="text-sm text-muted-foreground">
              {chartType === "bar" ? "Antal vallöften per status för varje parti" : "Procentuell statusfördelning per parti"}
            </p>
          </div>
          <Tabs value={chartType} onValueChange={(value) => setChartType(value as "bar" | "area")}>
            <TabsList>
              <TabsTrigger value="bar">Antal</TabsTrigger>
              <TabsTrigger value="area">Andel</TabsTrigger>
            </TabsList>
            <TabsContent value="bar" className="hidden" />
            <TabsContent value="area" className="hidden" />
          </Tabs>
        </div>
        {chartType === "bar" ? (
          <ChartContainer config={baseChartConfig} className="h-[300px] w-full">
            <ComposedChart data={partyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={<CustomPartyTick />}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => v === 0 ? '' : String(v)}
                label={{ value: 'Antal', angle: -90, position: 'insideLeft', offset: 0, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tickFormatter={(v) => v === 0 ? '' : String(v)}
                label={{ value: 'Mätbarhet', angle: 90, position: 'insideRight', offset: 0, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                width={40}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  const sorted = payload
                    ? [
                        ...[...payload].filter(p => p.dataKey !== 'avgMeasurability').reverse(),
                        ...payload.filter(p => p.dataKey === 'avgMeasurability'),
                      ]
                    : payload;
                  const total = (payload?.[0]?.payload as { total: number } | undefined)?.total ?? 0;
                  return (
                    <ChartTooltipContent
                      active={active}
                      payload={sorted}
                      label={label}
                      labelFormatter={(lbl) => `${abbrToPartyName[lbl] || lbl} (${total} st)`}
                      formatter={(value, name, item) => {
                        const num = Number(value);
                        const cfg = baseChartConfig[name as keyof typeof baseChartConfig];
                        const displayValue = item.dataKey === 'avgMeasurability'
                          ? `${num} / 5`
                          : (() => {
                              const pct = total > 0 ? ((num / total) * 100).toFixed(0) : 0;
                              return `${num} st (${pct}%)`;
                            })();
                        return (
                          <>
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
                              style={{ "--color-bg": cfg?.color } as React.CSSProperties}
                            />
                            {cfg?.label ?? name}
                            <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                              {displayValue}
                            </div>
                          </>
                        );
                      }}
                    />
                  );
                }}
              />
              <ChartLegend
                content={({ payload }) => {
                  const sorted = payload
                    ? [
                        ...[...payload].filter(p => p.dataKey !== 'avgMeasurability').reverse(),
                        ...payload.filter(p => p.dataKey === 'avgMeasurability'),
                      ]
                    : payload;
                  return <ChartLegendContent payload={sorted} className="flex-wrap" />;
                }}
              />
              {isAdmin && <Bar yAxisId="left" dataKey="underAnalys" stackId="a" fill="var(--color-underAnalys)" fillOpacity={0.8} />}
              <Bar yAxisId="left" dataKey="brutna" stackId="a" fill="var(--color-brutna)" fillOpacity={0.8} />
              <Bar yAxisId="left" dataKey="ejInfriade" stackId="a" fill="var(--color-ejInfriade)" fillOpacity={0.8} />
              <Bar yAxisId="left" dataKey="utreds" stackId="a" fill="var(--color-utreds)" fillOpacity={0.8} />
              <Bar yAxisId="left" dataKey="delvisInfriade" stackId="a" fill="var(--color-delvisInfriade)" fillOpacity={0.8} />
              <Bar yAxisId="left" dataKey="infriade" stackId="a" fill="var(--color-infriade)" fillOpacity={0.8} />
              <Line
                yAxisId="right"
                type="step"
                dataKey="avgMeasurability"
                name="Snitt mätbarhet"
                stroke="var(--color-avgMeasurability)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <ChartContainer config={baseChartConfig} className="h-[300px] w-full">
            <ComposedChart data={partyChartDataPercent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={<CustomPartyTick />}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                label={{ value: 'Andel', angle: -90, position: 'insideLeft', offset: 0, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tickFormatter={(v) => v === 0 ? '' : String(v)}
                label={{ value: 'Mätbarhet', angle: 90, position: 'insideRight', offset: 0, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                width={40}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  const sorted = payload
                    ? [
                        ...[...payload].filter(p => p.dataKey !== 'avgMeasurability').reverse(),
                        ...payload.filter(p => p.dataKey === 'avgMeasurability'),
                      ]
                    : payload;
                  const partyEntry = payload?.[0]?.payload as { name: string } | undefined;
                  const originalPartyData = partyEntry ? partyChartData.find(p => p.name === partyEntry.name) : undefined;
                  const total = originalPartyData?.total ?? 0;
                  return (
                    <ChartTooltipContent
                      active={active}
                      payload={sorted}
                      label={label}
                      labelFormatter={(lbl) => `${abbrToPartyName[lbl] || lbl} (${total} st)`}
                      formatter={(value, name, item) => {
                        const cfg = baseChartConfig[name as keyof typeof baseChartConfig];
                        const statusKey = name as keyof typeof originalPartyData;
                        const displayValue = item.dataKey === 'avgMeasurability'
                          ? `${Number(value)} / 5`
                          : (() => {
                              const actualCount = Number(originalPartyData?.[statusKey] ?? 0);
                              const percentage = (Number(value) * 100).toFixed(0);
                              return `${percentage}% (${actualCount} st)`;
                            })();
                        return (
                          <>
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
                              style={{ "--color-bg": cfg?.color } as React.CSSProperties}
                            />
                            {cfg?.label ?? name}
                            <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                              {displayValue}
                            </div>
                          </>
                        );
                      }}
                    />
                  );
                }}
              />
              <ChartLegend
                content={({ payload }) => {
                  const sorted = payload
                    ? [
                        ...[...payload].filter(p => p.dataKey !== 'avgMeasurability').reverse(),
                        ...payload.filter(p => p.dataKey === 'avgMeasurability'),
                      ]
                    : payload;
                  return <ChartLegendContent payload={sorted} className="flex-wrap" />;
                }}
              />
              {isAdmin && <Bar yAxisId="left" dataKey="underAnalys" stackId="a" fill="var(--color-underAnalys)" fillOpacity={0.8} />}
              <Bar yAxisId="left" dataKey="brutna" stackId="a" fill="var(--color-brutna)" fillOpacity={0.8} />
              <Bar yAxisId="left" dataKey="ejInfriade" stackId="a" fill="var(--color-ejInfriade)" fillOpacity={0.8} />
              <Bar yAxisId="left" dataKey="utreds" stackId="a" fill="var(--color-utreds)" fillOpacity={0.8} />
              <Bar yAxisId="left" dataKey="delvisInfriade" stackId="a" fill="var(--color-delvisInfriade)" fillOpacity={0.8} />
              <Bar yAxisId="left" dataKey="infriade" stackId="a" fill="var(--color-infriade)" fillOpacity={0.8} />
              <Line
                yAxisId="right"
                type="step"
                dataKey="avgMeasurability"
                name="Snitt mätbarhet"
                stroke="var(--color-avgMeasurability)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </div>
    </Card>
  );
}
