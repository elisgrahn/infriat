import {
  type ReactElement,
  type ComponentType,
  cloneElement,
  isValidElement,
} from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Maximize2, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { InfriatLogo } from "@/components/icons/InfriatLogo";
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
      <Tooltip>
        <TooltipTrigger asChild>{interactiveChild}</TooltipTrigger>
        <TooltipContent className="max-w-xs p-0 border-none bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-shadow" onClick={(e) => e.stopPropagation()}>
          <Item variant="outline" size="xs">
            <ItemMedia variant="icon">
              <Icon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{current?.label}</ItemTitle>
              <ItemDescription>
                {current?.description}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button 
                size="icon" 
                variant="ghost" className="size-8 rounded-full" 
                onClick={() => navigate(`/om#${sectionAnchor}`)}
              >
                <Maximize2 />
              </Button>
            </ItemActions>
          </Item>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
