import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";
import { type AnalyticsPromise } from "@/lib/promiseMetrics";

interface EnhancedStatisticsChartsProps {
  promises: AnalyticsPromise[];
  isAdmin?: boolean;
}

export function EnhancedStatisticsCharts({ promises }: EnhancedStatisticsChartsProps) {
  // pending-analysis already filtered by the caller — but guard defensively
  const analysed = promises.filter((p) => p.status !== "pending-analysis");
    
  // Status distribution pie chart
  const statusData = analysed.reduce((acc, promise) => {
    const existing = acc.find(item => item.status === promise.status);
    if (existing) {
      existing.value++;
    } else {
      acc.push({
        status: promise.status,
        value: 1,
        name:
          STATUS_CONFIG[promise.status as PromiseStatus]?.label ??
          promise.status,
      });
    }
    return acc;
  }, [] as Array<{ status: string; value: number; name: string }>);

  // Party comparison bar chart
  const partyData = analysed.reduce((acc, promise) => {
      const abbr = promise.parties.abbreviation;
      
      if (!acc[abbr]) {
        acc[abbr] = {
          name: abbr,
          total: 0,
          fulfilled: 0,
          partial: 0,
          broken: 0,
        };
      }
      
      acc[abbr].total++;
      if (promise.status === 'infriat') acc[abbr].fulfilled++;
      if (promise.status === 'delvis-infriat') acc[abbr].partial++;
      if (promise.status === 'brutet') acc[abbr].broken++;
      
      return acc;
    }, {} as Record<string, { name: string; total: number; fulfilled: number; partial: number; broken: number }>);

  const partyChartData = Object.values(partyData)
    .map(d => ({
      name: d.name,
      'Infriade': d.fulfilled,
      'Delvis infriade': d.partial,
      'Brutna': d.broken,
      total: d.total,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution Pie Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Statusfördelning</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    STATUS_CONFIG[entry.status as PromiseStatus]?.chartColor ??
                    "hsl(var(--muted))"
                  }
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Party Comparison Bar Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Jämförelse mellan partier
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={partyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="Infriade" stackId="a" fill="hsl(var(--chart-1))" />
            <Bar
              dataKey="Delvis infriade"
              stackId="a"
              fill="hsl(var(--chart-2))"
            />
            <Bar dataKey="Brutna" stackId="a" fill="hsl(var(--chart-5))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
