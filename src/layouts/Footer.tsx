export function Footer() {
  return (
    <footer className="bg-muted mt-20 py-12 border-t">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-muted-foreground">
          {/* About */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Om Infriat</h3>
            <p>
              En plattform för att granska politiska löften och skapa
              transparens i svensk politik.
            </p>
            <p className="text-xs">
              ⚠️ Statusbedömningar genereras med hjälp av AI och kan innehålla
              fel. Verifiera alltid med originalkällorna.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Kontakt</h3>
            <p>
              Frågor eller feedback?{" "}
              <a
                href="mailto:elis@grahn.ai"
                className="text-primary hover:underline"
              >
                elis@grahn.ai
              </a>
            </p>
            <p className="text-xs">
              Denna webbplats använder inga spårningscookies.
            </p>
          </div>

          {/* Support */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Stöd projektet</h3>
            <p>
              Infriat drivs ideellt. Vill du hjälpa till att täcka
              driftkostnader? Swisha valfritt belopp.
            </p>
            <p className="text-xs italic">Swish-nummer läggs till snart.</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Elis Grahn. Byggt med öppenhet och
          ansvarstagande som grund.
        </div>
      </div>
    </footer>
  );
}
