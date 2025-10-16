import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
        <div>
          <h3 className="text-lg font-semibold">Jämförelse per parti</h3>
          <p className="text-sm text-muted-foreground">
            Statusfördelning för varje partis vallöften
          </p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
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
            <Bar dataKey="Infriade" stackId="a" fill={COLORS['infriat']} />
            <Bar dataKey="Delvis infriade" stackId="a" fill={COLORS['delvis-infriat']} />
            <Bar dataKey="Utreds" stackId="a" fill={COLORS['utreds']} />
            <Bar dataKey="Ej infriade" stackId="a" fill={COLORS['ej-infriat']} />
            <Bar dataKey="Brutna" stackId="a" fill={COLORS['brutet']} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
