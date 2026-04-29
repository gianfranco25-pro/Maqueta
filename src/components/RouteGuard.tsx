import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentRole } from "@/lib/store";
import { ROUTE_CAPABILITIES, canAny } from "@/lib/permissions";

/** Si la ruta está restringida y el rol no tiene la capacidad, redirige al dashboard. */
export function RouteGuard({ children }: { children: ReactNode }) {
  const role = useCurrentRole();
  const loc = useLocation();
  const required = ROUTE_CAPABILITIES[loc.pathname];
  if (required && !canAny(role, Array.isArray(required) ? required : [required])) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
