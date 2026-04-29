import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
  ShoppingCart,
  RotateCcw,
  BarChart3,
  ScanLine,
  ClipboardCheck,
  Truck,
  AlertTriangle,
  ShieldCheck,
  Wallet,
  Receipt,
  ArrowDownToLine,
  Store,
  MapPin,
  SlidersHorizontal,
  HandCoins,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { getUserRoles, type Role, type User } from "./types";
import { canAny, ROUTE_CAPABILITIES } from "./permissions";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  short?: string; // texto corto bottom nav
};

export const allNav: Record<string, NavItem> = {
  dashboard: { to: "/", label: "Dashboard", icon: LayoutDashboard, short: "Inicio" },
  users: { to: "/usuarios", label: "Usuarios", icon: Users },
  locations: { to: "/ubicaciones", label: "Ubicaciones", icon: MapPin },
  attendance: { to: "/asistencia", label: "Asistencia", icon: ClipboardCheck, short: "Asistencia" },
  catalog: { to: "/catalogo", label: "Catálogo", icon: Tag, short: "Catálogo" },
  inventory: { to: "/inventario", label: "Inventario", icon: Package, short: "Stock" },
  scan: { to: "/escanear", label: "Escaneo general", icon: ScanLine, short: "Escanear" },
  sales: { to: "/ventas", label: "Ventas", icon: ShoppingCart, short: "Ventas" },
  newSale: { to: "/ventas/nueva", label: "Nueva venta", icon: ShoppingCart, short: "Vender" },
  pendingPayments: { to: "/ventas/por-cobrar", label: "Por cobrar", icon: Receipt, short: "Cobrar" },
  aftersales: { to: "/postventa", label: "Postventa", icon: RotateCcw, short: "Cambios" },
  reports: { to: "/reportes", label: "Reportes", icon: BarChart3 },
  commissions: { to: "/comisiones", label: "Comisiones", icon: Wallet, short: "Comisión" },
  advances: { to: "/adelantos", label: "Adelantos", icon: HandCoins, short: "Adelantos" },
  myIncome: { to: "/mis-ingresos", label: "Mis ingresos", icon: Wallet, short: "Mis $" },
  transfers: { to: "/inventario/traslados", label: "Traslados", icon: Truck },
  deliveries: { to: "/inventario/entregas", label: "Entregas", icon: Package },
  inventoryEntry: { to: "/inventario/ingreso", label: "Ingreso", icon: ArrowDownToLine },
  faults: { to: "/inventario/fallas", label: "Fallas", icon: AlertTriangle },
  adjustments: { to: "/inventario/ajustes", label: "Ajustes", icon: SlidersHorizontal },
  storefront: { to: "/inventario/tienda", label: "Productos en tienda", icon: Store, short: "Tienda" },
  authorizations: { to: "/autorizaciones", label: "Autorizaciones", icon: ShieldCheck },
  settings: { to: "/configuracion", label: "Reglas", icon: Settings },
  saleHistory: { to: "/ventas", label: "Historial venta", icon: Receipt },
};

export const sidebarByRole: Record<Role, NavItem[]> = {
  admin: [
    allNav.dashboard,
    allNav.users,
    allNav.locations,
    allNav.attendance,
    allNav.catalog,
    allNav.inventory,
    allNav.inventoryEntry,
    allNav.transfers,
    allNav.deliveries,
    allNav.adjustments,
    allNav.storefront,
    allNav.sales,
    allNav.pendingPayments,
    allNav.aftersales,
    allNav.authorizations,
    allNav.commissions,
    allNav.advances,
    allNav.reports,
    allNav.settings,
  ],
  vendedor: [
    allNav.dashboard,
    allNav.newSale,
    allNav.inventory,
    allNav.aftersales,
    allNav.myIncome,
  ],
  cajero: [
    allNav.dashboard,
    allNav.sales,
    allNav.pendingPayments,
    allNav.aftersales,
    allNav.advances,
    allNav.reports,
  ],
  almacen: [
    allNav.dashboard,
    allNav.inventory,
    allNav.inventoryEntry,
    allNav.transfers,
    allNav.deliveries,
    allNav.faults,
    allNav.adjustments,
    allNav.storefront,
  ],
};

const uniqueNav = (items: NavItem[]) => Array.from(new Map(items.map((item) => [item.to, item])).values());

const rolesForNavigation = (user: Pick<User, "role" | "roles"> | null | undefined, activeRole?: Role) => {
  const roles = getUserRoles(user);
  return activeRole && roles.includes(activeRole) ? [activeRole] : roles;
};

const hasRouteAccess = (user: Pick<User, "role" | "roles"> | null | undefined, item: NavItem, activeRole?: Role) => {
  const required = ROUTE_CAPABILITIES[item.to];
  if (!required) return true;
  return canAny(activeRole || user, Array.isArray(required) ? required : [required]);
};

export const navigationForUser = (user?: Pick<User, "role" | "roles"> | null, activeRole?: Role) =>
  uniqueNav(rolesForNavigation(user, activeRole).flatMap((role) => sidebarByRole[role] || []))
    .filter((item) => hasRouteAccess(user, item, activeRole));

// Acción principal para FAB / bottom nav central por rol
export const primaryActionByRole: Record<Role, NavItem> = {
  admin: allNav.scan,
  vendedor: allNav.newSale,
  cajero: allNav.pendingPayments,
  almacen: allNav.scan,
};

export const primaryActionForUser = (user?: Pick<User, "role" | "roles"> | null, activeRole?: Role) => {
  const roles = rolesForNavigation(user, activeRole);
  if (roles.includes("vendedor")) return allNav.newSale;
  if (roles.includes("cajero")) return allNav.pendingPayments;
  if (roles.includes("almacen")) return allNav.inventoryEntry;
  return allNav.pendingPayments;
};

// Bottom nav: 4 items + 1 acción central destacada
export const bottomNavByRole: Record<Role, NavItem[]> = {
  admin: [allNav.dashboard, allNav.sales, allNav.inventory, allNav.reports],
  vendedor: [allNav.dashboard, allNav.newSale, allNav.inventory, allNav.myIncome],
  cajero: [allNav.dashboard, allNav.pendingPayments, allNav.sales, allNav.advances],
  almacen: [allNav.dashboard, allNav.inventory, allNav.transfers, allNav.faults],
};

export const bottomNavForUser = (user?: Pick<User, "role" | "roles"> | null, activeRole?: Role) => {
  const items = uniqueNav(rolesForNavigation(user, activeRole).flatMap((role) => bottomNavByRole[role] || []))
    .filter((item) => hasRouteAccess(user, item, activeRole));
  return items.slice(0, 4);
};
