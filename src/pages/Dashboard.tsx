import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  ClipboardCheck,
  MapPin,
  Package,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { QuickTile } from "@/components/QuickTile";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, type StatusKind } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { useDashboardMetrics, useMyCommission } from "@/lib/metrics";
import { useAppStore, useCurrentRole, useCurrentUser } from "@/lib/store";
import {
  formatUserRoles,
  operationalRoleFor,
  type InventoryItem,
  type Movement,
  type Sale,
} from "@/lib/types";

type DashboardTraceItem = {
  key: string;
  code: string;
  productLabel: string;
  note: string;
  badgeKind: StatusKind;
  badgeLabel: string;
  canReturn?: boolean;
  returnLocationId?: string;
  returnLocationName?: string;
};

const mainCodeForItem = (item?: InventoryItem) => item?.pairCode || item?.unitCode || "";

const mainCodeForUnitCode = (unitCode: string, itemByUnitCode: Map<string, InventoryItem>) =>
  itemByUnitCode.get(unitCode)?.pairCode || unitCode.replace(/-(D|I)$/i, "");

const productLabelForItem = (
  item: InventoryItem | undefined,
  productById: Map<string, { brand: string; model: string }>
) => {
  if (!item) return "Producto";
  const product = productById.get(item.productId);
  return product ? `${product.brand} - ${product.model}` : item.productId;
};

const latestMovementByMainCode = (
  movements: Movement[],
  type: Movement["type"],
  itemByUnitCode: Map<string, InventoryItem>
) => {
  const map = new Map<string, Movement>();
  movements
    .filter((movement) => movement.type === type)
    .forEach((movement) => {
      movement.unitCodes.forEach((unitCode) => {
        const key = mainCodeForUnitCode(unitCode, itemByUnitCode);
        const current = map.get(key);
        if (!current || movement.timestamp > current.timestamp) {
          map.set(key, movement);
        }
      });
    });
  return map;
};

const latestSaleByMainCode = (sales: Sale[]) => {
  const map = new Map<string, { sale: Sale; line: Sale["lines"][number] }>();
  sales
    .filter((sale) => sale.status === "confirmada")
    .forEach((sale) => {
      sale.lines.forEach((line) => {
        const key = line.unitCode;
        const current = map.get(key);
        if (!current || sale.timestamp > current.sale.timestamp) {
          map.set(key, { sale, line });
        }
      });
    });
  return map;
};

export default function Dashboard() {
  const user = useCurrentUser();
  const role = useCurrentRole();

  if (!user) return null;

  return (
    <>
      <PageHeader
        title={`Hola, ${user.name.split(" ")[0]}`}
        subtitle={`${formatUserRoles(user)} - ${new Date().toLocaleDateString("es-PE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}`}
      />
      {role === "admin" && <AdminDashboard />}
      {role === "vendedor" && <SellerDashboard />}
      {role === "cajero" && <CashierDashboard />}
      {role === "almacen" && <WarehouseDashboard />}
    </>
  );
}

function AdminDashboard() {
  const metrics = useDashboardMetrics();
  const sales = useAppStore((state) => state.sales).slice(0, 5);
  const auths = useAppStore((state) => state.authorizations)
    .filter((item) => item.status === "pendiente")
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Ventas hoy"
          value={fmtMoney(metrics.todayRevenue)}
          icon={TrendingUp}
          tone="gold"
          hint={`${metrics.pairsToday} pares hoy`}
        />
        <StatCard
          label="Ventas semana"
          value={fmtMoney(metrics.weekRevenue)}
          icon={ShoppingCart}
          hint={`${metrics.pairsWeek} pares`}
        />
        <StatCard
          label="Pares disponibles"
          value={metrics.availableShoes}
          icon={Package}
          hint={`${metrics.availableAcc} accesorios`}
        />
        <StatCard
          label="Autorizaciones"
          value={metrics.pendingAuth}
          icon={ShieldCheck}
          tone={metrics.pendingAuth ? "critical" : "default"}
          hint="pendientes"
        />
      </div>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Modulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickTile to="/autorizaciones" icon={ShieldCheck} label="Autorizaciones" emphasis />
          <QuickTile to="/ventas/por-cobrar" icon={Receipt} label="Por cobrar" />
          <QuickTile to="/ventas" icon={ShoppingCart} label="Ventas" />
          <QuickTile to="/inventario" icon={Package} label="Inventario" />
          <QuickTile to="/inventario/ingreso" icon={Package} label="Ingreso" />
          <QuickTile to="/inventario/traslados" icon={Truck} label="Traslados" />
          <QuickTile to="/inventario/entregas" icon={Truck} label="Entregas" />
          <QuickTile to="/usuarios" icon={Users} label="Usuarios" />
          <QuickTile to="/ubicaciones" icon={MapPin} label="Ubicaciones" />
          <QuickTile to="/catalogo" icon={Tag} label="Catalogo" />
          <QuickTile to="/adelantos" icon={Wallet} label="Adelantos" />
          <QuickTile to="/comisiones" icon={Wallet} label="Liquidaciones" />
          <QuickTile to="/reportes" icon={BarChart3} label="Reportes" />
          <QuickTile to="/configuracion" icon={Settings} label="Reglas" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TracePanel
          title="Ultimas ventas"
          actionLabel="Ver todas"
          actionTo="/ventas"
          items={sales.map((sale) => ({
            key: sale.id,
            code: sale.code,
            productLabel: sale.sellerName,
            note: fmtDateTime(sale.timestamp),
            badgeKind: sale.status,
            badgeLabel: fmtMoney(sale.total),
          }))}
          emptyText="Sin ventas registradas todavia"
        />

        <TracePanel
          title="Autorizaciones pendientes"
          actionLabel="Gestionar"
          actionTo="/autorizaciones"
          items={auths.map((auth) => ({
            key: auth.id,
            code: "Pendiente",
            productLabel: auth.detail,
            note: `${auth.requestedByName} - ${fmtDateTime(auth.timestamp)}`,
            badgeKind: "pendiente",
            badgeLabel: "Revisar",
          }))}
          emptyText="Todo en orden"
        />
      </div>
    </div>
  );
}

