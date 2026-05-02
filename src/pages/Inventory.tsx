import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowDownToLine, Package, Truck } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useCan } from "@/components/Can";
import { QRImage } from "@/components/QRImage";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import type { InventoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type PairGroup = {
  d?: InventoryItem;
  i?: InventoryItem;
};

type GroupedProduct = {
  product: ReturnType<typeof useAppStore.getState>["products"][number];
  pairs: Record<string, PairGroup>;
  units: InventoryItem[];
};

const sortedPairsFor = (pairs: Record<string, PairGroup>) =>
  Object.entries(pairs).sort(([codeA], [codeB]) => codeA.localeCompare(codeB));

const sortedUnitsFor = (units: InventoryItem[]) =>
  [...units].sort((a, b) => a.unitCode.localeCompare(b.unitCode));

const locationLabelFor = (item: InventoryItem | undefined, locationMap: Map<string, string>) =>
  item ? locationMap.get(item.locationId) || "Sin ubicacion" : "No registrada";

const sharedResponsibleNameFor = (items: Array<InventoryItem | undefined>) => {
  const presentItems = items.filter(Boolean) as InventoryItem[];
  if (presentItems.length === 0) return undefined;
  const firstResponsible = presentItems[0]?.responsibleName?.trim();
  if (!firstResponsible) return undefined;
  return presentItems.every((item) => item.responsibleName?.trim() === firstResponsible)
    ? firstResponsible
    : undefined;
};

const sharedSaleInfoFor = (
  items: Array<InventoryItem | undefined>,
  soldByMap: Map<string, { sellerName: string; saleCode: string }>
) => {
  const presentItems = items.filter(Boolean) as InventoryItem[];
  if (presentItems.length === 0) return undefined;
  const firstSale = soldByMap.get(presentItems[0].unitCode);
  if (!firstSale) return undefined;
  return presentItems.every((item) => {
    const sold = soldByMap.get(item.unitCode);
    return sold?.sellerName === firstSale.sellerName && sold?.saleCode === firstSale.saleCode;
  })
    ? firstSale
    : undefined;
};

const sharedReturnMovementFor = (
  items: Array<InventoryItem | undefined>,
  movementMap: Map<string, { type: string; toLocationId?: string; reason?: string }>
) => {
  const presentItems = items.filter(Boolean) as InventoryItem[];
  if (presentItems.length === 0) return undefined;
  const firstMovement = movementMap.get(presentItems[0].unitCode);
  if (!firstMovement || firstMovement.type !== "devolucion") return undefined;
  return presentItems.every((item) => {
    const movement = movementMap.get(item.unitCode);
    return movement?.type === "devolucion" && movement?.toLocationId === firstMovement.toLocationId;
  })
    ? firstMovement
    : undefined;
};

const stockLabelFor = (count: number, type: "zapato" | "accesorio") => {
  if (type === "zapato") return `${count} ${count === 1 ? "par" : "pares"}`;
  return `${count} ${count === 1 ? "unidad" : "unidades"}`;
};

const faultLabelFor = (count: number, type: "zapato" | "accesorio") => {
  if (type === "zapato") return `${count} ${count === 1 ? "pie con falla" : "pies con falla"}`;
  return `${count} ${count === 1 ? "unidad con falla" : "unidades con falla"}`;
};

export default function Inventory() {
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const locations = useAppStore((s) => s.locations);
  const movements = useAppStore((s) => s.movements);
  const sales = useAppStore((s) => s.sales);
  const settings = useAppStore((s) => s.settings);
  const canEntry = useCan("inventory.entry");
  const canTransfer = useCan("inventory.transfer");
  const canDelivery = useCan("inventory.delivery");
  const canFault = useCan("inventory.fault");
  const showQuickTiles = canTransfer || canDelivery || canFault;

  const [search, setSearch] = useState("");
  const [locFilter, setLocFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showQR, setShowQR] = useState<string | null>(null);

  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations]
  );
  const latestMovementByUnitCode = useMemo(() => {
    const map = new Map<string, { type: string; toLocationId?: string; reason?: string; timestamp: string }>();
    movements.forEach((movement) => {
      movement.unitCodes.forEach((unitCode) => {
        const current = map.get(unitCode);
        if (!current || movement.timestamp > current.timestamp) {
          map.set(unitCode, {
            type: movement.type,
            toLocationId: movement.toLocationId,
            reason: movement.reason,
            timestamp: movement.timestamp,
          });
        }
      });
    });
    return map;
  }, [movements]);
  const soldByUnitCode = useMemo(() => {
    const map = new Map<string, { sellerName: string; saleCode: string }>();
    sales
      .filter((sale) => sale.status === "confirmada")
      .forEach((sale) => {
        sale.lines.forEach((line) => {
          const unitCodes = line.sourceUnitCodes?.length
            ? line.sourceUnitCodes
            : line.isPair
              ? [`${line.unitCode}-D`, `${line.unitCode}-I`]
              : [line.unitCode];
          unitCodes.forEach((unitCode) => {
            map.set(unitCode, { sellerName: sale.sellerName, saleCode: sale.code });
          });
        });
      });
    return map;
  }, [sales]);

  const grouped = useMemo<GroupedProduct[]>(() => {
    const map = new Map<string, GroupedProduct>();
    const normalizedSearch = search.trim().toUpperCase();
    const pairSearchCode = /^[A-Z]\d{5}(?:-(D|I))?$/.test(normalizedSearch)
      ? normalizedSearch.replace(/-(D|I)$/, "")
      : "";

    inventory.forEach((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) return;
      if (locFilter !== "todos" && item.locationId !== locFilter) return;
      if (statusFilter !== "todos" && item.status !== statusFilter) return;
      if (search) {
        if (pairSearchCode) {
          if (item.pairCode !== pairSearchCode && item.unitCode !== pairSearchCode) return;
        } else {
          const text = `${product.brand} ${product.model} ${product.color} ${item.unitCode} ${item.pairCode || ""} ${item.responsibleName || ""}`.toLowerCase();
          if (!text.includes(search.toLowerCase())) return;
        }
      }

      if (!map.has(product.id)) {
        map.set(product.id, { product, pairs: {}, units: [] });
      }

      const group = map.get(product.id)!;
      if (item.pairCode) {
        group.pairs[item.pairCode] ||= {};
        if (item.side === "D") group.pairs[item.pairCode].d = item;
        if (item.side === "I") group.pairs[item.pairCode].i = item;
      } else {
        group.units.push(item);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      `${a.product.brand} ${a.product.model}`.localeCompare(`${b.product.brand} ${b.product.model}`)
    );
  }, [inventory, locFilter, products, search, statusFilter]);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
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
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Buscar producto o codigo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 min-w-48"
        />
        <Select value={locFilter} onValueChange={setLocFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Ubicacion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las ubicaciones</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="disponible">Disponibles</SelectItem>
            <SelectItem value="reservado">Reservados</SelectItem>
            <SelectItem value="vendido">Vendidos</SelectItem>
            <SelectItem value="con_falla">Disponibles con falla</SelectItem>
            <SelectItem value="bloqueado">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {grouped.map(({ product, pairs, units }) => {
          const sortedPairs = sortedPairsFor(pairs);
          const sortedUnits = sortedUnitsFor(units);
          const availablePairs = sortedPairs.filter(([, pair]) => pair.d?.status === "disponible" && pair.i?.status === "disponible").length;
          const availableUnits = sortedUnits.filter((item) => item.status === "disponible").length;
          const faultyPieces = sortedPairs
            .flatMap(([, pair]) => [pair.d, pair.i])
            .filter((item): item is InventoryItem => Boolean(item) && item.status === "con_falla").length;
          const faultyUnits = sortedUnits.filter((item) => item.status === "con_falla").length;
          const lowStock = product.type === "zapato"
            ? availablePairs <= settings.lowStockThreshold
            : availableUnits <= settings.lowStockThreshold;
          const stockLabel = stockLabelFor(product.type === "zapato" ? availablePairs : availableUnits, product.type);
          const showFaultLabel = product.type === "zapato" ? faultyPieces > 0 : faultyUnits > 0;
          const faultLabel = faultLabelFor(product.type === "zapato" ? faultyPieces : faultyUnits, product.type);

          return (
            <div key={product.id} className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between flex-wrap gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold truncate">{product.brand} · {product.model}</p>
                    {lowStock && <StatusBadge kind="warning">Stock bajo</StatusBadge>}
                    {showFaultLabel && <StatusBadge kind="critical">{faultLabel}</StatusBadge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {product.color}
                    {product.size ? ` · Talla ${product.size}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Stock actual</p>
                  <p className="font-display font-extrabold text-lg">{stockLabel}</p>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {product.type === "zapato" && sortedPairs.map(([pairCode, pair]) => {
                  const sharedResponsible = sharedResponsibleNameFor([pair.d, pair.i]);
                  const soldInfo = sharedSaleInfoFor([pair.d, pair.i], soldByUnitCode);
                  const returnMovement = sharedReturnMovementFor([pair.d, pair.i], latestMovementByUnitCode);
                  const returnLocationName = returnMovement?.toLocationId ? locationMap.get(returnMovement.toLocationId) : undefined;

                  return (
                    <button
                      key={pairCode}
                      onClick={() => setShowQR(pairCode)}
                      className="w-full text-left rounded-xl border border-border bg-secondary/20 p-3 hover:border-accent transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Par completo</p>
                          <p className="mt-1 font-mono font-bold text-sm">{pairCode}</p>
                          {soldInfo ? (
                            <p className="mt-1 text-xs font-semibold text-success">Vendido por: {soldInfo.sellerName}</p>
                          ) : sharedResponsible ? (
                            <p className="mt-1 text-xs font-semibold text-foreground">Lo tiene: {sharedResponsible}</p>
                          ) : null}
                          {returnMovement && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Volvio a: {returnLocationName || "Almacen"}
                              {returnMovement.reason ? ` · ${returnMovement.reason}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {returnMovement && <StatusBadge kind="info">Volvio</StatusBadge>}
                          {[pair.d, pair.i].some((item) => item?.status === "con_falla") && (
                            <StatusBadge kind="critical">Hay pieza con falla</StatusBadge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <PairPieceCard
                          label="Derecha"
                          item={pair.d}
                          locationLabel={locationLabelFor(pair.d, locationMap)}
                        />
                        <PairPieceCard
                          label="Izquierda"
                          item={pair.i}
                          locationLabel={locationLabelFor(pair.i, locationMap)}
                        />
                      </div>
                    </button>
                  );
                })}

                {product.type === "accesorio" && (
                  <div className="grid gap-2 xl:grid-cols-2">
                    {sortedUnits.map((item) => {
                      const soldInfo = sharedSaleInfoFor([item], soldByUnitCode);
                      const returnMovement = sharedReturnMovementFor([item], latestMovementByUnitCode);
                      const returnLocationName = returnMovement?.toLocationId ? locationMap.get(returnMovement.toLocationId) : undefined;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setShowQR(item.unitCode)}
                          className="text-left rounded-xl border border-border bg-secondary/20 p-3 hover:border-accent transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unidad</p>
                              <p className="mt-1 font-mono font-bold text-sm">{item.unitCode}</p>
                              {soldInfo ? (
                                <p className="mt-1 text-xs font-semibold text-success">Vendido por: {soldInfo.sellerName}</p>
                              ) : item.responsibleName ? (
                                <p className="mt-1 text-xs font-semibold text-foreground">Lo tiene: {item.responsibleName}</p>
                              ) : null}
                              {returnMovement && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Volvio a: {returnLocationName || "Almacen"}
                                  {returnMovement.reason ? ` · ${returnMovement.reason}` : ""}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {returnMovement && <StatusBadge kind="info">Volvio</StatusBadge>}
                              <StatusBadge kind={item.status} />
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">Ubicacion: {locationLabelFor(item, locationMap)}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
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
              <p className="text-xs text-muted-foreground">Imprime estos codigos para el par o unidad</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PairPieceCard({
  label,
  item,
  locationLabel,
}: {
  label: string;
  item?: InventoryItem;
  locationLabel: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-background/90 px-3 py-2",
        item?.status === "con_falla" && "border-critical/30 bg-critical-soft/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pie {label.toLowerCase()}</p>
          <p className="mt-1 font-mono text-sm break-all">{item?.unitCode || `Sin pieza ${label.toLowerCase()}`}</p>
        </div>
        {item ? (
          <StatusBadge kind={item.status} className="shrink-0" />
        ) : (
          <StatusBadge kind="muted" className="shrink-0">No registrado</StatusBadge>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Ubicacion: {locationLabel}</p>
      {item?.responsibleName && <p className="mt-1 text-xs text-muted-foreground">Lo tiene: {item.responsibleName}</p>}
      {!item && <p className="mt-1 text-xs text-muted-foreground">Falta registrar esta pieza en el inventario.</p>}
    </div>
  );
}
