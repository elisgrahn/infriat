import { AlertTriangleIcon } from "lucide-react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

export function DisclaimerItem({ className, textClass, ...props }: { textClass?: string } & React.ComponentProps<"div">) {
  return (
    <Item
      variant="outline"
      size="xs"
      className={`border-warning/20 bg-warning/10 ${className}`}
      {...props}
    >
      <ItemMedia variant="icon">
        <AlertTriangleIcon className="text-warning" />
      </ItemMedia>
      <ItemContent>
        <ItemDescription className={textClass}>
          Analys av löften görs av AI och kan innehålla felaktigheter.
          Kontrollera mot de angivna källorna.
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
