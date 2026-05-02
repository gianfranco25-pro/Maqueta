import { getUserRoles, type Role, type User } from "./types";

/**
 * Matriz central de permisos por rol.
 * Regla: lo que no este permitido se OCULTA en la UI.
 */

export type Capability =
  | "attendance.mark"
  | "sales.view.own"
  | "sales.view.all"
  | "sales.create"
  | "sales.cancel"
  | "sales.collect"
  | "sales.cancelDraft"
  | "sales.price.edit"
  | "aftersales.exchange"
  | "aftersales.wrong"
  | "inventory.view"
  | "inventory.entry"
  | "inventory.transfer"
  | "inventory.delivery"
  | "inventory.fault"
  | "inventory.qr.generate"
  | "inventory.scan"
  | "catalog.view"
  | "catalog.edit"
  | "catalog.prices.edit"
  | "users.manage"
  | "locations.manage"
  | "reports.global"
  | "profit.view"
  | "income.own"
  | "commissions.all"
  | "advances.view.all"
  | "advances.manage"
  | "settings.system";

const ALL: Capability[] = [
  "attendance.mark",
  "sales.view.own",
  "sales.view.all",
  "sales.create",
  "sales.cancel",
  "sales.collect",
  "sales.cancelDraft",
  "sales.price.edit",
  "aftersales.exchange",
  "aftersales.wrong",
  "inventory.view",
  "inventory.entry",
  "inventory.transfer",
  "inventory.delivery",
  "inventory.fault",
  "inventory.qr.generate",
  "inventory.scan",
  "catalog.view",
  "catalog.edit",
  "catalog.prices.edit",
  "users.manage",
  "locations.manage",
  "reports.global",
  "profit.view",
  "income.own",
  "commissions.all",
  "advances.view.all",
  "advances.manage",
  "settings.system",
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  admin: ALL,
  vendedor: [
    "attendance.mark",
    "sales.view.own",
    "sales.create",
    "sales.price.edit",
    "aftersales.exchange",
    "inventory.view",
    "inventory.scan",
    "income.own",
  ],
  cajero: [
    "attendance.mark",
    "sales.view.all",
    "sales.collect",
    "sales.cancelDraft",
    "aftersales.exchange",
    "aftersales.wrong",
    "inventory.scan",
  ],
  almacen: [
    "attendance.mark",
    "inventory.view",
    "inventory.entry",
    "inventory.transfer",
    "inventory.delivery",
    "inventory.fault",
    "inventory.qr.generate",
    "inventory.scan",
  ],
};

export function can(userOrRole: Role | Pick<User, "role" | "roles"> | undefined, cap: Capability): boolean {
  const roles = typeof userOrRole === "string" ? [userOrRole] : getUserRoles(userOrRole);
  return roles.some((role) => ROLE_CAPABILITIES[role]?.includes(cap));
}

export function canAny(userOrRole: Role | Pick<User, "role" | "roles"> | undefined, caps: Capability[]): boolean {
  return caps.some((cap) => can(userOrRole, cap));
}

export const ROUTE_CAPABILITIES: Record<string, Capability | Capability[]> = {
  "/usuarios": "users.manage",
  "/ubicaciones": "locations.manage",
  "/asistencia": "attendance.mark",
  "/catalogo": "catalog.view",
  "/inventario": "inventory.view",
  "/inventario/ingreso": "inventory.entry",
  "/inventario/traslados": "inventory.transfer",
  "/inventario/entregas": "inventory.delivery",
  "/inventario/fallas": "inventory.fault",
  "/escanear": "inventory.scan",
  "/ventas": ["sales.view.own", "sales.view.all"],
  "/ventas/nueva": "sales.create",
  "/ventas/por-cobrar": "sales.collect",
  "/postventa": "aftersales.exchange",
  "/reportes": "reports.global",
  "/comisiones": "commissions.all",
  "/mis-ingresos": "income.own",
  "/configuracion": "settings.system",
};
