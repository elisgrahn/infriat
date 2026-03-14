import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

interface ThemeToggleProps {
  /** "hero" = on dark gradient (default), "navbar" = on neutral bg, "menu" = full-width menu item */
  variant?: "hero" | "navbar" | "menu";
}

export function ThemeToggle({ variant = "navbar" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const toggle = () => setTheme(theme === "light" ? "dark" : "light");

  const heroClass = "text-primary-foreground hover:bg-primary-foreground/10";
  const navbarClass = "text-foreground";

  if (variant === "menu") {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start gap-2"
        onClick={toggle}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 ml-0" />
        <span className="ml-6">Växla tema</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={variant === "hero" ? heroClass : navbarClass}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Växla tema</span>
    </Button>
  );
}
