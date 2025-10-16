import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, Users, RefreshCw, ExternalLink, FileText, Clock, Upload, Trash2, Search, Target, Share2, Check, MoreVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { partyColors } from "@/utils/partyColors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


type PromiseStatus = "fulfilled" | "partially-fulfilled" | "in-progress" | "delayed" | "broken" | "unclear" | "pending-analysis";

interface PromiseCardProps {
  promiseId: string;
  promise: string;
  party: string;
  electionYear: number;
  governmentStatus: 'governing' | 'opposition';
  createdAt: string;
  updatedAt: string;
  status: PromiseStatus;
  description?: string;
  statusExplanation?: string;
  statusSources?: string[];
  directQuote?: string;
  pageNumber?: number;
  manifestPdfUrl?: string;
  measurabilityScore?: number;
  onStatusUpdate?: () => void;
}

const statusConfig = {
  fulfilled: {
    label: "Infriat",
    tooltip: "Löftet är helt infriat enligt beskrivning och tidsram",
    variant: "default" as const,
    className: "bg-emerald-700 text-white hover:bg-emerald-800",
    borderColor: "border-l-emerald-700",
  },
  "partially-fulfilled": {
    label: "Delvis infriat",
    tooltip: "Partiet har infriat en del av löftet, men har valt att inte arbeta vidare på det",
    variant: "default" as const,
    className: "bg-emerald-400 text-white hover:bg-emerald-500",
    borderColor: "border-l-emerald-400",
  },
  "in-progress": {
    label: "Pågående",
    tooltip: "Partiet arbetar aktivt med att infria löftet",
    variant: "secondary" as const,
    className: "bg-amber-500 text-white hover:bg-amber-600",
    borderColor: "border-l-amber-500",
  },
  delayed: {
    label: "Försenat",
    tooltip: "Partiet har fortfarande för avsikt att infria löftet, men inte enligt ursprungliga tidsplanen",
    variant: "default" as const,
    className: "bg-rose-400 text-white hover:bg-rose-500",
    borderColor: "border-l-rose-400",
  },
  broken: {
    label: "Brutet",
    tooltip: "Partiet lovade något som de inte kunde hålla",
    variant: "destructive" as const,
    className: "bg-rose-700 text-white hover:bg-rose-800",
    borderColor: "border-l-rose-700",
  },
  unclear: {
    label: "Oklart",
    tooltip: "Det saknas tydligt underlag för att bedöma löftets status",
    variant: "secondary" as const,
    className: "bg-purple-500 text-white hover:bg-purple-600",
    borderColor: "border-l-purple-500",
  },
  "pending-analysis": {
    label: "Under analys",
    tooltip: "Löftets status analyseras för närvarande",
    variant: "secondary" as const,
    className: "bg-muted text-muted-foreground hover:bg-muted/90",
    borderColor: "border-l-muted",
  },
};

