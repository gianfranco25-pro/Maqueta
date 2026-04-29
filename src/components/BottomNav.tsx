import { NavLink } from "@/components/NavLink";
import { useCurrentRole, useCurrentUser } from "@/lib/store";
import { bottomNavForUser, primaryActionForUser } from "@/lib/navigation";
import { Link } from "react-router-dom";

export function BottomNav() {
  const user = useCurrentUser();
  const role = useCurrentRole();
  if (!user) return null;
  const items = bottomNavForUser(user, role);
  const primary = primaryActionForUser(user, role);
  const PrimaryIcon = primary.icon;

  // Insertar el botón central en la mitad
  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-safe">
      <div className="mx-3 mb-2 rounded-2xl bg-card/95 backdrop-blur border border-border shadow-lg">
        <div className="grid grid-cols-5 items-end relative h-16">
          {left.map((item) => (
            <BottomItem key={item.to} item={item} />
          ))}
          <div className="flex justify-center">
            <Link
              to={primary.to}
              className="-mt-7 size-14 rounded-2xl bg-gradient-gold text-accent-foreground grid place-items-center shadow-gold border-4 border-background active:scale-95 transition-transform"
              aria-label={primary.label}
            >
              <PrimaryIcon className="size-6" strokeWidth={2.5} />
            </Link>
          </div>
          {right.map((item) => (
            <BottomItem key={item.to} item={item} />
          ))}
        </div>
      </div>
    </nav>
  );
}

import type { NavItem } from "@/lib/navigation";

function BottomItem({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground py-2"
      activeClassName="!text-foreground"
    >
      <Icon className="size-5" />
      <span className="truncate max-w-full px-1">{item.short || item.label}</span>
    </NavLink>
  );
}
