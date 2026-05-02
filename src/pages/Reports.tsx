import { PageHeader } from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { StatCard } from "@/components/StatCard";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { TrendingUp, Package, ClipboardCheck, AlertTriangle, ShoppingCart } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useDashboardMetrics } from "@/lib/metrics";

const saleLineCode = (sale: { lines: Array<{ sourceUnitCodes?: string[]; unitCode: string }> }) =>
  sale.lines[0]?.sourceUnitCodes?.length ? sale.lines[0].sourceUnitCodes.join(" / ") : sale.lines[0]?.unitCode || "Sin codigo";

export default function Reports() {
  const m = useDashboardMetrics();
  const sales = useAppStore((s) => s.sales);
  const movements = useAppStore((s) => s.movements);
  const attendance = useAppStore((s) => s.attendance);
  const inventory = useAppStore((s) => s.inventory);
  const aftersales = useAppStore((s) => s.afterSales);
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);
  const confirmedSales = sales.filter((sale) => sale.status === "confirmada");
  const utilityTotal = confirmedSales.reduce(
    (acc, sale) => acc + (sale.utilityTotal ?? sale.lines.reduce((lineAcc, line) => lineAcc + (line.utility ?? line.finalPrice - (line.cost ?? 0)), 0)),
    0
  );

  return (
    <>
      <PageHeader title="Reportes" subtitle="Ventas, inventario, movimientos y trazabilidad" />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Hoy" value={fmtMoney(m.todayRevenue)} icon={TrendingUp} tone="gold" />
        <StatCard label="Semana" value={fmtMoney(m.weekRevenue)} icon={ShoppingCart} />
        <StatCard label="Utilidad" value={fmtMoney(utilityTotal)} icon={TrendingUp} tone="gold" />
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
        </TabsList>

        <TabsContent value="ventas" className="mt-4">
          <ListCard
            empty="Sin ventas"
            items={sales.map((sale) => {
              const utility = sale.utilityTotal ?? sale.lines.reduce((acc, line) => acc + (line.utility ?? line.finalPrice - (line.cost ?? 0)), 0);
              return {
                key: sale.id,
                left: `${saleLineCode(sale)} · ${sale.sellerName}`,
                sub: `${fmtDateTime(sale.timestamp)} · utilidad ${fmtMoney(utility)}`,
                right: fmtMoney(sale.total),
                badge: sale.status,
              };
            })}
          />
        </TabsContent>

        <TabsContent value="inventario" className="mt-4">
          <ListCard
            empty="Sin inventario"
            items={inventory.slice(0, 100).map((item) => {
              const product = products.find((entry) => entry.id === item.productId);
              const location = locations.find((entry) => entry.id === item.locationId);
              return {
                key: item.id,
                left: `${item.unitCode} · ${product?.brand} ${product?.model}`,
                sub: location?.name || "",
                right: "",
                badge: item.status,
              };
            })}
          />
        </TabsContent>

        <TabsContent value="movs" className="mt-4">
          <ListCard
            empty="Sin movimientos"
            items={movements.map((movement) => ({
              key: movement.id,
              left: `${movement.type.toUpperCase()} · ${movement.unitCodes.join(", ")}`,
              sub: `${movement.byUserName}${movement.receivedBy ? ` -> ${movement.receivedBy}` : ""}`,
              right: fmtDateTime(movement.timestamp),
              badge: "info" as const,
            }))}
          />
        </TabsContent>

        <TabsContent value="asist" className="mt-4">
          <ListCard
            empty="Sin asistencia"
            items={attendance.map((record) => ({
              key: record.id,
              left: record.userName,
              sub: record.locationName,
              right: fmtDateTime(record.timestamp),
              badge: "success" as const,
            }))}
          />
        </TabsContent>

        <TabsContent value="cambios" className="mt-4">
          <ListCard
            empty="Sin cambios"
            items={aftersales.map((record) => ({
              key: record.id,
              left: `${record.oldUnitCode || record.newUnitCode || "Operacion"} · ${record.type}`,
              sub: record.reason,
              right: fmtDateTime(record.timestamp),
              badge: "info" as const,
            }))}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ListCard({ items, empty }: { items: { key: string; left: string; sub?: string; right: string; badge: any }[]; empty: string }) {
  return (
    <div className="rounded-2xl bg-card border overflow-hidden">
      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.key} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{item.left}</p>
                {item.sub && <p className="text-xs text-muted-foreground truncate">{item.sub}</p>}
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{item.right}</span>
                <StatusBadge kind={item.badge} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
