import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/badgeConfig";

interface Promise {
  id: string;
  party_id: string;
  election_year: number;
  promise_text: string;
  status: 'infriat' | 'delvis-infriat' | 'utreds' | 'ej-infriat' | 'brutet' | 'pending-analysis';
  parties: {
    name: string;
    abbreviation: string;
  };
  created_at: string;
}

interface StatisticsChartsProps {
  promises: Promise[];
}


export const StatisticsCharts = ({ promises }: StatisticsChartsProps) => {
  // Prepare data for pie chart (status distribution per year)
  const yearlyData = promises.reduce((acc, promise) => {
    const year = promise.election_year;
    if (!acc[year]) {
      acc[year] = { infriat: 0, 'delvis-infriat': 0, utreds: 0, 'ej-infriat': 0, brutet: 0, 'pending-analysis': 0 };
    }
    acc[year][promise.status]++;
    return acc;
  }, {} as Record<number, Record<string, number>>);

  const pieData = Object.entries(yearlyData).flatMap(([year, statuses]) =>
    Object.entries(statuses).map(([status, count]) => ({
      name: `${STATUS_CONFIG[status as PromiseStatus]?.label ?? status} (${year})`,
      value: count,
      status,
      year,
    })),
  );

  // Prepare data for line chart (party performance over time)
  const partyTimelineData = promises.reduce((acc, promise) => {
    const party = promise.parties.abbreviation;
    const year = promise.election_year;
    
    if (!acc[party]) {
      acc[party] = {};
    }
    if (!acc[party][year]) {
      acc[party][year] = { fulfilled: 0, total: 0 };
    }
    
    acc[party][year].total++;
    if (promise.status === 'infriat') {
      acc[party][year].fulfilled++;
    }
    
    return acc;
  }, {} as Record<string, Record<number, { fulfilled: number; total: number }>>);

  const lineData = Object.keys(partyTimelineData)
    .reduce((years, party) => {
      Object.keys(partyTimelineData[party]).forEach(year => {
        if (!years.includes(Number(year))) {
          years.push(Number(year));
        }
      });
      return years;
    }, [] as number[])
    .sort()
    .map(year => {
      const dataPoint: any = { year };
      Object.keys(partyTimelineData).forEach(party => {
        const yearData = partyTimelineData[party][year];
        if (yearData) {
          dataPoint[party] = Math.round((yearData.fulfilled / yearData.total) * 100);
        }
      });
      return dataPoint;
    });

  const parties = Object.keys(partyTimelineData);
  const partyColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Uppfyllelsegrad över tid</CardTitle>
          <CardDescription>
            Jämförelse mellan partier (% uppfyllda löften)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={parties.reduce(
              (acc, party, idx) => ({
                ...acc,
                [party]: {
                  label: party,
                  color: partyColors[idx % partyColors.length],
                },
              }),
              {},
            )}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="year" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {parties.map((party, idx) => (
                  <Line
                    key={party}
                    type="monotone"
                    dataKey={party}
                    stroke={partyColors[idx % partyColors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status per år</CardTitle>
          <CardDescription>Fördelning av löftesstatus</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              kept: { label: "Uppfyllt", color: "hsl(var(--success))" },
              broken: { label: "Brutet", color: "hsl(var(--destructive))" },
              "in-progress": {
                label: "Pågående",
                color: "hsl(var(--warning))",
              },
              "pending-analysis": {
                label: "Under analys",
                color: "hsl(var(--muted))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        STATUS_CONFIG[entry.status as PromiseStatus]
                          ?.chartColor ?? "hsl(var(--muted))"
                      }
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
