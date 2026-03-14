import { Settings, LogIn, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PromiseFilters } from "@/components/PromiseFilters";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isIndex = location.pathname === "/";

  const handleAuthClick = async () => {
    setMobileOpen(false);
    if (user) {
      await signOut();
    } else {
      navigate("/auth");
    }
  };

  const handleAdminClick = () => {
    setMobileOpen(false);
    navigate("/admin");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          Infriat
        </button>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-1">
          <ThemeToggle />
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAdminClick}
              title="Admin"
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAuthClick}
            title={user ? "Logga ut" : "Logga in"}
          >
            {user ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile: hamburger / filter sheet */}
        <div className="flex md:hidden items-center gap-1">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Öppna meny">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-left">Meny</SheetTitle>
              </SheetHeader>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 mt-4">
                <ThemeToggle variant="menu" />
                {isAdmin && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={handleAdminClick}
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={handleAuthClick}
                >
                  {user ? (
                    <>
                      <LogOut className="w-4 h-4" />
                      Logga ut
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Logga in
                    </>
                  )}
                </Button>
              </div>

              {/* Filters (only on Index page) */}
              {isIndex && (
                <>
                  <Separator className="my-4" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Filtrera
                  </h3>
                  <PromiseFilters />
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
