import { Brand } from "@/components/Brand";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Bell, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";

export function TopBar() {
  const pendingAuth = useAppStore((s) => s.authorizations.filter((a) => a.status === "pendiente").length);

  return (
    <header className="glass-header sticky top-0 z-30 border-b border-border/60">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14 pt-safe">
        <div className="lg:hidden">
          <Brand size="sm" />
        </div>
        <div className="hidden lg:block text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Operaciones</span> · prototipo demo con datos locales
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/escanear"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <ScanLine className="size-3.5" />
            Escanear
          </Link>
          <Link
            to="/autorizaciones"
            className="relative size-9 grid place-items-center rounded-full border border-border bg-card hover:border-accent/50 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="size-4" />
            {pendingAuth > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-critical text-critical-foreground text-[10px] font-bold grid place-items-center">
                {pendingAuth}
              </span>
            )}
          </Link>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}
