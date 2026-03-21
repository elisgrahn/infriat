import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PromptLog {
  id: string;
  edge_function: string;
  promise_id: string | null;
  model: string;
  prompt: string;
  response_raw: string | null;
  grounding_search: boolean;
  duration_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export function AiPromptLogs() {
  const [logs, setLogs] = useState<PromptLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_prompt_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!error && data) {
      setLogs(data as PromptLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI-promptloggar</h2>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          Uppdatera
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Laddar loggar...</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground">Inga loggar ännu.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="overflow-hidden">
              <button
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                {log.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <span className="text-xs text-muted-foreground shrink-0 w-28">
                  {formatDate(log.created_at)}
                </span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {log.edge_function}
                </Badge>
                {log.grounding_search && (
                  <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                    <Search className="w-3 h-3" /> Grounding
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {log.model}
                </span>
                {log.duration_ms && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(log.duration_ms / 1000).toFixed(1)}s
                  </span>
                )}
                {expandedId === log.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {expandedId === log.id && (
                <div className="border-t p-3 space-y-3 bg-muted/30">
                  {log.promise_id && (
                    <p className="text-xs text-muted-foreground">
                      Löfte-ID: <code className="bg-muted px-1 rounded">{log.promise_id}</code>
                    </p>
                  )}
                  {log.error_message && (
                    <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                      {log.error_message}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Prompt</p>
                    <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-words">
                      {log.prompt}
                    </pre>
                  </div>
                  {log.response_raw && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Svar</p>
                      <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-words">
                        {log.response_raw}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
          Föregående
        </Button>
        <span className="text-xs text-muted-foreground self-center">Sida {page + 1}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={logs.length < PAGE_SIZE}>
          Nästa
        </Button>
      </div>
    </div>
  );
}
