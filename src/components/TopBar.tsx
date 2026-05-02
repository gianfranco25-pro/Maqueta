import { Brand } from "@/components/Brand";
import { useAppStore, useCurrentRole, useCurrentUser } from "@/lib/store";
import { formatUserRoles, getUserRoles, ROLE_LABELS, type Role } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TopBar() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const currentRole = useCurrentRole();
  const users = useAppStore((s) => s.users);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setCurrentRole = useAppStore((s) => s.setCurrentRole);
  const user = useCurrentUser();
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
