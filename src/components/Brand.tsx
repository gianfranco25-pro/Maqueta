import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function Brand({ size = "md", inverse = false }: { size?: "sm" | "md" | "lg"; inverse?: boolean }) {
  const sizes = {
    sm: { wrap: "gap-2", logo: "size-7", text: "text-base" },
    md: { wrap: "gap-2.5", logo: "size-9", text: "text-lg" },
    lg: { wrap: "gap-3", logo: "size-11", text: "text-2xl" },
  }[size];

  return (
    <Link to="/" className={`flex items-center ${sizes.wrap}`}>
      <div
        className={`${sizes.logo} rounded-xl bg-foreground text-background grid place-items-center shadow-md relative overflow-hidden`}
      >
        <Sparkles className="size-4 text-accent" strokeWidth={2.5} />
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-accent" />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-display font-extrabold tracking-tight ${sizes.text} ${inverse ? "text-background" : "text-foreground"}`}>
          KABUTT
        </span>
        <span className={`text-[10px] uppercase tracking-[0.2em] ${inverse ? "text-background/60" : "text-muted-foreground"} font-semibold`}>
          Operations
        </span>
      </div>
    </Link>
  );
}
