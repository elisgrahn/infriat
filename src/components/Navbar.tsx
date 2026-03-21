import { Settings, LogOut, BarChart3, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { InfriatLogo } from "@/components/icons/InfriatLogo";
import { useStickyBar } from "@/store/StickyBarContext";
import { cn } from "@/lib/utils";

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
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/statistik")}
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
