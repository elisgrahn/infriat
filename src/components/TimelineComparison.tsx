import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { partyColors } from "@/utils/partyColors";

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

  // Custom tick component for party labels
  const CustomPartyTick = ({ x, y, payload }: any) => {
    const partyAbbr = payload.value;
    const colorClass = partyColors[partyAbbr]?.replace(/data-\[state=off\][^\s]+ /g, '').replace(/data-\[state=on\][^\s]+ /g, '') || 'bg-muted hover:bg-muted/80 text-white';
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-30} y={0} width={60} height={30}>
          <div className="flex items-center justify-center">
            <Badge className={`${colorClass} text-xs px-2 py-0.5 rounded-sm`}>
              {partyAbbr}
            </Badge>
          </div>
        </foreignObject>
      </g>
    );
  };
  
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

  // Convert to percentage for area chart
  const partyChartDataPercent = partyChartData.map(d => ({
    name: d.name,
    'Infriade': d.total > 0 ? d['Infriade'] / d.total : 0,
    'Delvis infriade': d.total > 0 ? d['Delvis infriade'] / d.total : 0,
    'Utreds': d.total > 0 ? d['Utreds'] / d.total : 0,
    'Ej infriade': d.total > 0 ? d['Ej infriade'] / d.total : 0,
    'Brutna': d.total > 0 ? d['Brutna'] / d.total : 0,
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
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => {
                  const total = props.payload.total;
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                  return `${value} st (${percentage}%)`;
                }}
                itemSorter={(item) => {
                  const order = ['Infriade', 'Delvis infriade', 'Utreds', 'Ej infriade', 'Brutna'];
                  return order.indexOf(item.name as string);
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                payload={[
                  { value: 'Brutna', type: 'rect', color: COLORS['brutet'] },
                  { value: 'Ej infriade', type: 'rect', color: COLORS['ej-infriat'] },
                  { value: 'Utreds', type: 'rect', color: COLORS['utreds'] },
                  { value: 'Delvis infriade', type: 'rect', color: COLORS['delvis-infriat'] },
                  { value: 'Infriade', type: 'rect', color: COLORS['infriat'] },
                ]}
              />
              <Bar dataKey="Brutna" stackId="a" fill={COLORS['brutet']} fillOpacity={0.8} />
              <Bar dataKey="Ej infriade" stackId="a" fill={COLORS['ej-infriat']} fillOpacity={0.8} />
              <Bar dataKey="Utreds" stackId="a" fill={COLORS['utreds']} fillOpacity={0.8} />
              <Bar dataKey="Delvis infriade" stackId="a" fill={COLORS['delvis-infriat']} fillOpacity={0.8} />
              <Bar dataKey="Infriade" stackId="a" fill={COLORS['infriat']} fillOpacity={0.8} />
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
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => {
                  const partyName = props.payload.name;
                  const originalPartyData = partyChartData.find(p => p.name === partyName);
                  const statusKey = name as keyof typeof originalPartyData;
                  const actualCount = originalPartyData?.[statusKey] || 0;
                  const percentage = (value * 100).toFixed(0);
                  return `${percentage}% (${actualCount} st)`;
                }}
                itemSorter={(item) => {
                  const order = ['Infriade', 'Delvis infriade', 'Utreds', 'Ej infriade', 'Brutna'];
                  return order.indexOf(item.name as string);
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                payload={[
                  { value: 'Brutna', type: 'rect', color: COLORS['brutet'] },
                  { value: 'Ej infriade', type: 'rect', color: COLORS['ej-infriat'] },
                  { value: 'Utreds', type: 'rect', color: COLORS['utreds'] },
                  { value: 'Delvis infriade', type: 'rect', color: COLORS['delvis-infriat'] },
                  { value: 'Infriade', type: 'rect', color: COLORS['infriat'] },
                ]}
              />
              <Bar dataKey="Brutna" stackId="a" fill={COLORS['brutet']} fillOpacity={0.8} />
              <Bar dataKey="Ej infriade" stackId="a" fill={COLORS['ej-infriat']} fillOpacity={0.8} />
              <Bar dataKey="Utreds" stackId="a" fill={COLORS['utreds']} fillOpacity={0.8} />
              <Bar dataKey="Delvis infriade" stackId="a" fill={COLORS['delvis-infriat']} fillOpacity={0.8} />
              <Bar dataKey="Infriade" stackId="a" fill={COLORS['infriat']} fillOpacity={0.8} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
