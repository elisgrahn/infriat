import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UsePromiseAdminActionsProps {
  promiseId: string;
  status: string;
  directQuote?: string;
  manifestPdfUrl?: string;
  measurabilityScore?: number;
  onStatusUpdate?: () => void;
}

export function usePromiseAdminActions({
  promiseId,
  status,
  directQuote,
  manifestPdfUrl,
  measurabilityScore,
  onStatusUpdate,
}: UsePromiseAdminActionsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingMeasurability, setIsAnalyzingMeasurability] = useState(false);
  const [isReanalyzingPage, setIsReanalyzingPage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-promise-status", {
        body: { promiseId },
      });
      if (error) throw error;
      toast.success("Status analyserad!");
      onStatusUpdate?.();
    } catch {
      toast.error("Kunde inte analysera status");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeMeasurability = async () => {
    setIsAnalyzingMeasurability(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-single-measurability",
        { body: { promiseId } }
      );
      if (error) throw error;
      toast.success(`Mätbarhet analyserad: ${data.score}/5`);
      onStatusUpdate?.();
    } catch {
      toast.error("Kunde inte analysera mätbarhet");
    } finally {
      setIsAnalyzingMeasurability(false);
    }
  };

  const handleReanalyzePage = async () => {
    if (!manifestPdfUrl || !directQuote) return;
    setIsReanalyzingPage(true);

    try {
      const pdfjs = await import("pdfjs-dist");
      const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

      const pdf = await pdfjs.getDocument(manifestPdfUrl).promise;

      const normalizeText = (text: string) =>
        text
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/- /g, "")
          .replace(/\n/g, " ")
          .replace(/\[\.\.\.]/g, "")
          .replace(/…/g, "")
          .trim();

      const normalizedQuote = normalizeText(directQuote);
      let foundPage: number | null = null;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => (item as { str?: string }).str ?? "")
          .join(" ");
        const normalizedPageText = normalizeText(pageText);

        if (normalizedPageText.includes(normalizedQuote)) {
          foundPage = i;
          break;
        }

        if (normalizedQuote.length > 30) {
          const words = normalizedQuote.split(" ").filter((w) => w.length > 0);
          const matchedWords = words.filter(
            (word) => word.length > 2 && normalizedPageText.includes(word)
          );
          if (matchedWords.length >= Math.floor(words.length * 0.7)) {
            foundPage = i;
            break;
          }
          if (matchedWords.length >= Math.floor(words.length * 0.6)) {
            foundPage = i;
            break;
          }
        }
      }

      const { error } = await supabase
        .from("promises")
        .update({ page_number: foundPage })
        .eq("id", promiseId);
      if (error) throw error;

      if (foundPage) {
        toast.success(`Citatet hittades på sida ${foundPage}!`);
      } else {
        toast.success("Citatet kunde inte hittas i PDF:en. Sidnummer rensades.");
      }
      onStatusUpdate?.();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Okänt fel";
      toast.error(`Kunde inte söka i PDF: ${msg}`);
    } finally {
      setIsReanalyzingPage(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("promises")
        .delete()
        .eq("id", promiseId);
      if (error) throw error;
      toast.success("Vallöfte raderat!");
      onStatusUpdate?.();
    } catch {
      toast.error("Kunde inte radera vallöfte");
      setIsDeleting(false);
    }
  };

  return {
    isAnalyzing,
    isAnalyzingMeasurability,
    isReanalyzingPage,
    isDeleting,
    handleAnalyze,
    handleAnalyzeMeasurability,
    handleReanalyzePage,
    handleDelete,
  };
}
