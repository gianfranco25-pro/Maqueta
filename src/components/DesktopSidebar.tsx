import { NavLink } from "@/components/NavLink";
import { Brand } from "@/components/Brand";
import { useCurrentUser } from "@/lib/store";
import { navigationForUser } from "@/lib/navigation";
import { LogOut } from "lucide-react";
import { formatUserRoles } from "@/lib/types";

export function DesktopSidebar() {
  const user = useCurrentUser();
  if (!user) return null;
  const items = navigationForUser(user);

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Brand inverse />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeClassName="!text-sidebar-primary !bg-sidebar-accent border-l-2 border-sidebar-primary"
            >
              <Icon className="size-4.5 shrink-0" strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold text-sm">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{formatUserRoles(user)}</p>
          </div>
          <button className="text-sidebar-foreground/50 hover:text-sidebar-foreground" title="Sesión simulada">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
