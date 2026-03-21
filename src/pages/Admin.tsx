import { useState, useEffect } from "react";
import { ManifestUpload } from "@/components/ManifestUpload";
import { AiPromptLogs } from "@/components/AiPromptLogs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn, extractFunctionError } from "@/lib/utils";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [isAnalyzingMeasurability, setIsAnalyzingMeasurability] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionWithPromise[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchSuggestions();
  }, [isAdmin]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase
        .from('status_suggestions')
        .select('*, promises!inner(promise_text, status, parties(name))')
        .gte('upvotes', 2)
        .order('upvotes', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        promise_id: s.promise_id,
        suggested_status: s.suggested_status,
        explanation: s.explanation,
        sources: s.sources,
        upvotes: s.upvotes,
        downvotes: s.downvotes,
        created_at: s.created_at,
        promise_text: s.promises?.promise_text || '',
        current_status: s.promises?.status || '',
        party_name: s.promises?.parties?.name || '',
      }));
      setSuggestions(mapped);
    } catch {
      // silently handle
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleApply = async (suggestion: SuggestionWithPromise) => {
    try {
      const { error } = await supabase
        .from('promises')
        .update({
          status: suggestion.suggested_status as any,
          status_explanation: suggestion.explanation,
          status_sources: suggestion.sources || [],
        })
        .eq('id', suggestion.promise_id);

      if (error) throw error;

      // Remove applied suggestion
      await supabase.from('status_suggestions').delete().eq('id', suggestion.id);

      toast.success('Status uppdaterad', { description: 'Förslaget har tillämpats' });
      fetchSuggestions();
    } catch {
      toast.error('Fel', { description: 'Kunde inte tillämpa förslaget' });
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    try {
      await supabase.from('status_suggestions').delete().eq('id', suggestionId);
      toast.success('Förslag avfärdat');
      fetchSuggestions();
    } catch {
      toast.error('Fel', { description: 'Kunde inte avfärda förslaget' });
    }
  };

  const handleBatchReanalyze = async () => {
    setIsBatchAnalyzing(true);
    setBatchProgress("Hämtar löften utan citations...");
    try {
      // Find promises that lack [n] markers in status_explanation
      const { data: allPromises, error } = await supabase
        .from("promises")
        .select("id, status_explanation")
        .neq("status", "pending-analysis");
      
      if (error) throw error;
      
      const needsReanalysis = (allPromises || []).filter(
        (p) => !p.status_explanation || !/\[\d+\]/.test(p.status_explanation)
      );

      if (needsReanalysis.length === 0) {
        toast.info('Alla löften har redan citations', { description: 'Inget att omanalysera.' });
        return;
      }

      let done = 0;
      for (const p of needsReanalysis) {
        done++;
        setBatchProgress(`Analyserar ${done}/${needsReanalysis.length}...`);
        try {
          await supabase.functions.invoke("analyze-promise-status", {
            body: { promiseId: p.id },
          });
        } catch {
          // Continue with next
        }
      }

      toast.success('Batch-analys klar!', { description: `${done} löften omanalyserade.` });
    } catch (err) {
      const msg = await extractFunctionError(err);
      toast.error('Fel vid batch-analys', { description: msg });
    } finally {
      setIsBatchAnalyzing(false);
      setBatchProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Laddar...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const handleAnalyzeMeasurability = async (reanalyze: boolean) => {
    setIsAnalyzingMeasurability(true);
    toast.info(reanalyze ? 'Återanalyserar alla löften...' : 'Analyserar mätbarhet...', {
      description: 'Detta kan ta några minuter beroende på antalet löften',
    });

    try {
      const { data, error } = await supabase.functions.invoke('analyze-measurability', {
        body: { reanalyze }
      });
      if (error) throw error;
      toast.success('Analys klar!', { description: `${data.analyzed} av ${data.total} löften analyserade` });
    } catch (error) {
      const msg = await extractFunctionError(error);
      console.error('analyze-measurability error:', error);
      toast.error('Fel vid analys', { description: msg });
    } finally {
      setIsAnalyzingMeasurability(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
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
              {isAnalyzingMeasurability
                ? "Analyserar..."
                : "Analysera mätbarhet (nya)"}
            </Button>
            <Button
              onClick={() => handleAnalyzeMeasurability(true)}
              disabled={isAnalyzingMeasurability}
              variant="outline"
              className="flex-1"
            >
              <Target className="w-4 h-4 mr-2" />
              {isAnalyzingMeasurability
                ? "Analyserar..."
                : "Återanalysera alla"}
            </Button>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleBatchReanalyze}
              disabled={isBatchAnalyzing}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isBatchAnalyzing && "animate-spin")} />
              {isBatchAnalyzing
                ? (batchProgress || "Analyserar...")
                : "Omanalysera statusar (löften utan citations)"}
            </Button>
            {batchProgress && (
              <p className="text-xs text-muted-foreground text-center">{batchProgress}</p>
            )}
          </div>

          <AiPromptLogs />
        </div>
      </div>
    </div>
  );
};

export default Admin;
