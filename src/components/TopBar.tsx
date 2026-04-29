import { Brand } from "@/components/Brand";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore, useCurrentRole, useCurrentUser } from "@/lib/store";
import { useCan } from "@/components/Can";
import { formatUserRoles, getUserRoles, ROLE_LABELS, type Role } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TopBar() {
  const pendingAuth = useAppStore((s) => s.authorizations.filter((a) => a.status === "pendiente").length);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const currentRole = useCurrentRole();
  const users = useAppStore((s) => s.users);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setCurrentRole = useAppStore((s) => s.setCurrentRole);
  const user = useCurrentUser();
  const canReviewAuth = useCan("auth.review");
  const activeUsers = users.filter((item) => item.active);
  const roles = getUserRoles(user);

  return (
    <header className="glass-header sticky top-0 z-30 border-b border-border/60">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14 pt-safe">
        <div className="lg:hidden">
          <Brand size="sm" />
        </div>
        <div className="hidden lg:block text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Operaciones</span>
        </div>
        <div className="flex items-center gap-2">
          {canReviewAuth && (
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
          )}
          {user && activeUsers.length > 0 && (
            <>
              {roles.length > 1 && currentRole && (
                <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as Role)}>
                  <SelectTrigger className="h-9 w-[150px] rounded-full bg-card shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={currentUserId} onValueChange={setCurrentUser}>
                <SelectTrigger className="h-9 w-[190px] sm:w-[260px] rounded-full bg-card shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {activeUsers.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {formatUserRoles(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
