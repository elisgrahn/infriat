import {
  type ReactElement,
  type ComponentType,
  cloneElement,
  isValidElement,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { useNavigate } from "react-router-dom";


export interface BadgeVariant {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  badgeClass?: string;
  /** Tailwind border + background tint classes for the tooltip Item */
  itemClass?: string;
}

interface InteractiveBadgeProps {
  children: ReactElement;
  currentKey: string;
  variants: BadgeVariant[];
  sectionAnchor: string;
  popoverTitle: string;
  className?: string;
}

export function InteractiveBadge({
  children,
  currentKey,
  variants,
  sectionAnchor,
  popoverTitle,
  className,
}: InteractiveBadgeProps) {
  const current = variants.find((v) => v.key === currentKey);
  const Icon = current?.icon;

  const navigate = useNavigate();

  // Controlled open state so we can ignore the closes triggered by
  // Radix's built-in onPointerDown/onClick handlers on the trigger,
  // while still closing on pointer-leave or outside clicks.
  const [open, setOpen] = useState(false);
  const closeAllowedRef = useRef(true);

  const handleOpenChange = useCallback((next: boolean) => {
    // Radix fires onOpenChange(false) on pointerDown and onClick on the trigger.
    // We block those by briefly setting a flag in onPointerDown, then allow
    // genuine closes (hover-leave, outside pointer-down, escape key) through.
    if (!next && !closeAllowedRef.current) return;
    setOpen(next);
  }, []);

  // Merge interactive props directly onto the child Badge element
  // so there's no extra wrapper element in the flex chain.
  const interactiveChild = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        role: "button",
        tabIndex: 0,
        className: cn(
          (children.props as Record<string, unknown>).className as
            | string
            | undefined,
          "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        ),
        onPointerDown: (e: React.PointerEvent) => {
          // Block the close that Radix fires synchronously in its own onPointerDown
          closeAllowedRef.current = false;
          requestAnimationFrame(() => { closeAllowedRef.current = true; });
          e.stopPropagation();
        },
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            e.preventDefault();
          }
        }
      })
    : children;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>{interactiveChild}</TooltipTrigger>
        <TooltipContent className="max-w-xs p-0 border-none bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-shadow" onClick={(e) => e.stopPropagation()}>
          <Item
            asChild
            variant="outline"
            size="xs"
            className="cursor-pointer hover:bg-muted/60 focus-visible:ring-2"
          >
            <button
              type="button"
              onClick={() => navigate(`/om#${sectionAnchor}`)}
            >
              <ItemMedia variant="icon">
                <Icon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{current?.label}</ItemTitle>
                <ItemDescription className="line-clamp-2">
                  {current?.description}
                </ItemDescription>
              </ItemContent>
            </button>
          </Item>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
