import { ReactNode } from "react";
import { useCurrentUser } from "@/lib/store";
import { can, type Capability } from "@/lib/permissions";

/** Renderiza children solo si el usuario actual tiene la capacidad. Oculta por completo. */
export function Can({ cap, children, fallback = null }: { cap: Capability; children: ReactNode; fallback?: ReactNode }) {
  const user = useCurrentUser();
  return can(user?.role, cap) ? <>{children}</> : <>{fallback}</>;
}

export function useCan(cap: Capability): boolean {
  const user = useCurrentUser();
  return can(user?.role, cap);
}
