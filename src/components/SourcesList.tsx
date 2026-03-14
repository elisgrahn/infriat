import { useState, useEffect } from "react";
import { ExternalLink, Plus, X, Globe, Newspaper, BookOpen, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SourceType = 'news' | 'official' | 'research' | 'other';

interface PromiseSource {
  id: string;
  promise_id: string;
  url: string;
  title: string | null;
  published_date: string | null;
  description: string | null;
  source_type: SourceType;
  created_at: string;
}

interface SourcesListProps {
  promiseId: string;
  isAdmin: boolean;
}

const sourceTypeConfig: Record<SourceType, { label: string; icon: React.ReactNode; className: string }> = {
  news: { label: 'Nyheter', icon: <Newspaper className="w-3 h-3" />, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  official: { label: 'Officiell', icon: <Building2 className="w-3 h-3" />, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  research: { label: 'Forskning', icon: <BookOpen className="w-3 h-3" />, className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  other: { label: 'Övrigt', icon: <Globe className="w-3 h-3" />, className: 'bg-muted text-muted-foreground' },
};

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const SourcesList = ({ promiseId, isAdmin }: SourcesListProps) => {
  const [sources, setSources] = useState<PromiseSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<SourceType>('other');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchSources();
  }, [promiseId]);

  const fetchSources = async () => {
    const { data, error } = await supabase
      .from('promise_sources')
      .select('*')
      .eq('promise_id', promiseId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSources(data as unknown as PromiseSource[]);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    try {
      let hostname = '';
      try { hostname = new URL(newUrl.trim()).hostname; } catch { /* ignore */ }
      
      const { error } = await supabase
        .from('promise_sources')
        .insert({
          promise_id: promiseId,
          url: newUrl.trim(),
          title: hostname || null,
          source_type: newType as any,
        } as any);

      if (error) throw error;
      toast.success('Källa tillagd');
      setNewUrl('');
      setShowAddForm(false);
      fetchSources();
    } catch {
      toast.error('Kunde inte lägga till källa');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (sourceId: string) => {
    const { error } = await supabase
      .from('promise_sources')
      .delete()
      .eq('id', sourceId);

    if (error) {
      toast.error('Kunde inte ta bort källa');
    } else {
      setSources(prev => prev.filter(s => s.id !== sourceId));
    }
  };

  if (loading) return <p className="text-xs text-muted-foreground">Laddar källor...</p>;
  if (sources.length === 0 && !isAdmin) return null;

  return (
    <div className="space-y-2">
      {sources.map((source) => {
        const config = sourceTypeConfig[source.source_type] || sourceTypeConfig.other;
        const displayTitle = source.title || getHostname(source.url);

        return (
          <div key={source.id} className="flex items-center gap-2 group">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-2 text-sm text-primary hover:underline min-w-0"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{displayTitle}</span>
            </a>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 gap-1 ${config.className}`}>
              {config.icon}
              {config.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
              {getHostname(source.url)}
            </span>
            {source.published_date && (
              <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                {new Date(source.published_date).toLocaleDateString('sv-SE')}
              </span>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => handleRemove(source.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
      })}

      {isAdmin && !showAddForm && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-3 h-3" /> Lägg till källa
        </Button>
      )}

      {isAdmin && showAddForm && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            placeholder="https://..."
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="h-7 text-xs flex-1"
          />
          <Select value={newType} onValueChange={v => setNewType(v as SourceType)}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="news">Nyheter</SelectItem>
              <SelectItem value="official">Officiell</SelectItem>
              <SelectItem value="research">Forskning</SelectItem>
              <SelectItem value="other">Övrigt</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={adding || !newUrl.trim()}>
            {adding ? '...' : 'Lägg till'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>
            Avbryt
          </Button>
        </div>
      )}
    </div>
  );
};
