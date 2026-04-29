import { PageHeader } from "@/components/AppShell";
import { useCurrentRole, useCurrentUser, useAppStore } from "@/lib/store";
import { formatUserRoles } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { QuickTile } from "@/components/QuickTile";
import { useDashboardMetrics, useMyCommission } from "@/lib/metrics";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  RotateCcw,
  Wallet,
  ClipboardCheck,
  Truck,
  AlertTriangle,
  ShieldCheck,
  Users,
  Tag,
  BarChart3,
  Receipt,
  Search,
  MapPin,
  SlidersHorizontal,
  Store,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { useCan } from "@/components/Can";

export default function Dashboard() {
  const user = useCurrentUser();
  const role = useCurrentRole();
  if (!user) return null;
  return (
    <>
      <PageHeader
        title={`Hola, ${user.name.split(" ")[0]}`}
        subtitle={`${formatUserRoles(user)} · ${new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}`}
      />
      {role === "admin" && <AdminDashboard />}
      {role === "vendedor" && <SellerDashboard />}
      {role === "cajero" && <CashierDashboard />}
      {role === "almacen" && <WarehouseDashboard />}
    </>
  );
}

function AdminDashboard() {
  const m = useDashboardMetrics();
  const sales = useAppStore((s) => s.sales).slice(0, 5);
  const auths = useAppStore((s) => s.authorizations).filter((a) => a.status === "pendiente").slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Ventas hoy" value={fmtMoney(m.todayRevenue)} icon={TrendingUp} tone="gold" hint={`${m.pairsToday} pares hoy`} />
        <StatCard label="Ventas semana" value={fmtMoney(m.weekRevenue)} icon={ShoppingCart} hint={`${m.pairsWeek} pares`} />
        <StatCard label="Pares disponibles" value={m.availableShoes} icon={Package} hint={`${m.availableAcc} accesorios`} />
        <StatCard label="Autorizaciones" value={m.pendingAuth} icon={ShieldCheck} tone={m.pendingAuth ? "critical" : "default"} hint="pendientes" />
      </div>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickTile to="/autorizaciones" icon={ShieldCheck} label="Autorizaciones" emphasis />
          <QuickTile to="/ventas/por-cobrar" icon={Receipt} label="Por cobrar" />
          <QuickTile to="/inventario" icon={Package} label="Inventario" />
          <QuickTile to="/inventario/tienda" icon={Store} label="En tienda" />
          <QuickTile to="/inventario/ajustes" icon={SlidersHorizontal} label="Ajustes" />
          <QuickTile to="/usuarios" icon={Users} label="Usuarios" />
          <QuickTile to="/ubicaciones" icon={MapPin} label="Ubicaciones" />
          <QuickTile to="/catalogo" icon={Tag} label="Catálogo" />
          <QuickTile to="/adelantos" icon={Wallet} label="Adelantos" />
          <QuickTile to="/comisiones" icon={Wallet} label="Liquidaciones" />
          <QuickTile to="/reportes" icon={BarChart3} label="Reportes" />
          <QuickTile to="/configuracion" icon={Settings} label="Reglas" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-display font-bold">Últimas ventas</h3>
            <Link to="/ventas" className="text-xs font-medium text-accent hover:underline">Ver todas</Link>
          </div>
          {sales.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground text-center">Sin ventas registradas todavía</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {sales.map((s) => (
                <li key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
                    <p className="font-medium truncate">{s.sellerName}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(s.timestamp)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">{fmtMoney(s.total)}</p>
                    <StatusBadge kind={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-display font-bold">Autorizaciones pendientes</h3>
            <Link to="/autorizaciones" className="text-xs font-medium text-accent hover:underline">Gestionar</Link>
          </div>
          {auths.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground text-center">Todo en orden ✦</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {auths.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.detail}</p>
                      <p className="text-xs text-muted-foreground">{a.requestedByName} · {fmtDateTime(a.timestamp)}</p>
                    </div>
                    <StatusBadge kind="pendiente" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SellerDashboard() {
  const c = useMyCommission();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Comisión semana" value={fmtMoney(c.weekTotal)} icon={Wallet} tone="gold" hint={`${c.weekPairs} pares vendidos`} />
        <StatCard label="Comisión total" value={fmtMoney(c.total)} icon={TrendingUp} hint={`${c.pairs} pares en total`} />
      </div>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickTile to="/ventas/nueva" icon={ShoppingCart} label="Nueva venta" emphasis />
          <QuickTile to="/inventario" icon={Search} label="Buscar stock" />
          <QuickTile to="/postventa" icon={RotateCcw} label="Cambios" />
          <QuickTile to="/asistencia" icon={ClipboardCheck} label="Marcar asistencia" />
          <QuickTile to="/mis-ingresos" icon={Wallet} label="Mi comisión" />
          <QuickTile to="/mis-ingresos" icon={Wallet} label="Mis adelantos" />
        </div>
      </section>
    </div>
  );
}

function CashierDashboard() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display font-bold text-lg mb-3">Caja</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickTile to="/ventas/por-cobrar" icon={Receipt} label="Por cobrar" emphasis />
          <QuickTile to="/ventas" icon={ShoppingCart} label="Revisar ventas" />
          <QuickTile to="/postventa" icon={RotateCcw} label="Diferencias" />
          <QuickTile to="/asistencia" icon={ClipboardCheck} label="Asistencia" />
        </div>
      </section>
    </div>
  );
}

function WarehouseDashboard() {
  const m = useDashboardMetrics();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pares disponibles" value={m.availableShoes} icon={Package} />
        <StatCard label="Accesorios" value={m.availableAcc} icon={Tag} />
        <StatCard label="Con falla" value={m.faulty} icon={AlertTriangle} tone="critical" />
        <StatCard label="En tienda" value={m.inStore} icon={Store} tone="gold" />
      </div>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Almacén</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickTile to="/inventario/ingreso" icon={Package} label="Ingreso" emphasis />
          <QuickTile to="/inventario/traslados" icon={Truck} label="Traslados" />
          <QuickTile to="/inventario/entregas" icon={Truck} label="Entregas" />
          <QuickTile to="/inventario/fallas" icon={AlertTriangle} label="Fallas" />
          <QuickTile to="/inventario/ajustes" icon={SlidersHorizontal} label="Ajustes" />
          <QuickTile to="/inventario/tienda" icon={Store} label="En tienda" />
          <QuickTile to="/asistencia" icon={ClipboardCheck} label="Asistencia" />
        </div>
      </section>
    </div>
  );
}

