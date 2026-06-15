// Self-contained HTML fallback shown when SSR catastrophically fails. Must
// not import any app code — if it did, the same module-init failure that
// triggered the wrapper could also break the error page.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Något gick fel – Infriat</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: hsl(210, 20%, 10%); color: hsl(0, 0%, 95%); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
      main { max-width: 28rem; text-align: center; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
      p { color: hsl(0, 0%, 70%); line-height: 1.6; margin: 0 0 1.5rem; }
      .row { display: flex; gap: 0.75rem; justify-content: center; }
      button, a { font: inherit; background: hsl(207, 100%, 45%); color: white; border: 0; padding: 0.65rem 1.1rem; border-radius: 0.5rem; cursor: pointer; text-decoration: none; }
      a.secondary { background: transparent; border: 1px solid hsl(0, 0%, 30%); color: inherit; }
    </style>
  </head>
  <body>
    <main>
      <h1>Något gick fel</h1>
      <p>Vi kunde inte ladda sidan just nu. Försök igen om en stund.</p>
      <div class="row">
        <button onclick="location.reload()">Försök igen</button>
        <a class="secondary" href="/">Till startsidan</a>
      </div>
    </main>
  </body>
</html>`;
}
