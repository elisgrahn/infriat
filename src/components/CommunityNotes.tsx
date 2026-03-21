import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbsUp, ThumbsDown, MessageSquare, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/badgeConfig";

interface Suggestion {
  id: string;
  promise_id: string;
  user_id: string;
  suggested_status: PromiseStatus;
  explanation: string;
  sources: string[] | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

interface UserVote {
  suggestion_id: string;
  vote_type: string;
}


interface CommunityNotesProps {
  promiseId: string;
}

export const CommunityNotes = ({ promiseId }: CommunityNotesProps) => {
  const { user, isAdmin } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [userVotes, setUserVotes] = useState<UserVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formStatus, setFormStatus] = useState<PromiseStatus>('ej-infriat');
  const [formExplanation, setFormExplanation] = useState('');
  const [formSources, setFormSources] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, [promiseId]);

  useEffect(() => {
    if (user) fetchUserVotes();
  }, [user, suggestions]);

  const fetchSuggestions = async () => {
    const { data, error } = await supabase
      .from('status_suggestions')
      .select('*')
      .eq('promise_id', promiseId)
      .order('upvotes', { ascending: false });

    if (!error && data) {
      setSuggestions(data as Suggestion[]);
    }
    setLoading(false);
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id, vote_type')
      .eq('user_id', user.id);

    if (data) setUserVotes(data);
  };

  const handleVote = async (suggestionId: string, voteType: 'up' | 'down') => {
    if (!user) {
      toast.error('Du måste vara inloggad för att rösta');
      return;
    }

    const existingVote = userVotes.find(v => v.suggestion_id === suggestionId);

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote — trigger recomputes counts
        await supabase.from('suggestion_votes').delete()
          .eq('suggestion_id', suggestionId)
          .eq('user_id', user.id);
      } else {
        // Change vote — trigger recomputes counts
        await supabase.from('suggestion_votes').update({ vote_type: voteType })
          .eq('suggestion_id', suggestionId)
          .eq('user_id', user.id);
      }
    } else {
      // New vote — trigger recomputes counts
      await supabase.from('suggestion_votes').insert({
        suggestion_id: suggestionId,
        user_id: user.id,
        vote_type: voteType,
      });
    }

    fetchSuggestions();
    fetchUserVotes();
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user || !formExplanation.trim()) return;
    setSubmitting(true);

    try {
      const cleanSources = formSources.filter(s => s.trim()).filter(s => isValidUrl(s));
      const { error } = await supabase.from('status_suggestions').insert({
        promise_id: promiseId,
        user_id: user.id,
        suggested_status: formStatus,
        explanation: formExplanation.trim(),
        sources: cleanSources.length > 0 ? cleanSources : null,
      });

      if (error) throw error;
      toast.success('Tack för ditt förslag!');
      setFormExplanation('');
      setFormSources(['']);
      setShowForm(false);
      fetchSuggestions();
    } catch {
      toast.error('Kunde inte skicka förslag');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">
          Medborgarförslag {suggestions.length > 0 && `(${suggestions.length})`}
        </h4>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion) => {
            const userVote = userVotes.find(
              (v) => v.suggestion_id === suggestion.id,
            );
            return (
              <div
                key={suggestion.id}
                className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={
                      STATUS_CONFIG[
                        suggestion.suggested_status as PromiseStatus
                      ]?.badgeClassName || "bg-muted text-muted-foreground"
                    }
                  >
                    {STATUS_CONFIG[suggestion.suggested_status as PromiseStatus]
                      ?.label || suggestion.suggested_status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(suggestion.created_at).toLocaleDateString(
                      "sv-SE",
                    )}
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  {suggestion.explanation}
                </p>
                {suggestion.sources && suggestion.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {suggestion.sources.filter(src => isValidUrl(src)).map((src, i) => (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline"
                      >
                        {new URL(src).hostname}
                      </a>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-6 text-xs gap-1", userVote?.vote_type === "up" && "text-emerald-600")}
                    onClick={() => handleVote(suggestion.id, "up")}
                  >
                    <ThumbsUp className="w-3 h-3" /> {suggestion.upvotes}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-6 text-xs gap-1", userVote?.vote_type === "down" && "text-rose-600")}
                    onClick={() => handleVote(suggestion.id, "down")}
                  >
                    <ThumbsDown className="w-3 h-3" /> {suggestion.downvotes}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form for logged-in non-admin users */}
      {user && !isAdmin && !showForm && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-3 h-3" /> Föreslå en korrigering
        </Button>
      )}

      {user && !isAdmin && showForm && (
        <div className="space-y-3 bg-muted/20 rounded-lg p-3 border border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Föreslå ny status</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowForm(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <Select
            value={formStatus}
            onValueChange={(v) => setFormStatus(v as PromiseStatus)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(STATUS_CONFIG) as [
                  PromiseStatus,
                  (typeof STATUS_CONFIG)[PromiseStatus],
                ][]
              )
                .filter(([key]) => key !== "pending-analysis")
                .map(([value, cfg]) => (
                  <SelectItem key={value} value={value}>
                    {cfg.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Förklara varför du föreslår denna status..."
            value={formExplanation}
            onChange={(e) => setFormExplanation(e.target.value)}
            className="text-sm min-h-[60px]"
          />
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              Källor (valfritt, max 3)
            </span>
            {formSources.map((src, i) => (
              <div key={i} className="flex gap-1">
                <Input
                  placeholder="https://..."
                  value={src}
                  onChange={(e) => {
                    const updated = [...formSources];
                    updated[i] = e.target.value;
                    setFormSources(updated);
                  }}
                  className="h-7 text-xs"
                />
                {formSources.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() =>
                      setFormSources((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            {formSources.length < 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={() => setFormSources((prev) => [...prev, ""])}
              >
                <Plus className="w-3 h-3" /> Lägg till källa
              </Button>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !formExplanation.trim()}
          >
            {submitting ? "Skickar..." : "Skicka förslag"}
          </Button>
        </div>
      )}

      {!user && (
        <p className="text-xs text-muted-foreground italic">
          <a href="/auth" className="text-primary hover:underline">
            Logga in
          </a>{" "}
          för att föreslå en korrigering
        </p>
      )}
    </div>
  );
};
