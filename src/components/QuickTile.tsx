import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickTile({
  to,
  label,
  hint,
  icon: Icon,
  emphasis = false,
}: {
  to: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  emphasis?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "quick-tile group",
        emphasis && "bg-foreground text-background border-foreground hover:border-accent shadow-md"
      )}
    >
      <div
        className={cn(
          "size-10 rounded-xl grid place-items-center mb-1",
          emphasis ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors"
        )}
      >
        <Icon className="size-5" strokeWidth={2.2} />
      </div>
      <p className={cn("font-semibold text-sm leading-tight", emphasis ? "text-background" : "text-foreground")}>{label}</p>
      {hint && (
        <p className={cn("text-xs", emphasis ? "text-background/60" : "text-muted-foreground")}>{hint}</p>
      )}
    </Link>
  );
}
