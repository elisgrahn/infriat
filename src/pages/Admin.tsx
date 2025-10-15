import { useState, useEffect } from "react";
import { ManifestUpload } from "@/components/ManifestUpload";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [isAnalyzingMeasurability, setIsAnalyzingMeasurability] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Laddar...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const handleAnalyzeMeasurability = async (reanalyze: boolean) => {
    setIsAnalyzingMeasurability(true);
    
    toast({
      title: reanalyze ? "Återanalyserar alla löften..." : "Analyserar mätbarhet...",
      description: "Detta kan ta några minuter beroende på antalet löften"
    });

    try {
      const { data, error } = await supabase.functions.invoke('analyze-measurability', {
        body: { reanalyze }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Analys klar!",
        description: `${data.analyzed} av ${data.total} löften analyserade`,
      });
    } catch (error) {
      console.error('Measurability analysis error:', error);
      toast({
        title: "❌ Fel vid analys",
        description: error instanceof Error ? error.message : "Kunde inte analysera mätbarhet",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingMeasurability(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin</h1>
            <p className="text-muted-foreground">
              Ladda upp och analysera valmanifest
            </p>
          </div>

          <ManifestUpload />

          <div className="flex gap-4">
            <Button
              onClick={() => handleAnalyzeMeasurability(false)}
              disabled={isAnalyzingMeasurability}
              variant="outline"
              className="flex-1"
            >
              <Target className="w-4 h-4 mr-2" />
              {isAnalyzingMeasurability ? "Analyserar..." : "Analysera mätbarhet (nya)"}
            </Button>
            
            <Button
              onClick={() => handleAnalyzeMeasurability(true)}
              disabled={isAnalyzingMeasurability}
              variant="outline"
              className="flex-1"
            >
              <Target className="w-4 h-4 mr-2" />
              {isAnalyzingMeasurability ? "Analyserar..." : "Återanalysera alla"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;