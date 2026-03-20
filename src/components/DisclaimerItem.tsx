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

export function DisclaimerItem() {
  return (
    <Item
      variant="outline"
      size="xs"
      className="border-warning/20 bg-warning/10"
    >
      <ItemMedia variant="icon">
        <AlertTriangleIcon className="text-warning" />
      </ItemMedia>
      <ItemContent>
        <ItemDescription>
          Analys av löften görs av AI och kan innehålla felaktigheter.
          Kontrollera alltid mot de angivna källorna.
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
