import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

interface Promise {
  election_year: number;
  status: string;
  parties: {
    name: string;
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
}

export function TimelineComparison({ promises, governmentPeriods }: TimelineComparisonProps) {
  const getGovernmentStatus = (partyName: string, year: number) => {
    const period = governmentPeriods.find(p => 
      year >= p.start_year && (p.end_year === null || year <= p.end_year)
    );
    
    if (!period) return 'opposition';
    
    return period.governing_parties.includes(partyName) || period.support_parties?.includes(partyName)
      ? 'governing' 
      : 'opposition';
  };

  // Timeline data: fulfillment rate by year
  const timelineData = promises.reduce((acc, promise) => {
    const year = promise.election_year;
    
    if (!acc[year]) {
      acc[year] = { year, total: 0, fulfilled: 0 };
    }
    
    acc[year].total++;
    if (promise.status === 'infriat') {
      acc[year].fulfilled++;
    }
    
    return acc;
  }, {} as Record<number, { year: number; total: number; fulfilled: number }>);

  const timelineChartData = Object.values(timelineData)
    .map(d => ({
      year: d.year,
      rate: Math.round((d.fulfilled / d.total) * 100),
      count: d.total,
    }))
    .sort((a, b) => a.year - b.year);

  // Governing vs Opposition comparison
  const govComparisonData = promises.reduce((acc, promise) => {
    const govStatus = getGovernmentStatus(promise.parties.name, promise.election_year);
    
    if (!acc[govStatus]) {
      acc[govStatus] = { total: 0, fulfilled: 0 };
    }
    
    acc[govStatus].total++;
    if (promise.status === 'infriat') {
      acc[govStatus].fulfilled++;
    }
    
    return acc;
  }, {} as Record<string, { total: number; fulfilled: number }>);

  const comparisonChartData = [
    {
      name: 'Regeringspartier',
      rate: govComparisonData.governing 
        ? Math.round((govComparisonData.governing.fulfilled / govComparisonData.governing.total) * 100)
        : 0,
      count: govComparisonData.governing?.total || 0,
    },
    {
      name: 'Oppositionspartier',
      rate: govComparisonData.opposition 
        ? Math.round((govComparisonData.opposition.fulfilled / govComparisonData.opposition.total) * 100)
        : 0,
      count: govComparisonData.opposition?.total || 0,
    },
  ];

  return (
    <Card className="p-6">
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timeline">Tidslinje</TabsTrigger>
          <TabsTrigger value="comparison">Regering vs Opposition</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Uppfyllelsegrad över tid</h3>
              <p className="text-sm text-muted-foreground">
                Hur många procent av löftena har infriats per valår
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="year" 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  label={{ value: '%', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(year) => `Valår ${year}`}
                  formatter={(value: number, name: string, props: any) => [
                    name === 'rate' ? `${value}%` : value,
                    name === 'rate' ? 'Uppfylld' : 'Antal löften'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Uppfyllelsegrad"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="comparison" className="mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Regering vs Opposition</h3>
              <p className="text-sm text-muted-foreground">
                Jämförelse av uppfyllelsegrad mellan regeringspartier och opposition
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  label={{ value: '%', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'rate' ? `${value}%` : value,
                    name === 'rate' ? 'Uppfyllelsegrad' : 'Antal löften'
                  ]}
                />
                <Legend />
                <Bar 
                  dataKey="rate" 
                  fill="hsl(var(--primary))" 
                  name="Uppfyllelsegrad"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
