import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Upload, Link as LinkIcon, CheckCircle2, XCircle } from "lucide-react";
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
  
  // Job polling state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to ensure URL has protocol
  const ensureProtocol = (url: string) => {
    if (!url) return url;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Start polling for job progress
  const startPolling = (jobId: string) => {
    setActiveJobId(jobId);
    setJobProgress(0);
    setJobStatus('pending');

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data: job, error } = await supabase
          .from('analysis_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error || !job) {
          console.error('Poll error:', error);
          return;
        }

        setJobProgress(job.progress_pct ?? 0);
        setJobStatus(job.status);

        if (job.status === 'completed') {
          stopPolling();
          setIsAnalyzing(false);
          toast.success('Analys klar!', {
            description: `${job.result_count} vallöften extraherade och sparade.`,
          });

          // Run PDF page number search if we have a PDF URL
          await handlePostAnalysisPdfSearch();

          resetForm();
        } else if (job.status === 'failed') {
          stopPolling();
          setIsAnalyzing(false);
          toast.error('❌ Analys misslyckades', {
            description: job.error_message || 'Ett okänt fel uppstod',
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 4000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const resetForm = () => {
    setTxtUrl("");
    setPdfUrl("");
    setTxtFile(null);
    setPdfFile(null);
    setSelectedParty("");
    setSelectedYear("");
    setActiveJobId(null);
    setJobProgress(0);
    setJobStatus(null);
  };

  // Function to search PDF and update page numbers
  const searchPdfForPageNumbers = async (pdfSearchUrl: string, partyId: string, electionYear: number) => {
    try {
      const { data: promises, error: fetchError } = await supabase
        .from('promises')
        .select('id, direct_quote')
        .eq('party_id', partyId)
        .eq('election_year', electionYear);

      if (fetchError || !promises || promises.length === 0) {
        console.log('No promises to update');
        return { updated: 0, total: 0 };
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      const loadingTask = pdfjsLib.getDocument(pdfSearchUrl);
      const pdf = await loadingTask.promise;

      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .replace(/(\w+)-[\r\n\s]+(\w+)/g, '$1$2')
          .replace(/([a-zåäö])[\r\n]+([a-zåäö])/g, '$1$2')
          .replace(/[\r\n]+/g, ' ')
          .replace(/[""]/g, '"')
          .replace(/['']/g, "'")
          .replace(/[–—―]/g, '-')
          .replace(/\[\.\.\.]/g, '')
          .replace(/…/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/^[.,!?;:]+|[.,!?;:]+$/g, '');
      };

      const pageTexts: Array<{pageNum: number, normalized: string}> = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        pageTexts.push({ pageNum: i, normalized: normalizeText(pageText) });
      }

      const fuzzyMatch = (quote: string, pageText: string): boolean => {
        const normalizedQuote = normalizeText(quote);
        const normalizedPage = normalizeText(pageText);
        
        if (normalizedQuote.length < 50) return normalizedPage.includes(normalizedQuote);
        if (normalizedPage.includes(normalizedQuote)) return true;
        
        const sentences = normalizedQuote.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length >= 2) {
          const first = sentences[0].trim();
          const last = sentences[sentences.length - 1].trim();
          if (normalizedPage.includes(first) && normalizedPage.includes(last)) return true;
        }
        
        const words = normalizedQuote.split(/\s+/);
        if (words.length > 20) {
          const firstWords = words.slice(0, 20).join(' ');
          if (normalizedPage.includes(firstWords)) return true;
        }
        if (words.length >= 8) {
          const uniquePhrase = words.slice(0, 8).join(' ');
          if (normalizedPage.includes(uniquePhrase)) return true;
        }
        
        return false;
      };

      let updatedCount = 0;
      for (const promise of promises) {
        const quote = promise.direct_quote;
        let foundPage = null;

        for (const { pageNum, normalized } of pageTexts) {
          if (fuzzyMatch(quote, normalized)) {
            foundPage = pageNum;
            break;
          }
        }

        if (foundPage) {
          const { error: updateError } = await supabase
            .from('promises')
            .update({ page_number: foundPage })
            .eq('id', promise.id);

          if (!updateError) updatedCount++;
        }
      }

      return { updated: updatedCount, total: promises.length };
    } catch (error) {
      console.error('Error searching PDF:', error);
      throw error;
    }
  };

  const handlePostAnalysisPdfSearch = async () => {
    const finalPdfUrl = pdfUrl ? ensureProtocol(pdfUrl) : undefined;
    if (!finalPdfUrl) return;

    try {
      const { data: party } = await supabase
        .from('parties')
        .select('id')
        .eq('abbreviation', selectedParty)
        .single();

      if (!party) return;

      toast.info('Söker efter sidnummer i PDF...', {
        description: 'Detta kan ta 1-3 minuter beroende på PDF-storlek',
      });

      const result = await searchPdfForPageNumbers(finalPdfUrl, party.id, parseInt(selectedYear));

      if (result.updated > 0) {
        toast.success('Sidnummer hittade!', {
          description: `${result.updated} av ${result.total} löften fick sidnummer från PDF:en`,
        });
      } else if (result.total > 0) {
        toast.info('Inga sidnummer hittade', {
          description: `Kunde inte matcha citat i PDF:en (${result.total} löften).`,
        });
      }
    } catch (pdfError) {
      console.error('PDF search error:', pdfError);
      toast.error('Kunde inte söka i PDF', {
        description: pdfError instanceof Error ? pdfError.message : 'Okänt fel vid PDF-sökning',
      });
    }
  };

  const handleAnalyze = async () => {
    const hasTxt = txtUrl || txtFile;
    const hasPdf = pdfUrl || pdfFile;
    
    if (!selectedParty || !selectedYear || (!hasTxt && !hasPdf)) {
      toast.error('Saknade uppgifter', {
        description: 'Ange TXT (för fullständig analys) eller PDF (för att lägga till sidnummer) samt parti och år',
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      manifestSchema.parse({
        partyAbbreviation: selectedParty,
        electionYear: parseInt(selectedYear)
      });

      let manifestText = "";
      let pdfBase64 = "";

      if (txtFile) {
        manifestText = await txtFile.text();
      }

      if (pdfFile) {
        const buffer = await pdfFile.arrayBuffer();
        pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      }

      const finalTxtUrl = txtUrl ? ensureProtocol(txtUrl) : undefined;
      const finalPdfUrl = pdfUrl ? ensureProtocol(pdfUrl) : undefined;

      toast.info('Skickar manifest för analys...', {
        description: 'Skapar analysjobb',
      });

      const { data, error } = await supabase.functions.invoke('analyze-manifest', {
        body: {
          manifestText: manifestText || undefined,
          txtUrl: finalTxtUrl,
          pdfBase64: pdfBase64 || undefined,
          pdfUrl: finalPdfUrl,
          partyAbbreviation: selectedParty,
          electionYear: parseInt(selectedYear)
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Kunde inte starta analysen');
      }

      // PDF-only mode returns directly
      if (data?.pdfOnly) {
        toast.success('Analys klar!', {
          description: data.message,
        });

        if (data.pdfUrl) {
          await handlePostAnalysisPdfSearch();
        }

        resetForm();
        setIsAnalyzing(false);
        return;
      }

      // Async job mode: start polling
      if (data?.jobId) {
        toast.success('Analysjobb startat!', {
          description: 'AI-analysen körs i bakgrunden. Du kan följa progressen nedan.',
        });
        startPolling(data.jobId);
        return; // Keep isAnalyzing true, polling will reset it
      }

      // Unexpected response
      throw new Error('Oväntat svar från servern');

    } catch (error: any) {
      console.error('Analysis error:', error);
      setIsAnalyzing(false);
      
      let errorMessage = "Kunde inte analysera manifestet";
      let errorTitle = "❌ Fel vid analys";
      
      if (error instanceof z.ZodError) {
        errorMessage = error.errors[0].message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorTitle, { description: errorMessage });
    }
  };

  const isJobActive = activeJobId && (jobStatus === 'pending' || jobStatus === 'processing');

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
        {/* Job progress indicator */}
        {activeJobId && (
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                {jobStatus === 'completed' ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /> Analys klar</>
                ) : jobStatus === 'failed' ? (
                  <><XCircle className="w-4 h-4 text-destructive" /> Analys misslyckades</>
                ) : (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyserar manifest...</>
                )}
              </span>
              <span className="text-muted-foreground">{jobProgress}%</span>
            </div>
            <Progress value={jobProgress} className="h-2" />
            {jobStatus === 'processing' && (
              <p className="text-xs text-muted-foreground">
                AI-analysen körs i bakgrunden. Du kan stänga sidan — jobbet fortsätter.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Parti</label>
            <Select value={selectedParty} onValueChange={setSelectedParty} disabled={!!isJobActive}>
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
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!!isJobActive}>
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
              disabled={!!isJobActive}
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
              disabled={!!isJobActive}
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
              disabled={!!isJobActive}
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
              disabled={!!isJobActive}
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
          disabled={isAnalyzing || !!isJobActive}
          className="w-full"
        >
          {isJobActive ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analys pågår...
            </>
          ) : isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Startar analys...
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