function RemovedRoleDashboard() {
  const m = useDashboardMetrics();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Ventas semana" value={fmtMoney(m.weekRevenue)} icon={TrendingUp} tone="gold" />
        <StatCard label="Pares semana" value={m.pairsWeek} icon={Package} />
        <StatCard label="Asistencia hoy" value={m.attendanceToday} icon={ClipboardCheck} />
        <StatCard label="Pendiente autorizar" value={m.pendingAuth} icon={ShieldCheck} tone="critical" />
      </div>
      <section>
        <h2 className="font-display font-bold text-lg mb-3">Gestión</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickTile to="/escanear" icon={ScanLine} label="Escanear" emphasis />
          <QuickTile to="/reportes" icon={BarChart3} label="Reportes" />
          {canViewCommissions && <QuickTile to="/comisiones" icon={Wallet} label="Liquidaciones" />}
          <QuickTile to="/asistencia" icon={ClipboardCheck} label="Asistencia" />
          {canReviewAuth && <QuickTile to="/autorizaciones" icon={ShieldCheck} label="Autorizaciones" />}
          <QuickTile to="/ventas" icon={ShoppingCart} label="Revisar ventas" />
          <QuickTile to="/inventario" icon={Package} label="Revisar stock" />
        </div>
      </section>
    </div>
  );
}
