import { DisclaimerItem } from "@/components/DisclaimerItem";
import { Link } from "react-router-dom";

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
            <DisclaimerItem />
            <div className="flex gap-4 pt-1">
              <Link to="/statistik" className="text-primary hover:underline">Statistik</Link>
              <Link to="/om" className="text-primary hover:underline">Metod & förklaringar</Link>
            </div>
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

          {/* Contribute */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Bidra</h3>
            <p>
              Infriat drivs ideellt. Stöd projektet ekonomiskt via Swish eller
              bidra med kod på GitHub.
            </p>
            <p className="text-xs italic">Swish-nummer läggs till snart.</p>
            <a
              href="https://github.com/elisgrahn/infriat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
            >
              GitHub — öppen källkod (AGPL v3)
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Elis Grahn. Alla rättigheter förbehållna.
        </div>
      </div>
    </footer>
  );
}
