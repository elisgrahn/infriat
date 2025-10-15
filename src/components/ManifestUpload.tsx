import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import * as pdfjsLib from "pdfjs-dist";

const manifestSchema = z.object({
  partyAbbreviation: z.string().min(1).max(3),
  electionYear: z.number().int().min(2000).max(2030)
});

const PARTIES = [
  { name: "Moderaterna", abbr: "M" },
  { name: "Socialdemokraterna", abbr: "S" },
  { name: "Sverigedemokraterna", abbr: "SD" },
  { name: "Centerpartiet", abbr: "C" },
  { name: "Vänsterpartiet", abbr: "V" },
  { name: "Kristdemokraterna", abbr: "KD" },
  { name: "Liberalerna", abbr: "L" },
  { name: "Miljöpartiet", abbr: "MP" }
];

const ELECTION_YEARS = ["2026", "2022", "2018", "2014"];

export const ManifestUpload = () => {
  const [txtUrl, setTxtUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedParty, setSelectedParty] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Helper to ensure URL has protocol
  const ensureProtocol = (url: string) => {
    if (!url) return url;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  // Function to search PDF and update page numbers
  const searchPdfForPageNumbers = async (pdfUrl: string, partyId: string, electionYear: number) => {
    try {
      // Fetch promises without page numbers
      const { data: promises, error: fetchError } = await supabase
        .from('promises')
        .select('id, direct_quote')
        .eq('party_id', partyId)
        .eq('election_year', electionYear);

      if (fetchError || !promises || promises.length === 0) {
        console.log('No promises to update');
        return { updated: 0, total: 0 };
      }

      // Configure PDF.js worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      // Load PDF
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      // Normalize text function
      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/- /g, '')
          .replace(/\n/g, ' ')
          .replace(/\[\.\.\.]/g, '') // Remove [...] markers
          .replace(/…/g, '') // Remove ellipsis
          .trim();
      };

      // Extract all page texts
      const pageTexts: Array<{pageNum: number, normalized: string}> = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        pageTexts.push({ 
          pageNum: i, 
          normalized: normalizeText(pageText) 
        });
      }

      // Search for each promise
      let updatedCount = 0;
      for (const promise of promises) {
        const normalizedQuote = normalizeText(promise.direct_quote);
        let foundPage = null;

        // Try exact match
        for (const { pageNum, normalized } of pageTexts) {
          if (normalized.includes(normalizedQuote)) {
            foundPage = pageNum;
            break;
          }
        }

        // Try fuzzy match for longer quotes
        if (!foundPage && normalizedQuote.length > 30) {
          const words = normalizedQuote.split(' ').filter(w => w.length > 0);
          
          // Try 70% match first
          let requiredWords = Math.floor(words.length * 0.7);
          
          for (const { pageNum, normalized } of pageTexts) {
            const matchedWords = words.filter(word => 
              word.length > 2 && normalized.includes(word)
            );
            
            if (matchedWords.length >= requiredWords) {
              foundPage = pageNum;
              break;
            }
          }
          
          // If still not found, try even more relaxed (60%)
          if (!foundPage) {
            requiredWords = Math.floor(words.length * 0.6);
            
            for (const { pageNum, normalized } of pageTexts) {
              const matchedWords = words.filter(word => 
                word.length > 2 && normalized.includes(word)
              );
              
              if (matchedWords.length >= requiredWords) {
                foundPage = pageNum;
                break;
              }
            }
          }
        }

        // Update promise with page number if found
        if (foundPage) {
          const { error: updateError } = await supabase
            .from('promises')
            .update({ page_number: foundPage })
            .eq('id', promise.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      return { updated: updatedCount, total: promises.length };
    } catch (error) {
      console.error('Error searching PDF:', error);
      throw error;
    }
  };

  const handleAnalyze = async () => {
    // Validate that we have either URLs or files
    const hasTxt = txtUrl || txtFile;
    const hasPdf = pdfUrl || pdfFile;
    
    // Either TXT or PDF is required, not both mandatory
    if (!selectedParty || !selectedYear || (!hasTxt && !hasPdf)) {
      toast({
        title: "Saknade uppgifter",
        description: "Ange TXT (för fullständig analys) eller PDF (för att lägga till sidnummer) samt parti och år",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Show initial progress toast
    toast({
      title: "Startar analys...",
      description: "Förbereder filer för uppladdning"
    });
    
    try {
      // Validate party and year
      manifestSchema.parse({
        partyAbbreviation: selectedParty,
        electionYear: parseInt(selectedYear)
      });

      // Prepare data for edge function
      let manifestText = "";
      let pdfBase64 = "";

      // Get TXT content
      if (txtFile) {
        manifestText = await txtFile.text();
      } else if (txtUrl) {
        // Let edge function download it to avoid CORS issues
        manifestText = "";
      }

      // Get PDF as base64
      if (pdfFile) {
        const buffer = await pdfFile.arrayBuffer();
        pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      }

      // Show upload progress
      toast({
        title: "Laddar upp filer...",
        description: hasPdf ? "Laddar upp manifest till servern" : "Förbereder textfil"
      });

      // Send to edge function for analysis (it will handle URL downloads and PDF upload)
      // Ensure URLs have protocol
      const finalTxtUrl = txtUrl ? ensureProtocol(txtUrl) : undefined;
      const finalPdfUrl = pdfUrl ? ensureProtocol(pdfUrl) : undefined;

      // Show AI analysis toast after a delay
      const analysisToastTimer = setTimeout(() => {
        toast({
          title: "Analyserar manifest med AI...",
          description: "Detta kan ta 1-2 minuter för stora manifest"
        });
      }, 3000);

      // Show warning if it takes too long
      const warningToastTimer = setTimeout(() => {
        toast({
          title: "Analysen tar längre tid än förväntat...",
          description: "Stora manifest kan ta upp till 5 minuter. Vänligen ha tålamod.",
          variant: "default"
        });
      }, 30000);

      let data, error;
      try {
        const result = await supabase.functions.invoke('analyze-manifest', {
          body: {
            manifestText: manifestText || undefined,
            txtUrl: finalTxtUrl,
            pdfBase64: pdfBase64 || undefined,
            pdfUrl: finalPdfUrl,
            partyAbbreviation: selectedParty,
            electionYear: parseInt(selectedYear)
          }
        });
        data = result.data;
        error = result.error;
      } finally {
        clearTimeout(analysisToastTimer);
        clearTimeout(warningToastTimer);
      }

      if (error) {
        console.error('Edge function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Better error messages based on error type
        let errorMessage = 'Kunde inte analysera manifestet';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // Special handling for network errors
        if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Nätverksfel: Edge-funktionen svarade inte. Detta kan bero på timeout (manifestet är för stort) eller nätverksproblem. Försök med ett kortare manifest.';
        }
        
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('Ingen data returnerades från analysen');
      }

      console.log('Analysis response:', data);

      let toastMessage = data.message || `${data.count} vallöften ${data.pdfOnly ? 'uppdaterade' : 'extraherade och sparade'}.`;
      
      if (data.warnings?.unverifiedQuotes?.length > 0) {
        toastMessage += `\n\n⚠️ Varning: ${data.warnings.unverifiedQuotes.length} citat kunde inte verifieras i PDF:en.`;
      }

      if (data.duplicatesRemoved) {
        toastMessage += `\n\n${data.duplicatesRemoved} befintliga löften raderades.`;
      }

      toast({
        title: "✅ Analys klar!",
        description: toastMessage,
        variant: data.warnings ? "default" : "default"
      });

      // Automatically search for page numbers if we have a PDF URL
      const pdfUrlToSearch = data.pdfUrl || data.promises?.[0]?.manifest_pdf_url;
      
      if (pdfUrlToSearch && selectedParty && selectedYear) {
        toast({
          title: "🔍 Söker efter sidnummer i PDF...",
          description: "Detta kan ta 1-3 minuter beroende på PDF-storlek",
        });

        try {
          // Get party ID
          const { data: party } = await supabase
            .from('parties')
            .select('id')
            .eq('abbreviation', selectedParty)
            .single();

          if (party) {
            const result = await searchPdfForPageNumbers(
              pdfUrlToSearch, 
              party.id, 
              parseInt(selectedYear)
            );

            toast({
              title: "✅ Sidnummer uppdaterade!",
              description: `${result.updated} av ${result.total} löften fick sidnummer`,
            });
          }
        } catch (pdfError) {
          console.error('PDF search error:', pdfError);
          console.error('PDF error stack:', pdfError);
          toast({
            title: "⚠️ Kunde inte söka i PDF",
            description: pdfError instanceof Error ? pdfError.message : "Okänt fel vid PDF-sökning",
            variant: "destructive"
          });
        }
      }

      // Reset form
      setTxtUrl("");
      setPdfUrl("");
      setTxtFile(null);
      setPdfFile(null);
      setSelectedParty("");
      setSelectedYear("");
    } catch (error: any) {
      console.error('Analysis error:', error);
      console.error('Error stack:', error?.stack);
      
      let errorMessage = "Kunde inte analysera manifestet";
      let errorTitle = "❌ Fel vid analys";
      
      if (error instanceof z.ZodError) {
        errorMessage = error.errors[0].message;
      } else if (error?.message) {
        errorMessage = error.message;
        
        // Specific error messages
        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          errorTitle = "⏱️ Timeout";
          errorMessage = `AI-analysen tog för lång tid. Försök med: 1) Ett kortare manifest, 2) Dela upp i flera delar, 3) Vänta en stund och försök igen.`;
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorTitle = "⚠️ Rate limit";
          errorMessage = "För många förfrågningar. Vänta några minuter och försök igen.";
        } else if (error.message.includes('credits') || error.message.includes('402')) {
          errorTitle = "💰 Slut på AI-krediter";
          errorMessage = "Lägg till mer credits i din Lovable workspace för att fortsätta använda AI-analysen.";
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Ladda upp valmanifest
        </CardTitle>
        <CardDescription>
          Ladda upp TXT för fullständig analys, eller bara PDF för att lägga till sidnummer till befintliga löften
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Parti</label>
            <Select value={selectedParty} onValueChange={setSelectedParty}>
              <SelectTrigger>
                <SelectValue placeholder="Välj parti" />
              </SelectTrigger>
              <SelectContent>
                {PARTIES.map(party => (
                  <SelectItem key={party.abbr} value={party.abbr}>
                    {party.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Valår</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Välj år" />
              </SelectTrigger>
              <SelectContent>
                {ELECTION_YEARS.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            TXT-manifest (för analys)
          </h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">URL till TXT</label>
            <Input
              type="url"
              placeholder="https://exempel.se/manifest.txt"
              value={txtUrl}
              onChange={(e) => {
                setTxtUrl(e.target.value);
                if (e.target.value) setTxtFile(null);
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>ELLER</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ladda upp TXT-fil</label>
            <Input
              type="file"
              accept=".txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setTxtFile(file);
                  setTxtUrl("");
                }
              }}
            />
            {txtFile && (
              <p className="text-xs text-muted-foreground">Vald fil: {txtFile.name}</p>
            )}
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" />
            PDF-manifest (för källhänvisning)
          </h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">URL till PDF</label>
            <Input
              type="url"
              placeholder="https://exempel.se/manifest.pdf"
              value={pdfUrl}
              onChange={(e) => {
                setPdfUrl(e.target.value);
                if (e.target.value) setPdfFile(null);
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>ELLER</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ladda upp PDF-fil</label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPdfFile(file);
                  setPdfUrl("");
                }
              }}
            />
            {pdfFile && (
              <p className="text-xs text-muted-foreground">Vald fil: {pdfFile.name}</p>
            )}
          </div>
        </div>

        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyserar och laddar upp...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Analysera och spara manifest
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};