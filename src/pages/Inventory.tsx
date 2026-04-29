import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { useCan } from "@/components/Can";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Package, Truck, AlertTriangle, ArrowDownToLine, Store, SlidersHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { QRImage } from "@/components/QRImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Inventory() {
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const locations = useAppStore((s) => s.locations);
  const settings = useAppStore((s) => s.settings);
  const canEntry = useCan("inventory.entry");
  const canTransfer = useCan("inventory.transfer");
  const canDelivery = useCan("inventory.delivery");
  const canFault = useCan("inventory.fault");
  const canAdjust = useCan("inventory.adjust");
  const canStorefront = useCan("inventory.storefront");
  const showQuickTiles = canTransfer || canDelivery || canFault || canAdjust || canStorefront;

  const [search, setSearch] = useState("");
  const [locFilter, setLocFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showQR, setShowQR] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, { product: (typeof products)[number]; pairs: Record<string, { d?: any; i?: any }>; units: any[] }>();
    inventory.forEach((it) => {
      const product = products.find((p) => p.id === it.productId);
      if (!product) return;
      if (locFilter !== "todos" && it.locationId !== locFilter) return;
      if (statusFilter !== "todos" && it.status !== statusFilter) return;
      if (search) {
        const t = `${product.brand} ${product.model} ${it.unitCode}`.toLowerCase();
        if (!t.includes(search.toLowerCase())) return;
      }
      const key = product.id;
      if (!map.has(key)) map.set(key, { product, pairs: {}, units: [] });
      const g = map.get(key)!;
      if (it.pairCode) {
        g.pairs[it.pairCode] ||= {};
        if (it.side === "D") g.pairs[it.pairCode].d = it;
        if (it.side === "I") g.pairs[it.pairCode].i = it;
      } else {
        g.units.push(it);
      }
    });
    return Array.from(map.values());
  }, [inventory, products, search, locFilter, statusFilter]);

  return (
    <>
      <PageHeader
        title="Inventario"
        subtitle={`${inventory.length} unidades registradas`}
        action={
          <div className="flex gap-2">
            {canEntry && (
              <Link to="/inventario/ingreso">
                <Button className="bg-foreground text-background hover:bg-foreground/90">
                  <ArrowDownToLine className="size-4 mr-1" /> Ingreso
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {showQuickTiles && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          {canTransfer && (
            <Link to="/inventario/traslados" className="quick-tile">
              <Truck className="size-5 text-accent" />
              <p className="font-semibold text-sm">Traslados</p>
            </Link>
          )}
          {canDelivery && (
            <Link to="/inventario/entregas" className="quick-tile">
              <Package className="size-5 text-accent" />
              <p className="font-semibold text-sm">Entregas</p>
            </Link>
          )}
          {canFault && (
            <Link to="/inventario/fallas" className="quick-tile">
              <AlertTriangle className="size-5 text-critical" />
              <p className="font-semibold text-sm">Fallas</p>
            </Link>
          )}
          {canAdjust && (
            <Link to="/inventario/ajustes" className="quick-tile">
              <SlidersHorizontal className="size-5 text-accent" />
              <p className="font-semibold text-sm">Ajustes</p>
            </Link>
          )}
          {canStorefront && (
            <Link to="/inventario/tienda" className="quick-tile">
              <Store className="size-5 text-gold" />
              <p className="font-semibold text-sm">En tienda</p>
            </Link>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Buscar producto o código" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-48" />
        <Select value={locFilter} onValueChange={setLocFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Ubicación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las ubicaciones</SelectItem>
            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="disponible">Disponibles</SelectItem>
            <SelectItem value="reservado">Reservados</SelectItem>
            <SelectItem value="vendido">Vendidos</SelectItem>
            <SelectItem value="con_falla">Con falla</SelectItem>
            <SelectItem value="bloqueado">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {grouped.map(({ product, pairs, units }) => {
          const availPairs = Object.values(pairs).filter((p) => p.d?.status === "disponible" && p.i?.status === "disponible").length;
          const lowStock = product.type === "zapato" ? availPairs <= settings.lowStockThreshold : units.filter((u) => u.status === "disponible").length <= settings.lowStockThreshold;
          return (
            <div key={product.id} className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold truncate">{product.brand} · {product.model}</p>
                    {lowStock && <StatusBadge kind="critical">Stock bajo</StatusBadge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{product.color}{product.size ? ` · Talla ${product.size}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Disponible</p>
                  <p className="font-display font-extrabold text-lg">{product.type === "zapato" ? `${availPairs} pares` : `${units.filter((u) => u.status === "disponible").length} u`}</p>
                </div>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(pairs).map(([code, p]) => {
                  const status: any = p.d?.status === "disponible" && p.i?.status === "disponible" ? "disponible" : (p.d?.status || p.i?.status);
                  const loc = locations.find((l) => l.id === (p.d?.locationId || p.i?.locationId))?.name;
                  const responsible = p.d?.responsibleName || p.i?.responsibleName;
                  return (
                    <button
                      key={code}
                      onClick={() => setShowQR(code)}
                      className="text-left rounded-xl border border-border bg-secondary/30 p-2.5 hover:border-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs">{code}</span>
                        <StatusBadge kind={status} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{loc}{responsible ? ` - ${responsible}` : ""}</p>
                    </button>
                  );
                })}
                {units.map((u) => {
                  const loc = locations.find((l) => l.id === u.locationId)?.name;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setShowQR(u.unitCode)}
                      className="text-left rounded-xl border border-border bg-secondary/30 p-2.5 hover:border-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs">{u.unitCode}</span>
                        <StatusBadge kind={u.status} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{loc}{u.responsibleName ? ` - ${u.responsibleName}` : ""}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {grouped.length === 0 && <p className="text-center text-muted-foreground py-10">Sin resultados</p>}
      </div>

      <Dialog open={!!showQR} onOpenChange={() => setShowQR(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-mono">{showQR}</DialogTitle>
          </DialogHeader>
          {showQR && (
            <div className="flex flex-col items-center gap-4 py-4">
              {showQR.startsWith("A") && !showQR.includes("-") ? (
                <div className="flex gap-3">
                  <div className="text-center">
                    <QRImage value={`${showQR}-D`} size={140} />
                    <p className="text-xs font-mono mt-1">{showQR}-D</p>
                  </div>
                  <div className="text-center">
                    <QRImage value={`${showQR}-I`} size={140} />
                    <p className="text-xs font-mono mt-1">{showQR}-I</p>
                  </div>
                </div>
              ) : (
                <QRImage value={showQR} size={200} />
              )}
              <p className="text-xs text-muted-foreground">Imprime estos códigos para el par o unidad</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
