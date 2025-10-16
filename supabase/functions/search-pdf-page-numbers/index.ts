import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

// Configure PDF.js worker for Deno environment
pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.worker.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { partyAbbreviation, electionYear, pdfFileName } = await req.json();

    if (!partyAbbreviation || !electionYear || !pdfFileName) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Searching for page numbers in ${pdfFileName} for ${partyAbbreviation} ${electionYear}`);

    // Get party ID
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id')
      .eq('abbreviation', partyAbbreviation)
      .maybeSingle();

    if (partyError || !party) {
      console.error('Party not found:', partyAbbreviation, partyError);
      return new Response(JSON.stringify({ error: 'Party not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all promises for this party and year
    const { data: promises, error: promisesError } = await supabase
      .from('promises')
      .select('id, direct_quote')
      .eq('party_id', party.id)
      .eq('election_year', electionYear)
      .not('direct_quote', 'is', null);

    if (promisesError) {
      console.error('Error fetching promises:', promisesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch promises' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!promises || promises.length === 0) {
      console.log('No promises with direct quotes found');
      return new Response(JSON.stringify({ updated: 0, total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${promises.length} promises with direct quotes`);

    // Download PDF from storage using service role (has access to private buckets)
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('manifests')
      .download(pdfFileName);

    if (downloadError || !pdfData) {
      console.error('Error downloading PDF:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download PDF from storage' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('PDF downloaded successfully, parsing...');

    // Convert blob to ArrayBuffer
    const pdfArrayBuffer = await pdfData.arrayBuffer();
    const pdfUint8Array = new Uint8Array(pdfArrayBuffer);

    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: pdfUint8Array });
    const pdf = await loadingTask.promise;
    
    console.log(`PDF loaded: ${pdf.numPages} pages`);

    // Helper function to normalize text for comparison
    function normalizeText(text: string): string {
      return text
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .trim();
    }

    // Helper function to find best match for longer quotes
    function fuzzyMatch(quote: string, text: string, threshold = 0.8): boolean {
      const normalizedQuote = normalizeText(quote);
      const normalizedText = normalizeText(text);
      
      // For longer quotes, allow some flexibility
      if (normalizedQuote.length > 100) {
        const words = normalizedQuote.split(' ');
        const firstPart = words.slice(0, Math.min(15, words.length)).join(' ');
        const lastPart = words.slice(-Math.min(10, words.length)).join(' ');
        
        return normalizedText.includes(firstPart) || normalizedText.includes(lastPart);
      }
      
      return normalizedText.includes(normalizedQuote);
    }

    let updatedCount = 0;

    // Search each promise's quote in the PDF
    for (const promise of promises) {
      const quote = promise.direct_quote;
      if (!quote) continue;

      let foundPage = null;

      // Search through all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        if (fuzzyMatch(quote, pageText)) {
          foundPage = pageNum;
          break;
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
          console.log(`Updated promise ${promise.id} with page ${foundPage}`);
        } else {
          console.error(`Failed to update promise ${promise.id}:`, updateError);
        }
      }
    }

    console.log(`Updated ${updatedCount} of ${promises.length} promises with page numbers`);

    return new Response(
      JSON.stringify({ 
        updated: updatedCount, 
        total: promises.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in search-pdf-page-numbers:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        updated: 0,
        total: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