function SellerDashboard() {
  const user = useCurrentUser();
  const commission = useMyCommission();
  const inventory = useAppStore((state) => state.inventory);
  const products = useAppStore((state) => state.products);
  const locations = useAppStore((state) => state.locations);
  const movements = useAppStore((state) => state.movements);
  const sales = useAppStore((state) => state.sales);
  const transferItems = useAppStore((state) => state.transferItems);
  const [returningCode, setReturningCode] = useState<string | null>(null);

  const trace = useMemo(() => {
    if (!user) {
      return {
        assigned: [] as DashboardTraceItem[],
        returned: [] as DashboardTraceItem[],
        sold: [] as DashboardTraceItem[],
      };
    }

    const productById = new Map(products.map((product) => [product.id, { brand: product.brand, model: product.model }]));
    const locationById = new Map(locations.map((location) => [location.id, location.name]));
    const itemByUnitCode = new Map(inventory.map((item) => [item.unitCode, item]));
    const deliveredMovements = latestMovementByMainCode(movements, "entrega", itemByUnitCode);
    const returnedMovements = latestMovementByMainCode(movements, "devolucion", itemByUnitCode);

    const assignedSeen = new Set<string>();
    const assigned = inventory
      .filter((item) => item.responsibleName === user.name && item.status !== "vendido")
      .flatMap((item) => {
        const key = mainCodeForItem(item);
        if (!key || assignedSeen.has(key)) return [];
        assignedSeen.add(key);
        const deliveryMovement = deliveredMovements.get(key);
        const returnLocationId = deliveryMovement?.fromLocationId;
        const returnLocationName = returnLocationId ? locationById.get(returnLocationId) || "almacen de origen" : undefined;
        return [
          {
            key,
            code: key,
            productLabel: productLabelForItem(item, productById),
            note: returnLocationName
              ? `Lo tienes en ${locationById.get(item.locationId) || "ubicacion actual"} - Vuelve a ${returnLocationName}`
              : `Lo tienes en ${locationById.get(item.locationId) || "ubicacion actual"}`,
            badgeKind: item.status === "con_falla" ? "critical" : "info",
            badgeLabel: item.status === "con_falla" ? "Con falla" : "A cargo",
            canReturn: Boolean(returnLocationId),
            returnLocationId,
            returnLocationName,
          },
        ];
      })
      .slice(0, 4);

    const returned = Array.from(returnedMovements.entries())
      .filter(([, movement]) => movement.reason?.toLowerCase().includes(user.name.toLowerCase()))
      .sort((a, b) => b[1].timestamp.localeCompare(a[1].timestamp))
      .map(([key, movement]) => {
        const sampleCode = movement.unitCodes[0];
        const item = itemByUnitCode.get(sampleCode);
        return {
          key,
          code: key,
          productLabel: productLabelForItem(item, productById),
          note: `Volvio a ${locationById.get(movement.toLocationId || "") || "almacen"}`,
          badgeKind: "warning" as const,
          badgeLabel: "Volvio",
        };
      })
      .slice(0, 4);

    const sold = sales
      .filter((sale) => sale.status === "confirmada" && sale.sellerId === user.id)
      .flatMap((sale) =>
        sale.lines.map((line) => ({
          key: `${sale.id}-${line.unitCode}`,
          code: line.unitCode,
          productLabel: line.productLabel,
          note: `${sale.code} - ${line.sourceLocationName || "origen registrado"}`,
          badgeKind: "success" as const,
          badgeLabel: "Vendido",
        }))
      )
      .slice(0, 4);

    return { assigned, returned, sold };
  }, [inventory, locations, movements, products, sales, user]);

  const handleReturn = (item: DashboardTraceItem) => {
    if (!user) return;
    if (!item.returnLocationId) {
      toast.error("No encontre el almacen de origen para esta devolucion");
      return;
    }

    try {
      setReturningCode(item.code);
      transferItems([item.code], item.returnLocationId, user.id, user.name, operationalRoleFor(user, "vendedor"));
      toast.success("Devolucion registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la devolucion");
    } finally {
      setReturningCode(null);
    }
  };

  return (
    <div className="space-y-6">
      <HoldingPanel
        title="Lo que tengo ahora"
        items={trace.assigned}
        emptyText="No tienes pares o unidades a cargo"
        onReturnItem={handleReturn}
        returningCode={returningCode}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Comision semana"
          value={fmtMoney(commission.weekTotal)}
          icon={Wallet}
          tone="gold"
          hint={`${commission.weekPairs} pares vendidos`}
        />
        <StatCard
          label="Comision total"
          value={fmtMoney(commission.total)}
          icon={TrendingUp}
          hint={`${commission.pairs} pares en total`}
        />
        <StatCard label="A mi cargo" value={trace.assigned.length} icon={Package} hint="pares o unidades" />
        <StatCard label="Volvieron" value={trace.returned.length} icon={RotateCcw} hint="al almacen" />
        <StatCard label="Vendidos" value={trace.sold.length} icon={ShoppingCart} tone="success" hint="confirmados" />
      </div>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Mis modulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickTile to="/ventas/nueva" icon={ShoppingCart} label="Nueva venta" emphasis />
          <QuickTile to="/ventas" icon={Receipt} label="Ventas" />
          <QuickTile to="/inventario" icon={Package} label="Inventario" />
          <QuickTile to="/inventario" icon={Search} label="Buscar stock" />
          <QuickTile to="/postventa" icon={RotateCcw} label="Cambios" />
          <QuickTile to="/asistencia" icon={ClipboardCheck} label="Marcar asistencia" />
          <QuickTile to="/mis-ingresos" icon={Wallet} label="Mis ingresos" />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TracePanel title="Volvieron al almacen" items={trace.returned} emptyText="No hay devoluciones registradas" />
        <TracePanel title="Ya vendiste" items={trace.sold} emptyText="Aun no tienes ventas confirmadas" />
      </div>
    </div>
  );
}

