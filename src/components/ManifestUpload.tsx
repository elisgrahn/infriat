import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const manifestSchema = z.object({
  manifestText: z.string()
    .trim()
    .min(100, 'Manifesttext måste vara minst 100 tecken')
    .max(50000, 'Manifesttext får vara max 50000 tecken'),
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
  const [manifestText, setManifestText] = useState("");
  const [selectedParty, setSelectedParty] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!manifestText || !selectedParty || !selectedYear) {
      toast({
        title: "Saknade uppgifter",
        description: "Fyll i alla fält innan analys",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Validate input
      const validated = manifestSchema.parse({
        manifestText,
        partyAbbreviation: selectedParty,
        electionYear: parseInt(selectedYear)
      });

      const { data, error } = await supabase.functions.invoke('analyze-manifest', {
        body: {
          manifestText: validated.manifestText,
          partyAbbreviation: validated.partyAbbreviation,
          electionYear: validated.electionYear
        }
      });

      if (error) throw error;

      toast({
        title: "Analys klar!",
        description: `${data.count} vallöften extraherade och sparade.`
      });

      // Reset form
      setManifestText("");
      setSelectedParty("");
      setSelectedYear("");
    } catch (error: any) {
      const errorMessage = error instanceof z.ZodError 
        ? error.errors[0].message 
        : "Kunde inte analysera manifestet";
      
      toast({
        title: "Fel vid analys",
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
          Klistra in text från ett valmanifest för att extrahera och analysera vallöften
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Manifesttext</label>
          <Textarea
            placeholder="Klistra in manifesttexten här..."
            value={manifestText}
            onChange={(e) => setManifestText(e.target.value)}
            className="font-mono text-sm min-h-[400px] max-h-[600px]"
          />
        </div>

        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyserar...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Analysera manifest
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};