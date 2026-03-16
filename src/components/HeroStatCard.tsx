import type { LucideIcon } from "lucide-react";

interface HeroStatCardProps {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
}

export const HeroStatCard = ({ icon: Icon, value, label }: HeroStatCardProps) => (
  <div className="group bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-6 border border-primary-foreground/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
    <div className="flex items-center justify-center gap-3 mb-3">
      <Icon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      <div className="text-4xl font-bold">{value}</div>
    </div>
    <div className="text-sm text-primary-foreground/90 font-medium">
      {label}
    </div>
  </div>
);
