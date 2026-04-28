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
  type LucideIcon,
} from "lucide-react";
import { getUserRoles, type Role, type User } from "./types";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  short?: string; // texto corto bottom nav
};

export const allNav: Record<string, NavItem> = {
  dashboard: { to: "/", label: "Dashboard", icon: LayoutDashboard, short: "Inicio" },
  users: { to: "/usuarios", label: "Usuarios", icon: Users },
  attendance: { to: "/asistencia", label: "Asistencia", icon: ClipboardCheck, short: "Asistencia" },
  catalog: { to: "/catalogo", label: "Catálogo", icon: Tag, short: "Catálogo" },
  inventory: { to: "/inventario", label: "Inventario", icon: Package, short: "Stock" },
  scan: { to: "/escanear", label: "Escanear", icon: ScanLine, short: "Escanear" },
  sales: { to: "/ventas", label: "Ventas", icon: ShoppingCart, short: "Ventas" },
  newSale: { to: "/ventas/nueva", label: "Nueva venta", icon: ShoppingCart, short: "Vender" },
  pendingPayments: { to: "/ventas/por-cobrar", label: "Por cobrar", icon: Receipt, short: "Cobrar" },
  aftersales: { to: "/postventa", label: "Postventa", icon: RotateCcw, short: "Cambios" },
  reports: { to: "/reportes", label: "Reportes", icon: BarChart3 },
  commissions: { to: "/comisiones", label: "Comisiones", icon: Wallet, short: "Comisión" },
  myIncome: { to: "/mis-ingresos", label: "Mis ingresos", icon: Wallet, short: "Mis $" },
  transfers: { to: "/inventario/traslados", label: "Traslados", icon: Truck },
  faults: { to: "/inventario/fallas", label: "Fallas", icon: AlertTriangle },
  authorizations: { to: "/autorizaciones", label: "Autorizaciones", icon: ShieldCheck },
  saleHistory: { to: "/ventas", label: "Historial venta", icon: Receipt },
};

export const sidebarByRole: Record<Role, NavItem[]> = {
  admin: [
    allNav.dashboard,
    allNav.users,
    allNav.attendance,
    allNav.catalog,
    allNav.inventory,
    allNav.scan,
    allNav.sales,
    allNav.pendingPayments,
    allNav.aftersales,
    allNav.authorizations,
    allNav.commissions,
    allNav.reports,
  ],
  vendedor: [
    allNav.dashboard,
    allNav.newSale,
    allNav.sales,
    allNav.scan,
    allNav.inventory,
    allNav.catalog,
    allNav.aftersales,
    allNav.myIncome,
    allNav.attendance,
  ],
  cajero: [
    allNav.dashboard,
    allNav.pendingPayments,
    allNav.sales,
    allNav.aftersales,
    allNav.scan,
    allNav.attendance,
  ],
  almacen: [
    allNav.dashboard,
    allNav.inventory,
    allNav.scan,
    allNav.transfers,
    allNav.faults,
    allNav.attendance,
  ],
  administrativo: [
    allNav.dashboard,
    allNav.reports,
    allNav.attendance,
    allNav.commissions,
    allNav.authorizations,
    allNav.sales,
    allNav.inventory,
    allNav.catalog,
  ],
};

const uniqueNav = (items: NavItem[]) => Array.from(new Map(items.map((item) => [item.to, item])).values());

export const navigationForUser = (user?: Pick<User, "role" | "roles"> | null) =>
  uniqueNav(getUserRoles(user).flatMap((role) => sidebarByRole[role] || []));

// Acción principal para FAB / bottom nav central por rol
export const primaryActionByRole: Record<Role, NavItem> = {
  admin: allNav.scan,
  vendedor: allNav.newSale,
  cajero: allNav.pendingPayments,
  almacen: allNav.scan,
  administrativo: allNav.reports,
};

export const primaryActionForUser = (user?: Pick<User, "role" | "roles"> | null) => {
  const roles = getUserRoles(user);
  if (roles.includes("vendedor")) return allNav.newSale;
  if (roles.includes("cajero")) return allNav.pendingPayments;
  if (roles.includes("almacen")) return allNav.scan;
  if (roles.includes("administrativo")) return allNav.reports;
  return allNav.scan;
};

// Bottom nav: 4 items + 1 acción central destacada
export const bottomNavByRole: Record<Role, NavItem[]> = {
  admin: [allNav.dashboard, allNav.sales, allNav.inventory, allNav.reports],
  vendedor: [allNav.dashboard, allNav.sales, allNav.aftersales, allNav.myIncome],
  cajero: [allNav.dashboard, allNav.pendingPayments, allNav.sales, allNav.aftersales],
  almacen: [allNav.dashboard, allNav.inventory, allNav.transfers, allNav.faults],
  administrativo: [allNav.dashboard, allNav.reports, allNav.commissions, allNav.authorizations],
};

export const bottomNavForUser = (user?: Pick<User, "role" | "roles"> | null) => {
  const items = uniqueNav(getUserRoles(user).flatMap((role) => bottomNavByRole[role] || []));
  return items.slice(0, 4);
};
