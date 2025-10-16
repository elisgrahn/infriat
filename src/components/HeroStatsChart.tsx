import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface HeroStatsChartProps {
  fulfilled: number;
  partiallyFulfilled: number;
  inProgress: number;
  notFulfilled: number;
  broken: number;
}

const STATUS_COLORS = {
  fulfilled: "hsl(var(--chart-1))",
  partial: "hsl(var(--chart-2))",
  progress: "hsl(var(--chart-3))",
  notFulfilled: "hsl(var(--chart-4))",
  broken: "hsl(var(--chart-5))",
};

export function HeroStatsChart({
  fulfilled,
  partiallyFulfilled,
  inProgress,
  notFulfilled,
  broken,
}: HeroStatsChartProps) {
  const data = [
    { name: "Infriat", value: fulfilled, color: STATUS_COLORS.fulfilled },
    { name: "Delvis", value: partiallyFulfilled, color: STATUS_COLORS.partial },
    { name: "Utreds", value: inProgress, color: STATUS_COLORS.progress },
    { name: "Ej", value: notFulfilled, color: STATUS_COLORS.notFulfilled },
    { name: "Brutet", value: broken, color: STATUS_COLORS.broken },
  ];

  return (
    <Card className="bg-primary-foreground/10 backdrop-blur-md border-primary-foreground/20 p-6">
      <h3 className="text-sm font-medium text-primary-foreground/90 mb-4 text-center">
        Statusfördelning
      </h3>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data}>
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'hsl(var(--primary-foreground))', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(var(--primary-foreground) / 0.2)' }}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--primary-foreground))', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(var(--primary-foreground) / 0.2)' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
