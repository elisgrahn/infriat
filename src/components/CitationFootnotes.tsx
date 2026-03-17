import { ExternalLink } from "lucide-react";

interface Source {
  url: string;
  title: string | null;
}

interface CitationFootnotesProps {
  sources: Source[];
  className?: string;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Renders a numbered footnote list matching [n] citation markers from CitedText.
 */
export function CitationFootnotes({ sources, className }: CitationFootnotesProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <ol className={`space-y-1.5 text-sm text-muted-foreground ${className ?? ""}`}>
      {sources.map((source, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className="shrink-0 font-semibold text-primary/70 min-w-[1.25rem] text-right">
            {index + 1}.
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline truncate min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">
              {source.title || getHostname(source.url)}
            </span>
            {/* <span className="text-muted-foreground shrink-0">
              — {getHostname(source.url)}
            </span> */}
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
        </li>
      ))}
    </ol>
  );
}
