import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PromiseStatus = "kept" | "broken" | "in-progress" | "pending-analysis";

interface PromiseCardProps {
  promiseId: string;
  promise: string;
  party: string;
  date: string;
  status: PromiseStatus;
  description?: string;
  onStatusUpdate?: () => void;
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
  "pending-analysis": {
    label: "Under analys",
    variant: "secondary" as const,
    className: "bg-muted text-muted-foreground hover:bg-muted/90",
  },
};

export const PromiseCard = ({ promiseId, promise, party, date, status, description, onStatusUpdate }: PromiseCardProps) => {
  const config = statusConfig[status];
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-promise-status', {
        body: { promiseId }
      });

      if (error) throw error;

      toast.success('Status analyserad!');
      onStatusUpdate?.();
    } catch (error) {
      console.error('Error analyzing promise:', error);
      toast.error('Kunde inte analysera status');
    } finally {
      setIsAnalyzing(false);
    }
  };

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

        {status === 'pending-analysis' && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyserar...' : 'Analysera status'}
          </Button>
        )}
      </div>
    </Card>
  );
};
