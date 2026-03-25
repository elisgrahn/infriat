const CRAWLER_UA = /facebookexternalhit|Twitterbot|LinkedInBot|Googlebot|bingbot|Slackbot|WhatsApp|TelegramBot|GPTBot|ClaudeBot|PerplexityBot|Discordbot/i;
const OG_FUNCTION_BASE = 'https://turijymricwxtdrslcuz.supabase.co/functions/v1/og-metadata';
const ORIGIN = 'https://infriat.lovable.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/lofte\/([^/]+)/);

    if (!match) {
      // Not a /lofte/:id route — proxy everything else to origin
      return proxyToOrigin(url, request);
    }

    const promiseId = match[1];
    const ua = request.headers.get('user-agent') || '';

    if (CRAWLER_UA.test(ua)) {
      // Crawler → fetch OG metadata from edge function
      const ogUrl = `${OG_FUNCTION_BASE}?id=${promiseId}`;
      const ogResponse = await fetch(ogUrl);
      return new Response(ogResponse.body, {
        status: ogResponse.status,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=300',
        },
      });
    }

    // Human → transparent proxy to Lovable CDN
    return proxyToOrigin(url, request);
  },
};

async function proxyToOrigin(url, request) {
  const originUrl = new URL(url.pathname + url.search, ORIGIN);

  // Build fresh headers to avoid HTTP 421 (mismatched Host/SNI)
  const headers = new Headers();
  headers.set('Accept', request.headers.get('Accept') || '*/*');
  headers.set('Accept-Language', request.headers.get('Accept-Language') || 'en');
  const ua = request.headers.get('User-Agent');
  if (ua) headers.set('User-Agent', ua);

  const response = await fetch(originUrl.toString(), {
    method: request.method,
    headers,
    redirect: 'follow',
  });

  // Return response with permissive cache
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('x-frame-options');

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
