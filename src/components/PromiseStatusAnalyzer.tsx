import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractFunctionError } from "@/lib/utils";
import { z } from "zod";

const contextSchema = z.string()
  .trim()
  .max(1000, 'Kontext får vara max 1000 tecken');

interface PromiseStatusAnalyzerProps {
  promiseId: string;
  promiseText: string;
  onAnalysisComplete?: () => void;
}

export const PromiseStatusAnalyzer = ({ 
  promiseId, 
  promiseText, 
  onAnalysisComplete 
}: PromiseStatusAnalyzerProps) => {
  const [context, setContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Validate context if provided
      const validatedContext = context ? contextSchema.parse(context) : undefined;

      const { data, error } = await supabase.functions.invoke('analyze-promise-status', {
        body: {
          promiseId,
          context: validatedContext
        }
      });

      if (error) throw error;

      toast({
        title: "Analys klar!",
        description: `Status: ${data.analysis.status === 'kept' ? 'Uppfyllt' : data.analysis.status === 'broken' ? 'Brutet' : 'Pågående'}`
      });

      setContext("");
      onAnalysisComplete?.();
    } catch (error: any) {
      console.error('Analysis error:', error);
      let errorMessage: string;
      if (error instanceof z.ZodError) {
        errorMessage = error.errors[0].message;
      } else {
        errorMessage = await extractFunctionError(error);
      }
      
      toast({
        title: "Fel vid analys",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Analysera status
        </CardTitle>
        <CardDescription>
          {promiseText}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Extra kontext (valfritt)</label>
          <Textarea
            placeholder="Lägg till eventuell kontext som kan hjälpa analysen..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={4}
          />
        </div>

        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyserar...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Analysera med AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};