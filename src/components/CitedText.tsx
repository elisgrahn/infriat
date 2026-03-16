import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Source {
  url: string;
  title: string | null;
}

interface CitedTextProps {
  /** Text containing [n] citation markers, e.g. "Sweden increased spending[1] on defense[2]." */
  text: string;
  /** Ordered source list – index 0 maps to [1], etc. */
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
 * Renders text with inline [n] citation markers as clickable superscript links.
 * Falls back to plain text if no markers or sources are present.
 */
export function CitedText({ text, sources, className }: CitedTextProps) {
  if (!text) return null;

  // Split text on citation markers like [1], [2][3], etc.
  const parts = text.split(/(\[\d+\])/g);

  if (parts.length <= 1 || sources.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <span className={className}>
        {parts.map((part, i) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (!match) return <span key={i}>{part}</span>;

          const sourceIndex = parseInt(match[1], 10) - 1;
          const source = sources[sourceIndex];

          if (!source) {
            return (
              <sup key={i} className="text-muted-foreground text-[10px]">
                {part}
              </sup>
            );
          }

          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:text-primary/80 no-underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <sup className="text-[10px] font-semibold bg-primary/10 rounded px-0.5 hover:bg-primary/20 transition-colors">
                    {match[1]}
                  </sup>
                </a>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium line-clamp-2">
                    {source.title || getHostname(source.url)}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="w-2.5 h-2.5" />
                    {getHostname(source.url)}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    </TooltipProvider>
  );
}
