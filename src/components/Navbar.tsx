import { Settings, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InfriatLogo } from "@/components/InfriatLogo";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("status_suggestions")
        .select("*", { count: "exact", head: true })
        .gte("upvotes", 2);
      setPendingCount(count ?? 0);
    };
    fetchCount();
  }, [isAdmin]);

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
    <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="group flex flex-row items-center gap-2 text-xl font-bold tracking-tight text-foreground hover:text-primary-light dark:hover:text-secondary transition-colors"
        >
          <InfriatLogo className="size-6" />
          Infriat.se
        </button>

        {/* Actions (always visible, including mobile) */}
        <div className="flex items-center">
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
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAuthClick}
            title={user ? "Logga ut" : "Logga in"}
          >
            {user ? (
              <LogOut className="w-5 h-5" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
}
