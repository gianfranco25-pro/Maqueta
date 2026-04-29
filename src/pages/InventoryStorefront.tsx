import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { isLocationActive, isOperationalLocation, isStorageLocation, operationalRoleFor } from "@/lib/types";

type OperationalItem = {
  code: string;
  productId: string;
  locationId: string;
  label: string;
  isPair: boolean;
};

const buildOperationalItems = (
  inventory: ReturnType<typeof useAppStore.getState>["inventory"],
  products: ReturnType<typeof useAppStore.getState>["products"],
  locationIds: Set<string>
) => {
  const pairs = new Map<string, { productId: string; locationId: string; d: boolean; i: boolean }>();
  const units: OperationalItem[] = [];

  inventory.forEach((item) => {
    if (item.status !== "disponible" || !locationIds.has(item.locationId)) return;
    const product = products.find((p) => p.id === item.productId);
    const label = product ? `${product.brand} · ${product.model}${product.size ? ` · T${product.size}` : ""}` : item.productId;

    if (item.pairCode) {
      const current = pairs.get(item.pairCode) || { productId: item.productId, locationId: item.locationId, d: false, i: false };
      if (current.locationId !== item.locationId) return;
      if (item.side === "D") current.d = true;
      if (item.side === "I") current.i = true;
      pairs.set(item.pairCode, current);
      return;
    }

    units.push({ code: item.unitCode, productId: item.productId, locationId: item.locationId, label, isPair: false });
  });

  const completePairs = Array.from(pairs.entries())
    .filter(([, pair]) => pair.d && pair.i)
    .map(([code, pair]) => {
      const product = products.find((p) => p.id === pair.productId);
      const label = product ? `${product.brand} · ${product.model}${product.size ? ` · T${product.size}` : ""}` : pair.productId;
      return { code, productId: pair.productId, locationId: pair.locationId, label, isPair: true };
    });

  return [...completePairs, ...units];
};

export default function InventoryStorefront() {
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);
  const transferItems = useAppStore((s) => s.transferItems);
  const user = useCurrentUser();

  const storeLocations = locations.filter((location) => isLocationActive(location) && isOperationalLocation(location));
  const warehouseLocations = locations.filter((location) => isLocationActive(location) && isStorageLocation(location));
  const [storeLocationId, setStoreLocationId] = useState(storeLocations[0]?.id || "");
  const [warehouseLocationId, setWarehouseLocationId] = useState(warehouseLocations[0]?.id || "");

  const warehouseIds = useMemo(() => new Set(warehouseLocations.map((location) => location.id)), [warehouseLocations]);
  const storeIds = useMemo(() => new Set(storeLocations.map((location) => location.id)), [storeLocations]);

  const warehouseItems = useMemo(
    () => buildOperationalItems(inventory, products, warehouseIds),
    [inventory, products, warehouseIds]
  );
  const storeItems = useMemo(
    () => buildOperationalItems(inventory, products, storeIds),
    [inventory, products, storeIds]
  );

  const move = (code: string, toLocationId: string, successMessage: string) => {
    if (!user) return;
    try {
      transferItems([code], toLocationId, user.id, user.name, operationalRoleFor(user, "almacen"), user.name);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo mover el producto");
    }
  };

  return (
    <>
      <PageHeader title="Productos en tienda" subtitle="Asignacion operativa entre deposito, almacen y tienda" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b space-y-3">
            <h2 className="font-display font-bold">Deposito / almacen disponible</h2>
            <div>
              <Label>Tienda destino</Label>
              <Select value={storeLocationId} onValueChange={setStoreLocationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {storeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {warehouseItems.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin productos disponibles en deposito o almacen</p>
          ) : (
            <ul className="divide-y max-h-[500px] overflow-y-auto">
              {warehouseItems.map((item) => (
                <li key={item.code} className="px-3 py-2 flex justify-between items-center gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs">{item.code}</p>
                    <p className="truncate">{item.label}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!storeLocationId}
                    onClick={() => move(item.code, storeLocationId, "Producto asignado a tienda")}
                  >
                    Enviar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b space-y-3">
            <h2 className="font-display font-bold">Productos en tienda ({storeItems.length})</h2>
            <div>
              <Label>Deposito / almacen destino</Label>
              <Select value={warehouseLocationId} onValueChange={setWarehouseLocationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {warehouseLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {storeItems.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin productos asignados a tienda</p>
          ) : (
            <ul className="divide-y max-h-[500px] overflow-y-auto">
              {storeItems.map((item) => (
                <li key={item.code} className="px-3 py-2 flex justify-between items-center gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs">{item.code}</p>
                    <p className="truncate">{item.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge kind="disponible" />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!warehouseLocationId}
                      onClick={() => move(item.code, warehouseLocationId, "Producto retornado a deposito o almacen")}
                    >
                      Retornar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
