

## Plan: Cloudflare Worker på huvuddomänen + ShareButton-fix

### Översikt

Två ändringar: (1) Cloudflare Worker på `infriat.se/lofte/*` som proxar crawler-requests till Supabase edge function, (2) ShareButton kopierar snygg URL. Ingen subdomän behövs.

### 1. Skapa `cloudflare-worker/index.js`

```text
Request till infriat.se/lofte/:id
  ↓
User-Agent = crawler?
  ├─ JA → fetch Supabase edge function → returnera OG-HTML
  └─ NEJ → fetch Lovable CDN → returnera SPA som vanligt
```

- **Crawler-detektering**: `facebookexternalhit|Twitterbot|LinkedInBot|Googlebot|bingbot|Slackbot|WhatsApp|TelegramBot|GPTBot|ClaudeBot|PerplexityBot|Discordbot`
- **Crawler-svar**: Fetch `https://turijymricwxtdrslcuz.supabase.co/functions/v1/og-metadata?id={promiseId}` och returnera svaret direkt
- **Människa**: Fetch `https://infriat.lovable.app/lofte/:id` och returnera svaret — transparent proxy, ingen redirect, URL förblir `infriat.se/lofte/:id`
- **Viktigt**: Bygg alltid färska headers (kopiera inte `request.headers`) för att undvika HTTP 421 mot Lovable CDN

### 2. Skapa `cloudflare-worker/wrangler.toml`

```toml
name = "infriat-og-worker"
main = "index.js"
compatibility_date = "2024-01-01"
```

Route `infriat.se/lofte/*` läggs till manuellt i Cloudflare dashboard efter deploy.

### 3. Uppdatera `src/components/ShareButton.tsx`

Byt URL till `https://infriat.se/lofte/${promiseId}`. Ta bort `projectId`-variabeln och Supabase-URL-logiken.

### Filer

| Fil | Ändring |
|---|---|
| `cloudflare-worker/index.js` | Ny — Worker med crawler-detektering och transparent proxy |
| `cloudflare-worker/wrangler.toml` | Ny — Worker-konfiguration |
| `src/components/ShareButton.tsx` | Byt URL till `infriat.se/lofte/:id` |

