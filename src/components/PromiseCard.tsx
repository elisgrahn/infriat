import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";

type PromiseStatus = "kept" | "broken" | "in-progress";

interface PromiseCardProps {
  promise: string;
  party: string;
  date: string;
  status: PromiseStatus;
  description?: string;
}

const statusConfig = {
  kept: {
    label: "Uppfyllt",
    variant: "default" as const,
    className: "bg-success text-success-foreground hover:bg-success/90",
  },
  broken: {
    label: "Brutet",
    variant: "destructive" as const,
    className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  "in-progress": {
    label: "Pågående",
    variant: "secondary" as const,
    className: "bg-warning text-warning-foreground hover:bg-warning/90",
  },
};

export const PromiseCard = ({ promise, party, date, status, description }: PromiseCardProps) => {
  const config = statusConfig[status];

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-3 flex-wrap">
            <Badge className={config.className}>
              {config.label}
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Users className="w-3 h-3" />
              {party}
            </Badge>
          </div>
          
          <h3 className="text-lg font-semibold text-foreground leading-snug">
            {promise}
          </h3>
          
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{date}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
