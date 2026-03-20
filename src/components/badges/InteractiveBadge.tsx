import { type ReactNode, type ComponentType, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface BadgeVariant {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  colorClass?: string;
}

interface InteractiveBadgeProps {
  children: ReactNode;
  currentKey: string;
  variants: BadgeVariant[];
  sectionAnchor: string;
  popoverTitle: string;
}

export function InteractiveBadge({
  children,
  currentKey,
  variants,
  sectionAnchor,
  popoverTitle,
}: InteractiveBadgeProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const current = variants.find((v) => v.key === currentKey);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                {children}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{current?.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="bottom"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <h4 className="text-sm font-semibold">{popoverTitle}</h4>
          <button
            type="button"
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen(false);
              navigate(`/om#${sectionAnchor}`);
            }}
            aria-label="Visa alla på metodsidan"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-3 pb-3 space-y-1.5">
          {variants.map((v) => {
            const Icon = v.icon;
            const isCurrent = v.key === currentKey;
            return (
              <div
                key={v.key}
                className={cn(
                  "flex items-start gap-2.5 rounded-md p-2 text-xs transition-colors",
                  isCurrent
                    ? "bg-accent/60 ring-1 ring-border"
                    : "opacity-70",
                )}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 gap-1 text-[10px] px-1.5 py-0.5",
                    v.colorClass,
                  )}
                >
                  <Icon className="w-2.5 h-2.5" />
                  {v.label}
                </Badge>
                <p className="leading-relaxed text-muted-foreground">
                  {v.description}
                </p>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
