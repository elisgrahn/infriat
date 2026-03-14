import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";
import { getBadgeColor } from "@/utils/partyColors";

interface Promise {
  election_year: number;
  status: string;
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
  const CustomPartyTick = ({ x, y, payload }: any) => {
    const partyAbbr = payload.value;
    const partyName = abbrToPartyName[partyAbbr] || partyAbbr;
    const colorClass = getBadgeColor(partyName);
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-30} y={0} width={60} height={30}>
          <div className="flex items-center justify-center">
            <Badge className={`${colorClass} text-xs px-1 py-0.5 rounded-sm`}>
              {partyAbbr}
            </Badge>
          </div>
        </foreignObject>
      </g>
    );
  };
  
  // Party comparison bar chart with status breakdown
  const partyData = promises
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
        };
      }
      
      acc[abbr].total++;
      if (promise.status === 'infriat') acc[abbr].fulfilled++;
      if (promise.status === 'delvis-infriat') acc[abbr].partial++;
      if (promise.status === 'brutet') acc[abbr].broken++;
      if (promise.status === 'utreds') acc[abbr].investigating++;
      if (promise.status === 'ej-infriat') acc[abbr].notFulfilled++;
      if (promise.status === 'pending-analysis') acc[abbr].pendingAnalysis++;
      
      return acc;
    }, {} as Record<string, { name: string; total: number; fulfilled: number; partial: number; broken: number; investigating: number; notFulfilled: number; pendingAnalysis: number }>);

  // Political spectrum order from left to right
  const partyOrder = ['V', 'S', 'MP', 'C', 'L', 'KD', 'M', 'SD'];
  
  const partyChartData = Object.values(partyData)
    .map(d => ({
      name: d.name,
      'Infriade': d.fulfilled,
      'Delvis infriade': d.partial,
      'Utreds': d.investigating,
      'Ej infriade': d.notFulfilled,
      'Brutna': d.broken,
      ...(isAdmin && { 'Under analys': d.pendingAnalysis }),
      total: d.total,
    }))
    .sort((a, b) => {
      const indexA = partyOrder.indexOf(a.name);
      const indexB = partyOrder.indexOf(b.name);
      // If party not in order array, put it at the end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  // Convert to percentage for area chart
  const partyChartDataPercent = partyChartData.map(d => ({
    name: d.name,
    'Infriade': d.total > 0 ? d['Infriade'] / d.total : 0,
    'Delvis infriade': d.total > 0 ? d['Delvis infriade'] / d.total : 0,
    'Utreds': d.total > 0 ? d['Utreds'] / d.total : 0,
    'Ej infriade': d.total > 0 ? d['Ej infriade'] / d.total : 0,
    'Brutna': d.total > 0 ? d['Brutna'] / d.total : 0,
    ...(isAdmin && { 'Under analys': d.total > 0 ? (d['Under analys'] || 0) / d.total : 0 }),
  }));

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Jämförelse per parti</h3>
            <p className="text-sm text-muted-foreground">
              {chartType === "bar" ? "Antal vallöften per status för varje parti" : "Procentuell statusfördelning per parti"}
            </p>
          </div>
          <Tabs value={chartType} onValueChange={(value) => setChartType(value as "bar" | "area")}>
            <TabsList>
              <TabsTrigger value="bar">Antal</TabsTrigger>
              <TabsTrigger value="area">Procent</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "bar" ? (
            <BarChart data={partyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--foreground))"
                tick={<CustomPartyTick />}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => abbrToPartyName[label] || label}
                formatter={(value: number, name: string, props: any) => {
                  const total = props.payload.total;
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                  return `${value} st (${percentage}%)`;
                }}
                itemSorter={(item) => {
                  const order = ['Infriade', 'Delvis infriade', 'Utreds', 'Ej infriade', 'Brutna', 'Under analys'];
                  return order.indexOf(item.name as string);
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                payload={[
                  ...(isAdmin ? [{ value: 'Under analys', type: 'rect' as const, color: STATUS_CONFIG['pending-analysis' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' }] : []),
                  { value: 'Brutna', type: 'rect', color: STATUS_CONFIG['brutet' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                  { value: 'Ej infriade', type: 'rect', color: STATUS_CONFIG['ej-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                  { value: 'Utreds', type: 'rect', color: STATUS_CONFIG['utreds' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                  { value: 'Delvis infriade', type: 'rect', color: STATUS_CONFIG['delvis-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                  { value: 'Infriade', type: 'rect', color: STATUS_CONFIG['infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                ]}
              />
              {isAdmin && <Bar dataKey="Under analys" stackId="a" fill={STATUS_CONFIG['pending-analysis' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />}
              <Bar dataKey="Brutna" stackId="a" fill={STATUS_CONFIG['brutet' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
              <Bar dataKey="Ej infriade" stackId="a" fill={STATUS_CONFIG['ej-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
              <Bar dataKey="Utreds" stackId="a" fill={STATUS_CONFIG['utreds' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
              <Bar dataKey="Delvis infriade" stackId="a" fill={STATUS_CONFIG['delvis-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
              <Bar dataKey="Infriade" stackId="a" fill={STATUS_CONFIG['infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
            </BarChart>
          ) : (
            <BarChart data={partyChartDataPercent}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--foreground))"
                tick={<CustomPartyTick />}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => abbrToPartyName[label] || label}
                formatter={(value: number, name: string, props: any) => {
                  const partyAbbr = props.payload.name;
                  const originalPartyData = partyChartData.find(p => p.name === partyAbbr);
                  const statusKey = name as keyof typeof originalPartyData;
                  const actualCount = originalPartyData?.[statusKey] || 0;
                  const percentage = (value * 100).toFixed(0);
                  return `${percentage}% (${actualCount} st)`;
                }}
                itemSorter={(item) => {
                  const order = ['Infriade', 'Delvis infriade', 'Utreds', 'Ej infriade', 'Brutna', 'Under analys'];
                  return order.indexOf(item.name as string);
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                payload={[
                  ...(isAdmin ? [{ value: 'Under analys', type: 'rect' as const, color: STATUS_CONFIG['pending-analysis' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' }] : []),
                  { value: 'Brutna', type: 'rect', color: STATUS_CONFIG['brutet' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                  { value: 'Ej infriade', type: 'rect', color: STATUS_CONFIG['ej-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                  { value: 'Utreds', type: 'rect', color: STATUS_CONFIG['utreds' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                  { value: 'Delvis infriade', type: 'rect', color: STATUS_CONFIG['delvis-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                  { value: 'Infriade', type: 'rect', color: STATUS_CONFIG['infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))' },
                ]}
              />
              {isAdmin && <Bar dataKey="Under analys" stackId="a" fill={STATUS_CONFIG['pending-analysis' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />}
              <Bar dataKey="Brutna" stackId="a" fill={STATUS_CONFIG['brutet' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
              <Bar dataKey="Ej infriade" stackId="a" fill={STATUS_CONFIG['ej-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
              <Bar dataKey="Utreds" stackId="a" fill={STATUS_CONFIG['utreds' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
              <Bar dataKey="Delvis infriade" stackId="a" fill={STATUS_CONFIG['delvis-infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
              <Bar dataKey="Infriade" stackId="a" fill={STATUS_CONFIG['infriat' as PromiseStatus]?.chartColor ?? 'hsl(var(--muted-foreground))'} fillOpacity={0.8} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
