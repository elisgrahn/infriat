import { useState, useEffect } from "react";
import { ManifestUpload } from "@/components/ManifestUpload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, Check, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractFunctionError } from "@/lib/utils";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";

interface SuggestionWithPromise {
  id: string;
  promise_id: string;
  suggested_status: string;
  explanation: string;
  sources: string[] | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  promise_text: string;
  current_status: string;
  party_name: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
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

      toast({ title: 'Status uppdaterad', description: 'Förslaget har tillämpats' });
      fetchSuggestions();
    } catch {
      toast({ title: 'Fel', description: 'Kunde inte tillämpa förslaget', variant: 'destructive' });
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    try {
      await supabase.from('status_suggestions').delete().eq('id', suggestionId);
      toast({ title: 'Förslag avfärdat' });
      fetchSuggestions();
    } catch {
      toast({ title: 'Fel', description: 'Kunde inte avfärda förslaget', variant: 'destructive' });
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
    toast({
      title: reanalyze ? "Återanalyserar alla löften..." : "Analyserar mätbarhet...",
      description: "Detta kan ta några minuter beroende på antalet löften"
    });

    try {
      const { data, error } = await supabase.functions.invoke('analyze-measurability', {
        body: { reanalyze }
      });
      if (error) throw error;
      toast({ title: "✅ Analys klar!", description: `${data.analyzed} av ${data.total} löften analyserade` });
    } catch (error) {
      const msg = await extractFunctionError(error);
      console.error('analyze-measurability error:', error);
      toast({ title: "❌ Fel vid analys", description: msg, variant: "destructive" });
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

          {/* Community Suggestions Review */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Medborgarförslag (≥2 röster)</h2>
            {loadingSuggestions ? (
              <p className="text-muted-foreground">Laddar förslag...</p>
            ) : suggestions.length === 0 ? (
              <p className="text-muted-foreground">
                Inga förslag att granska just nu.
              </p>
            ) : (
              <div className="space-y-4">
                {suggestions.map((s) => (
                  <Card key={s.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {s.party_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Nuvarande:
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {STATUS_CONFIG[s.current_status as PromiseStatus]
                              ?.label || s.current_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            →
                          </span>
                          <Badge className="text-xs bg-primary text-primary-foreground">
                            {STATUS_CONFIG[s.suggested_status as PromiseStatus]
                              ?.label || s.suggested_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            👍 {s.upvotes} 👎 {s.downvotes}
                          </span>
                        </div>
                        <p className="text-sm text-foreground font-medium">
                          {s.promise_text}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {s.explanation}
                        </p>
                        {s.sources && s.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {s.sources.map((src, i) => (
                              <a
                                key={i}
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                {(() => {
                                  try {
                                    return new URL(src).hostname;
                                  } catch {
                                    return src;
                                  }
                                })()}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApply(s)}
                          className="gap-1"
                        >
                          <Check className="w-3 h-3" /> Tillämpa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismiss(s.id)}
                          className="gap-1"
                        >
                          <X className="w-3 h-3" /> Avfärda
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
