import { Share2, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "./ui/sonner";

export function ShareButton({ promiseId }: { promiseId: string }) {

  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/og-metadata?id=${promiseId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // toast.success("Länk kopierad!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // toast.error("Kunde inte kopiera länk");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 gap-1.5 text-xs rounded-full"
            onClick={handleShare}
            aria-label={copied ? "Länk kopierad" : "Dela länk"}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            {/* {copied ? "Kopierad!" : "Dela"} */}
          </Button>
          {/* <Button variant="outline" size="icon" onClick={handleShare}>
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </Button> */}
        </TooltipTrigger>
        <TooltipContent>
          <p>Dela länk till detta löfte</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
