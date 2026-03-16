import { Settings, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

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
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="text-xl font-bold tracking-tight text-foreground hover:text-secondary transition-colors"
        >
          Infriat.se
        </button>

        {/* Actions (always visible, including mobile) */}
        <div className="flex items-center gap-1">
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
