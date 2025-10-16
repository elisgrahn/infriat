import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

const COLORS = {
  'infriat': 'hsl(var(--chart-1))',
  'delvis-infriat': 'hsl(var(--chart-2))',
  'utreds': 'hsl(var(--chart-3))',
  'ej-infriat': 'hsl(var(--chart-4))',
  'brutet': 'hsl(var(--chart-5))',
};

interface TimelineComparisonProps {
  promises: Promise[];
  governmentPeriods: GovernmentPeriod[];
}

export function TimelineComparison({ promises }: TimelineComparisonProps) {
  const [chartType, setChartType] = useState<"bar" | "area">("bar");
  
  // Party comparison bar chart with status breakdown
  const partyData = promises
    .filter(p => p.status !== 'pending-analysis')
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
        };
      }
      
      acc[abbr].total++;
      if (promise.status === 'infriat') acc[abbr].fulfilled++;
      if (promise.status === 'delvis-infriat') acc[abbr].partial++;
      if (promise.status === 'brutet') acc[abbr].broken++;
      if (promise.status === 'utreds') acc[abbr].investigating++;
      if (promise.status === 'ej-infriat') acc[abbr].notFulfilled++;
      
      return acc;
    }, {} as Record<string, { name: string; total: number; fulfilled: number; partial: number; broken: number; investigating: number; notFulfilled: number }>);

  const partyChartData = Object.values(partyData)
    .map(d => ({
      name: d.name,
      'Infriade': d.fulfilled,
      'Delvis infriade': d.partial,
      'Utreds': d.investigating,
      'Ej infriade': d.notFulfilled,
      'Brutna': d.broken,
      total: d.total,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Jämförelse per parti</h3>
            <p className="text-sm text-muted-foreground">
              {chartType === "bar" ? "Statusfördelning för varje partis vallöften" : "Procentuell statusfördelning per parti"}
            </p>
          </div>
          <Tabs value={chartType} onValueChange={(value) => setChartType(value as "bar" | "area")}>
            <TabsList>
              <TabsTrigger value="bar">Staplar</TabsTrigger>
              <TabsTrigger value="area">Area</TabsTrigger>
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
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="Brutna" stackId="a" fill={COLORS['brutet']} fillOpacity={0.8} />
              <Bar dataKey="Ej infriade" stackId="a" fill={COLORS['ej-infriat']} fillOpacity={0.8} />
              <Bar dataKey="Utreds" stackId="a" fill={COLORS['utreds']} fillOpacity={0.8} />
              <Bar dataKey="Delvis infriade" stackId="a" fill={COLORS['delvis-infriat']} fillOpacity={0.8} />
              <Bar dataKey="Infriade" stackId="a" fill={COLORS['infriat']} fillOpacity={0.8} />
            </BarChart>
          ) : (
            <AreaChart data={partyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
              />
              <Legend />
              <Area type="step" dataKey="Brutna" stackId="1" stroke={COLORS['brutet']} fill={COLORS['brutet']} fillOpacity={0.8} />
              <Area type="step" dataKey="Ej infriade" stackId="1" stroke={COLORS['ej-infriat']} fill={COLORS['ej-infriat']} fillOpacity={0.8} />
              <Area type="step" dataKey="Utreds" stackId="1" stroke={COLORS['utreds']} fill={COLORS['utreds']} fillOpacity={0.8} />
              <Area type="step" dataKey="Delvis infriade" stackId="1" stroke={COLORS['delvis-infriat']} fill={COLORS['delvis-infriat']} fillOpacity={0.8} />
              <Area type="step" dataKey="Infriade" stackId="1" stroke={COLORS['infriat']} fill={COLORS['infriat']} fillOpacity={0.8} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
