import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: "default" | "gold" | "critical" | "success";
  className?: string;
}) {
  const tones = {
    default: "bg-card",
    gold: "bg-gradient-to-br from-gold-soft to-card border-gold/40",
    critical: "bg-gradient-to-br from-critical-soft to-card border-critical/30",
    success: "bg-gradient-to-br from-success-soft to-card border-success/30",
  }[tone];

  const iconTone = {
    default: "text-foreground bg-secondary",
    gold: "text-gold bg-gold/10",
    critical: "text-critical bg-critical/10",
    success: "text-success bg-success/10",
  }[tone];

  return (
    <div className={cn("kpi-card flex flex-col gap-3 min-w-0", tones, className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        {Icon && (
          <div className={cn("size-8 rounded-lg grid place-items-center shrink-0", iconTone)}>
            <Icon className="size-4" strokeWidth={2.2} />
          </div>
        )}
      </div>
      <p className="font-display text-2xl lg:text-3xl font-extrabold leading-none">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
