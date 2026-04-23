import { ChevronDown, Check } from "lucide-react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { ROLE_LABELS, type Role } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLES: Role[] = ["admin", "vendedor", "cajero", "almacen", "administrativo"];

const ROLE_DOT: Record<Role, string> = {
  admin: "bg-gold",
  vendedor: "bg-success",
  cajero: "bg-foreground",
  almacen: "bg-muted-foreground",
  administrativo: "bg-critical",
};

export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  const switchRole = useAppStore((s) => s.switchToFirstUserOfRole);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full border border-border/70 bg-card px-2.5 py-1.5 text-sm shadow-sm hover:border-accent/50 transition-colors">
        <span className={`size-2 rounded-full ${ROLE_DOT[user.role]}`} />
        <span className="font-medium hidden sm:inline">{user.name.split(" ")[0]}</span>
        <span className="text-muted-foreground hidden sm:inline">·</span>
        <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          {ROLE_LABELS[user.role]}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Cambiar de rol (demo)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r) => (
          <DropdownMenuItem
            key={r}
            onClick={() => switchRole(r)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${ROLE_DOT[r]}`} />
              {ROLE_LABELS[r]}
            </span>
            {user.role === r && <Check className="size-4 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