export const PromiseCard = ({ promiseId, promise, party, electionYear, governmentStatus, createdAt, updatedAt, status, description, statusExplanation, statusSources, directQuote, pageNumber, manifestPdfUrl, measurabilityScore, onStatusUpdate }: PromiseCardProps) => {
  const config = statusConfig[status];
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingMeasurability, setIsAnalyzingMeasurability] = useState(false);
  const [isReanalyzingPage, setIsReanalyzingPage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isAdmin, loading } = useAuth();

  const handleShare = async () => {
    const url = `${window.location.origin}/?promise=${promiseId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Länk kopierad!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Kunde inte kopiera länk');
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-promise-status', {
        body: { promiseId }
      });

      if (error) throw error;

      toast.success('Status analyserad!');
      onStatusUpdate?.();
    } catch (error) {
      toast.error('Kunde inte analysera status');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeMeasurability = async () => {
    setIsAnalyzingMeasurability(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-single-measurability', {
        body: { promiseId }
      });

      if (error) throw error;

      toast.success(`Mätbarhet analyserad: ${data.score}/5`);
      onStatusUpdate?.();
    } catch (error) {
      toast.error('Kunde inte analysera mätbarhet');
    } finally {
      setIsAnalyzingMeasurability(false);
    }
  };

  const handleReanalyzePage = async () => {
    if (!manifestPdfUrl || !directQuote) return;
    
    setIsReanalyzingPage(true);
    try {
      // Dynamically import PDF.js and worker
      const pdfjs = await import('pdfjs-dist');
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      
      // Configure worker using Vite's import.meta.url
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
      
      // Load PDF
      const loadingTask = pdfjs.getDocument(manifestPdfUrl);
      const pdf = await loadingTask.promise;
      
      // Normalize text by removing extra whitespace, hyphens at line breaks, etc.
      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/- /g, '') // Remove hyphens at line breaks
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/\[\.\.\.]/g, '') // Remove [...] markers
          .replace(/…/g, '') // Remove ellipsis
          .trim();
      };
      
      // Search for quote in all pages
      let foundPage: number | null = null;
      const normalizedQuote = normalizeText(directQuote);
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        const normalizedPageText = normalizeText(pageText);
        
        // Try exact match first
        if (normalizedPageText.includes(normalizedQuote)) {
          foundPage = i;
          break;
        }
        
        // Try fuzzy match for longer quotes
        if (normalizedQuote.length > 30) {
          const words = normalizedQuote.split(' ').filter(w => w.length > 0);
          
          // Try 70% match first
          let requiredWords = Math.floor(words.length * 0.7);
          const matchedWords = words.filter(word => 
            word.length > 2 && normalizedPageText.includes(word)
          );
          
          if (matchedWords.length >= requiredWords) {
            foundPage = i;
            break;
          }
          
          // If still not found on this page, try even more relaxed (60%)
          if (matchedWords.length >= Math.floor(words.length * 0.6)) {
            foundPage = i;
            break;
          }
        }
      }
      
      // Update page_number in database
      const { error } = await supabase
        .from('promises')
        .update({ page_number: foundPage })
        .eq('id', promiseId);
      
      if (error) throw error;
      
      if (foundPage) {
        toast.success(`Citatet hittades på sida ${foundPage}!`);
      } else {
        toast.success('Citatet kunde inte hittas i PDF:en. Sidnummer rensades.');
      }
      
      onStatusUpdate?.();
    } catch (error: any) {
      console.error('PDF search error:', error);
      toast.error(`Kunde inte söka i PDF: ${error.message || 'Okänt fel'}`);
    } finally {
      setIsReanalyzingPage(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('promises')
        .delete()
        .eq('id', promiseId);

      if (error) throw error;

      toast.success('Vallöfte raderat!');
      onStatusUpdate?.();
    } catch (error) {
      toast.error('Kunde inte radera vallöfte');
      setIsDeleting(false);
    }
  };

  return (
    <Card className={`p-6 hover:shadow-lg transition-all duration-300 border-l-4 ${config.borderColor}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={config.className}>
                    {config.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{config.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge className={`gap-1.5 ${partyColors[party]?.replace(/data-\[state=off\][^\s]+ /g, '').replace(/data-\[state=on\][^\s]+ /g, '') || 'bg-muted hover:bg-muted/80 text-white'}`}>
              <Users className="w-3 h-3" />
              {party}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={governmentStatus === 'governing' 
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                      : 'bg-slate-600 text-white border-slate-600 hover:bg-slate-700'
                    }
                  >
                    {governmentStatus === 'governing' ? 'Regering' : 'Opposition'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    {governmentStatus === 'governing' 
                      ? 'Partiet satt i regeringen när detta löfte gavs' 
                      : 'Partiet var i opposition när detta löfte gavs. Oppositionspartier har begränsade möjligheter att genomföra sin politik.'
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {measurabilityScore && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="relative overflow-hidden rounded-md border border-border">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-emerald-500/20"
                        style={{
                          clipPath: `inset(0 ${100 - (measurabilityScore / 5) * 100}% 0 0)`
                        }}
                      />
                      <Badge 
                        variant="outline" 
                        className={`gap-1.5 relative bg-background/80 backdrop-blur-sm border-0 ${
                          measurabilityScore === 5 ? 'text-emerald-600' :
                          measurabilityScore >= 4 ? 'text-emerald-500' :
                          measurabilityScore === 3 ? 'text-amber-500' :
                          measurabilityScore === 2 ? 'text-orange-500' :
                          'text-rose-500'
                        }`}
                      >
                        <Target className="w-3 h-3" />
                        Mätbarhet: {measurabilityScore}/5
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">
                      {measurabilityScore === 5 && "Extremt mätbart - Specifika siffror + tidsram"}
                      {measurabilityScore === 4 && "Mycket mätbart - Konkreta mål eller tidsram"}
                      {measurabilityScore === 3 && "Måttligt mätbart - Tydlig verifierbar åtgärd"}
                      {measurabilityScore === 2 && "Svagt mätbart - Relativa förändringar"}
                      {measurabilityScore === 1 && "Nästan omätbart - Vaga formuleringar"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            </div>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dela länk till detta löfte</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {isAdmin && !loading && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAnalyze} disabled={isAnalyzing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analyserar...' : status === 'pending-analysis' ? 'Analysera status' : 'Analysera om status'}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={handleAnalyzeMeasurability} disabled={isAnalyzingMeasurability}>
                    <Target className={`w-4 h-4 mr-2 ${isAnalyzingMeasurability ? 'animate-spin' : ''}`} />
                    {isAnalyzingMeasurability ? 'Analyserar...' : measurabilityScore ? 'Analysera om mätbarhet' : 'Analysera mätbarhet'}
                  </DropdownMenuItem>
                  
                  {directQuote && manifestPdfUrl && (
                    <DropdownMenuItem onClick={handleReanalyzePage} disabled={isReanalyzingPage}>
                      <Search className={`w-4 h-4 mr-2 ${isReanalyzingPage ? 'animate-spin' : ''}`} />
                      {isReanalyzingPage ? 'Söker...' : 'Hitta sidnummer'}
                    </DropdownMenuItem>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Radera
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Detta kommer permanent radera vallöftet. Denna åtgärd kan inte ångras.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? 'Raderar...' : 'Radera'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
          <h3 className="text-lg font-semibold text-foreground leading-snug">
            {promise}
          </h3>
          
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          )}

          {(directQuote || (statusExplanation && status !== 'pending-analysis') || (statusSources && statusSources.length > 0)) && (
            <Accordion type="single" collapsible className="w-full">
              {directQuote && (
                <AccordionItem value="quote">
                  <AccordionTrigger className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Ursprungligt citat från valmanifest
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-muted/50 border-l-2 border-primary pl-4 py-2 rounded-r space-y-3">
                      <p className="text-sm italic text-foreground">"{directQuote}"</p>
                      {manifestPdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={pageNumber ? `${manifestPdfUrl}#page=${pageNumber}` : manifestPdfUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {pageNumber ? `Öppna i källa (sida ${pageNumber})` : 'Öppna manifest'}
                          </a>
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {statusExplanation && status !== 'pending-analysis' && (
                <AccordionItem value="explanation">
                  <AccordionTrigger className="text-sm font-medium">
                    Statusbedömning
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-foreground">{statusExplanation}</p>
                  </AccordionContent>
                </AccordionItem>
              )}

              {statusSources && statusSources.length > 0 && (
                <AccordionItem value="sources">
                  <AccordionTrigger className="text-sm font-medium">
                    Källor ({statusSources.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {statusSources.map((source, idx) => {
                        let displayText = source;
                        try {
                          const url = new URL(source);
                          displayText = `${url.hostname}${url.pathname.slice(0, 40)}${url.pathname.length > 40 ? '...' : ''}`;
                        } catch {
                          // If not a valid URL, use the source as-is
                          displayText = source.length > 60 ? source.slice(0, 60) + '...' : source;
                        }
                        
                        return (
                          <li key={idx} className="text-sm">
                            <a 
                              href={source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 break-words"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="break-all">{displayText}</span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Valår: {electionYear}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Tillagt: {createdAt}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Uppdaterat: {updatedAt}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
