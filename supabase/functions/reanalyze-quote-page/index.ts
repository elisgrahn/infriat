import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

// Configure PDF.js worker
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

    const { promiseId } = await req.json();
    
    if (!promiseId) {
      throw new Error('Missing promiseId');
    }

    console.log(`Re-analyzing quote page for promise ${promiseId}`);

    // Get promise details
    const { data: promise, error: promiseError } = await supabase
      .from('promises')
      .select('direct_quote, manifest_pdf_url')
      .eq('id', promiseId)
      .single();

    if (promiseError || !promise) {
      throw new Error('Promise not found');
    }

    if (!promise.manifest_pdf_url || !promise.direct_quote) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Inget manifest-PDF eller citat hittades för detta löfte'
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Searching for quote in PDF...');
    
    // Download PDF
    const pdfResponse = await fetch(promise.manifest_pdf_url);
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: pdfArrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`PDF loaded, ${pdf.numPages} pages`);
    
    // Extract all text from PDF with page numbers
    const pageTexts: Array<{pageNum: number, text: string}> = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .toLowerCase();
      pageTexts.push({ pageNum: i, text: pageText });
    }
    
    // Search for the quote
    const quote = promise.direct_quote.toLowerCase().trim();
    let found = false;
    let foundPage = null;
    
    // Try to find the quote in any page
    for (const { pageNum, text } of pageTexts) {
      if (text.includes(quote)) {
        found = true;
        foundPage = pageNum;
        break;
      }
    }
    
    // If exact match not found, try partial match (at least 50% of quote)
    if (!found && quote.length > 50) {
      const words = quote.split(' ');
      const halfLength = Math.floor(words.length / 2);
      const partialQuote = words.slice(0, halfLength).join(' ');
      
      for (const { pageNum, text } of pageTexts) {
        if (text.includes(partialQuote)) {
          found = true;
          foundPage = pageNum;
          console.log(`Partial match found for: "${quote.substring(0, 50)}..." on page ${pageNum}`);
          break;
        }
      }
    }
    
    if (!found) {
      console.warn(`Quote not found in PDF: "${promise.direct_quote.substring(0, 100)}..."`);
    }

    // Update promise with found page number
    const { error: updateError } = await supabase
      .from('promises')
      .update({ page_number: foundPage })
      .eq('id', promiseId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update promise');
    }

    console.log(`Updated promise with page number: ${foundPage || 'null'}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        found,
        pageNumber: foundPage,
        message: found 
          ? `Citatet hittades på sida ${foundPage}`
          : 'Citatet kunde inte hittas i PDF:en'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in reanalyze-quote-page:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
