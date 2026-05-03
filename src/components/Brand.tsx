import { Link } from "react-router-dom";
import logo from "../../logo.png";

export function Brand({ size = "md", inverse = false }: { size?: "sm" | "md" | "lg"; inverse?: boolean }) {
  const sizes = {
    sm: { wrap: "gap-2", logoBox: "h-7 w-7", logo: "h-5 w-5", text: "text-base" },
    md: { wrap: "gap-2.5", logoBox: "h-9 w-9", logo: "h-6 w-6", text: "text-lg" },
    lg: { wrap: "gap-3", logoBox: "h-11 w-11", logo: "h-7 w-7", text: "text-2xl" },
  }[size];

  return (
    <Link to="/" className={`flex items-center ${sizes.wrap}`}>
      <div className={`${sizes.logoBox} rounded-xl bg-background/90 grid place-items-center shadow-md overflow-hidden`}>
        <img
          src={logo}
          alt="KABUT"
          className={`${sizes.logo} object-contain ${inverse ? "invert" : ""}`}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-display font-extrabold tracking-tight ${sizes.text} ${inverse ? "text-background" : "text-foreground"}`}>
          KABUT
        </span>
        <span className={`text-[10px] uppercase tracking-[0.2em] ${inverse ? "text-background/60" : "text-muted-foreground"} font-semibold`}>
          Operations
        </span>
      </div>
    </Link>
  );
}
