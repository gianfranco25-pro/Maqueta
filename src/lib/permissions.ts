import type { Role } from "./types";

/**
 * Matriz central de permisos por rol.
 * Regla: lo que no esté permitido se OCULTA en la UI (no se muestra deshabilitado).
 * El admin tiene acceso total a todo.
 */

export type Capability =
  // Asistencia
  | "attendance.mark"
  // Ventas
  | "sales.view.own"
  | "sales.view.all"
  | "sales.create"
  | "sales.cancel" // anular venta confirmada
  | "sales.collect" // confirmar cobro
  | "sales.cancelDraft" // anular venta pendiente de cobro
  // Postventa
  | "aftersales.exchange"
  | "aftersales.wrong" // compra por error
  // Inventario
  | "inventory.view"
  | "inventory.entry"
  | "inventory.transfer"
  | "inventory.delivery"
  | "inventory.fault"
  | "inventory.sample"
  | "inventory.qr.generate"
  | "inventory.scan"
  // Catálogo y precios
  | "catalog.view"
  | "catalog.edit"
  // Usuarios
  | "users.manage"
  // Reportes
  | "reports.global"
  | "income.own"
  | "commissions.all"
  // Autorizaciones
  | "auth.review" // aprobar / rechazar
  // Configuración del sistema
  | "settings.system";

const ALL: Capability[] = [
  "attendance.mark",
  "sales.view.own",
  "sales.view.all",
  "sales.create",
  "sales.cancel",
  "sales.collect",
  "sales.cancelDraft",
  "aftersales.exchange",
  "aftersales.wrong",
  "inventory.view",
  "inventory.entry",
  "inventory.transfer",
  "inventory.delivery",
  "inventory.fault",
  "inventory.sample",
  "inventory.qr.generate",
  "inventory.scan",
  "catalog.view",
  "catalog.edit",
  "users.manage",
  "reports.global",
  "income.own",
  "commissions.all",
  "auth.review",
  "settings.system",
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  admin: ALL,
  vendedor: [
    "attendance.mark",
    "sales.view.own",
    "sales.create",
    "aftersales.exchange",
    "inventory.view",
    "inventory.scan",
    "catalog.view", // solo lectura
    "income.own",
  ],
  cajero: [
    "attendance.mark",
    "sales.view.all", // necesita buscar venta para cobrar
    "sales.collect",
    "aftersales.exchange",
    "inventory.scan",
  ],
  almacen: [
    "attendance.mark",
    "inventory.view",
    "inventory.entry",
    "inventory.transfer",
    "inventory.delivery",
    "inventory.fault",
    "inventory.sample",
    "inventory.qr.generate",
    "inventory.scan",
  ],
  administrativo: [
    "attendance.mark",
    "sales.view.all",
    "inventory.view",
    "reports.global",
    "commissions.all",
    "auth.review", // revisa, no necesariamente aprueba críticas
    "catalog.view",
  ],
};

export function can(role: Role | undefined, cap: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role].includes(cap);
}

/** Mapa ruta → capability mínima requerida. Si el usuario no la tiene, se redirige. */
export const ROUTE_CAPABILITIES: Record<string, Capability> = {
  "/usuarios": "users.manage",
  "/asistencia": "attendance.mark",
  "/catalogo": "catalog.view",
  "/inventario": "inventory.view",
  "/inventario/ingreso": "inventory.entry",
  "/inventario/traslados": "inventory.transfer",
  "/inventario/entregas": "inventory.delivery",
  "/inventario/fallas": "inventory.fault",
  "/inventario/muestras": "inventory.sample",
  "/escanear": "inventory.scan",
  "/ventas": "sales.view.own", // vendedor ve solo las suyas (filtrado en página)
  "/ventas/nueva": "sales.create",
  "/ventas/por-cobrar": "sales.collect",
  "/postventa": "aftersales.exchange",
  "/autorizaciones": "auth.review",
  "/reportes": "reports.global",
  "/comisiones": "commissions.all",
  "/mis-ingresos": "income.own",
  "/configuracion": "settings.system",
};
