import { PageHeader } from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { StatCard } from "@/components/StatCard";
import { fmtMoney } from "@/lib/format";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { TrendingUp, Package, ClipboardCheck, AlertTriangle, RotateCcw, ShieldCheck, Wallet, Truck } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { useDashboardMetrics } from "@/lib/metrics";

export default function Reports() {
  const m = useDashboardMetrics();
  const sales = useAppStore((s) => s.sales);
  const movements = useAppStore((s) => s.movements);
  const attendance = useAppStore((s) => s.attendance);
  const inventory = useAppStore((s) => s.inventory);
  const aftersales = useAppStore((s) => s.afterSales);
  const auths = useAppStore((s) => s.authorizations);
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);

  return (
    <>
      <PageHeader title="Reportes" subtitle="Datos del prototipo (mock + locales)" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Hoy" value={fmtMoney(m.todayRevenue)} icon={TrendingUp} tone="gold" />
        <StatCard label="Semana" value={fmtMoney(m.weekRevenue)} icon={ShoppingCartIcon} />
        <StatCard label="Stock total" value={inventory.length} icon={Package} />
        <StatCard label="Asistencia hoy" value={m.attendanceToday} icon={ClipboardCheck} />
        <StatCard label="Fallas" value={m.faulty} icon={AlertTriangle} tone="critical" />
      </div>

      <Tabs defaultValue="ventas">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="movs">Movimientos</TabsTrigger>
          <TabsTrigger value="asist">Asistencia</TabsTrigger>
          <TabsTrigger value="cambios">Cambios</TabsTrigger>
          <TabsTrigger value="auth">Autorizaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="mt-4">
          <ListCard
            empty="Sin ventas"
            items={sales.map((s) => ({ key: s.id, left: `${s.code} · ${s.sellerName}`, sub: fmtDateTime(s.timestamp), right: fmtMoney(s.total), badge: s.status }))}
          />
        </TabsContent>
        <TabsContent value="inventario" className="mt-4">
          <ListCard
            empty="Sin inventario"
            items={inventory.slice(0, 100).map((i) => {
              const p = products.find((x) => x.id === i.productId);
              const l = locations.find((x) => x.id === i.locationId);
              return { key: i.id, left: `${i.unitCode} · ${p?.brand} ${p?.model}`, sub: l?.name || "", right: "", badge: i.status };
            })}
          />
        </TabsContent>
        <TabsContent value="movs" className="mt-4">
          <ListCard
            empty="Sin movimientos"
            items={movements.map((mv) => ({ key: mv.id, left: `${mv.type.toUpperCase()} · ${mv.unitCodes.join(", ")}`, sub: `${mv.byUserName}${mv.receivedBy ? ` → ${mv.receivedBy}` : ""}`, right: fmtDateTime(mv.timestamp), badge: "info" as const }))}
          />
        </TabsContent>
        <TabsContent value="asist" className="mt-4">
          <ListCard
            empty="Sin asistencia"
            items={attendance.map((a) => ({ key: a.id, left: a.userName, sub: a.locationName, right: fmtDateTime(a.timestamp), badge: "success" as const }))}
          />
        </TabsContent>
        <TabsContent value="cambios" className="mt-4">
          <ListCard
            empty="Sin cambios"
            items={aftersales.map((a) => ({ key: a.id, left: `${a.saleCode} · ${a.type}`, sub: a.reason, right: fmtDateTime(a.timestamp), badge: "info" as const }))}
          />
        </TabsContent>
        <TabsContent value="auth" className="mt-4">
          <ListCard
            empty="Sin autorizaciones"
            items={auths.map((a) => ({ key: a.id, left: a.detail, sub: a.requestedByName, right: fmtDateTime(a.timestamp), badge: a.status }))}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ShoppingCartIcon(props: any) {
  return <TrendingUp {...props} />;
}

function ListCard({ items, empty }: { items: { key: string; left: string; sub?: string; right: string; badge: any }[]; empty: string }) {
  return (
    <div className="rounded-2xl bg-card border overflow-hidden">
      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">
          {items.map((it) => (
            <li key={it.key} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{it.left}</p>
                {it.sub && <p className="text-xs text-muted-foreground truncate">{it.sub}</p>}
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{it.right}</span>
                <StatusBadge kind={it.badge} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
