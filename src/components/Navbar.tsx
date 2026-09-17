import { Settings, LogOut, BarChart3, BookOpen, Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { InfriatLogo } from "@/components/icons/InfriatLogo";
import { useStickyBar } from "@/store/StickyBarContext";
import { cn } from "@/lib/utils";
import { PARTY_ORDER } from "@/lib/partyStats";
import { PARTY_ABBREVIATION_TO_NAME } from "@/utils/partyAbbreviations";
import { getBadgeColor } from "@/utils/partyColors";

export function Navbar() {
  const { isMobileBarStuck } = useStickyBar();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthClick = async () => {
    if (user) {
      await signOut();
    } else {
      navigate("/auth");
    }
  };

  const handleAdminClick = () => {
    navigate("/admin");
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-shadow">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="group flex flex-row items-center gap-2 text-xl font-bold tracking-tight text-foreground hover:text-primary-light dark:hover:text-secondary transition-colors"
        >
          <InfriatLogo className="size-6" />
          Infriat.se
        </button>

        {/* Nav links + actions */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Partier"
                className={cn(
                  "text-xs px-2",
                  location.pathname.startsWith("/parti") && "text-primary",
                )}
              >
                <Users data-icon="inline-start" />
                <span className="hidden sm:inline">Partier</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/parti")} className="font-medium">
                Alla partier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {PARTY_ORDER.map((abbr) => (
                <DropdownMenuItem
                  key={abbr}
                  onClick={() => navigate(`/parti/${abbr}`)}
                  className="flex items-center gap-2"
                >
                  <span
                    className={`inline-flex size-5 items-center justify-center rounded text-[10px] font-semibold ${getBadgeColor(PARTY_ABBREVIATION_TO_NAME[abbr])}`}
                  >
                    {abbr}
                  </span>
                  {PARTY_ABBREVIATION_TO_NAME[abbr]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/statistik")}
              aria-label="Statistik"
              className={cn("text-xs px-2", location.pathname === "/statistik" && "text-primary")}
            >
              <BarChart3 data-icon="inline-start" />
              <span className="hidden sm:inline">Statistik</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/om")}
            aria-label="Metod"
            className={cn("text-xs px-2", location.pathname === "/om" && "text-primary")}
          >
            <BookOpen data-icon="inline-start" />
            <span className="hidden sm:inline">Metod</span>
          </Button>
          <ThemeToggle />
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAdminClick}
              title="Admin"
              aria-label="Admin"
              className="relative"
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAuthClick}
              title="Logga ut"
              aria-label="Logga ut"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
      {/* Animate the changing of padding */}
      <div
        style={{
          paddingLeft: isMobileBarStuck ? "1rem" : "0",
          paddingRight: isMobileBarStuck ? "1rem" : "0",
          transition: "padding 100ms ease",
        }}
      >
        <div className="border-b" />
      </div>
    </nav>
  );
}