function CashierDashboard() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display font-bold text-lg mb-3">Mis modulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickTile to="/ventas/por-cobrar" icon={Receipt} label="Por cobrar" emphasis />
          <QuickTile to="/ventas" icon={ShoppingCart} label="Ventas" />
          <QuickTile to="/postventa" icon={RotateCcw} label="Postventa" />
          <QuickTile to="/adelantos" icon={Wallet} label="Adelantos" />
          <QuickTile to="/reportes" icon={BarChart3} label="Reportes" />
          <QuickTile to="/asistencia" icon={ClipboardCheck} label="Asistencia" />
        </div>
      </section>
    </div>
  );
}

function WarehouseDashboard() {
  const user = useCurrentUser();
  const metrics = useDashboardMetrics();
  const inventory = useAppStore((state) => state.inventory);
  const products = useAppStore((state) => state.products);
  const locations = useAppStore((state) => state.locations);
  const movements = useAppStore((state) => state.movements);
  const sales = useAppStore((state) => state.sales);

  const trace = useMemo(() => {
    if (!user) {
      return {
        active: [] as DashboardTraceItem[],
        returned: [] as DashboardTraceItem[],
        sold: [] as DashboardTraceItem[],
      };
    }

    const productById = new Map(products.map((product) => [product.id, { brand: product.brand, model: product.model }]));
    const locationById = new Map(locations.map((location) => [location.id, location.name]));
    const itemByUnitCode = new Map(inventory.map((item) => [item.unitCode, item]));
    const soldByMainCode = latestSaleByMainCode(sales);
    const returnedByMainCode = latestMovementByMainCode(movements, "devolucion", itemByUnitCode);

    const seen = new Set<string>();
    const active: DashboardTraceItem[] = [];
    const returned: DashboardTraceItem[] = [];
    const sold: DashboardTraceItem[] = [];

    movements
      .filter((movement) => movement.type === "entrega" && movement.byUserId === user.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .forEach((movement) => {
        const keys = Array.from(
          new Set(movement.unitCodes.map((unitCode) => mainCodeForUnitCode(unitCode, itemByUnitCode)))
        );

        keys.forEach((key) => {
          if (!key || seen.has(key)) return;
          seen.add(key);

          const returnMovement = returnedByMainCode.get(key);
          const soldInfo = soldByMainCode.get(key);
          const sampleItem = movement.unitCodes.map((unitCode) => itemByUnitCode.get(unitCode)).find(Boolean);

          if (
            soldInfo &&
            soldInfo.sale.timestamp >= movement.timestamp &&
            (!returnMovement || soldInfo.sale.timestamp >= returnMovement.timestamp)
          ) {
            sold.push({
              key,
              code: key,
              productLabel: soldInfo.line.productLabel || productLabelForItem(sampleItem, productById),
              note: `Lo vendio ${soldInfo.sale.sellerName}`,
              badgeKind: "success",
              badgeLabel: "Vendido",
            });
            return;
          }

          if (returnMovement && returnMovement.timestamp >= movement.timestamp) {
            returned.push({
              key,
              code: key,
              productLabel: productLabelForItem(sampleItem, productById),
              note: `Volvio a ${locationById.get(returnMovement.toLocationId || "") || "almacen"}`,
              badgeKind: "warning",
              badgeLabel: "Volvio",
            });
            return;
          }

          active.push({
            key,
            code: key,
            productLabel: productLabelForItem(sampleItem, productById),
            note: `Lo tiene ${movement.receivedBy || "usuario asignado"}`,
            badgeKind: "info",
            badgeLabel: "Entregado",
          });
        });
      });

    return {
      active: active.slice(0, 4),
      returned: returned.slice(0, 4),
      sold: sold.slice(0, 4),
    };
  }, [inventory, locations, movements, products, sales, user]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Pares disponibles" value={metrics.availableShoes} icon={Package} />
        <StatCard label="Accesorios" value={metrics.availableAcc} icon={Tag} />
        <StatCard label="Con falla" value={metrics.faulty} icon={AlertTriangle} tone="critical" />
        <StatCard label="Entregados" value={trace.active.length} icon={Truck} hint="siguen a cargo" />
        <StatCard label="Volvieron" value={trace.returned.length} icon={RotateCcw} hint="de colaboradores" />
        <StatCard label="Vendidos" value={trace.sold.length} icon={ShoppingCart} tone="success" hint="de tus entregas" />
      </div>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Mis modulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickTile to="/inventario" icon={Package} label="Inventario" />
          <QuickTile to="/inventario/ingreso" icon={Package} label="Ingreso" emphasis />
          <QuickTile to="/inventario/traslados" icon={Truck} label="Traslados" />
          <QuickTile to="/inventario/entregas" icon={Truck} label="Entregas" />
          <QuickTile to="/inventario/fallas" icon={AlertTriangle} label="Fallas" />
          <QuickTile to="/asistencia" icon={ClipboardCheck} label="Asistencia" />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <TracePanel title="Entregados y activos" items={trace.active} emptyText="No hay entregas activas a colaboradores" />
        <TracePanel title="Volvieron" items={trace.returned} emptyText="No hay devoluciones de entregas" />
        <TracePanel title="Ya se vendieron" items={trace.sold} emptyText="Aun no se vendieron entregas tuyas" />
      </div>
    </div>
  );
}

function HoldingPanel({
  title,
  items,
  emptyText,
  onReturnItem,
  returningCode,
}: {
  title: string;
  items: DashboardTraceItem[];
  emptyText: string;
  onReturnItem: (item: DashboardTraceItem) => void;
  returningCode: string | null;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="px-4 py-4 border-b border-border/60 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Aqui ves primero lo que tienes contigo. Si vuelve al almacen o se vende, desaparece de esta lista.
            </p>
          </div>
          <StatusBadge kind="info">{items.length}</StatusBadge>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground text-center">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.key} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                  <p className="font-medium leading-tight">{item.productLabel}</p>
                  <p className="text-xs text-muted-foreground">{item.note}</p>
                </div>
                <StatusBadge kind={item.badgeKind}>{item.badgeLabel}</StatusBadge>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-center gap-2"
                onClick={() => onReturnItem(item)}
                disabled={!item.canReturn || returningCode === item.code}
              >
                <ArrowRightLeft className="size-4" />
                {returningCode === item.code
                  ? "Devolviendo..."
                  : `Devolver${item.returnLocationName ? ` a ${item.returnLocationName}` : ""}`}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TracePanel({
  title,
  items,
  emptyText,
  actionLabel,
  actionTo,
}: {
  title: string;
  items: DashboardTraceItem[];
  emptyText: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3">
        <h3 className="font-display font-bold">{title}</h3>
        {actionLabel && actionTo ? (
          <Link to={actionTo} className="text-xs font-medium text-accent hover:underline">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground text-center">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.key} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                <p className="font-medium truncate">{item.productLabel}</p>
                <p className="text-xs text-muted-foreground truncate">{item.note}</p>
              </div>
              <StatusBadge kind={item.badgeKind}>{item.badgeLabel}</StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
