import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { isPairCode, isSaleCode, QRScanner } from "@/components/QRScanner";
import { useAppStore, useCurrentRole } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { fmtMoney } from "@/lib/format";
import { AlertTriangle, ArrowDownToLine, Package, Receipt, ShoppingCart, SlidersHorizontal, Store, Truck } from "lucide-react";
import { useCan } from "@/components/Can";
import { ROLE_LABELS } from "@/lib/types";
import { getProductPrices } from "@/lib/pricing";

export default function ScanPage() {
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);
  const sales = useAppStore((s) => s.sales);
  const role = useCurrentRole();
  const canSell = useCan("sales.create");
  const canCollect = useCan("sales.collect");
  const canTransfer = useCan("inventory.transfer");
  const canDelivery = useCan("inventory.delivery");
  const canFault = useCan("inventory.fault");
  const canAdjust = useCan("inventory.adjust");
  const canStorefront = useCan("inventory.storefront");
  const canViewPriceAdmin = useCan("catalog.prices.edit");
  const canViewProfit = useCan("profit.view");
  const [scanned, setScanned] = useState<string | null>(null);

  const sale = scanned && isSaleCode(scanned) ? sales.find((item) => item.code === scanned) : null;
  const scannedPair = scanned && isPairCode(scanned) ? inventory.filter((item) => item.pairCode === scanned) : [];
  const item = scanned ? inventory.find((inv) => inv.unitCode === scanned) || scannedPair[0] || null : null;
  const product = item ? products.find((p) => p.id === item.productId) : null;
  const prices = product ? getProductPrices(product) : null;
  const location = item ? locations.find((l) => l.id === item.locationId) : null;
  const pair = item?.pairCode ? inventory.filter((inv) => inv.pairCode === item.pairCode) : [];
  const actionCode = item?.pairCode || item?.unitCode || scanned || "";

  return (
    <>
      <PageHeader title="Escanear" subtitle={role ? `Acciones para ${ROLE_LABELS[role]}` : "Acciones por rol"} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
          <QRScanner
            onResult={(code) => setScanned(code)}
            expectedHint="Escanea productos, pares completos o ventas pendientes"
            allowPairCodes
            allowSaleCodes
          />
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
          <h2 className="font-display font-bold mb-3">Resultado</h2>
          {!scanned && <p className="text-sm text-muted-foreground">Aun no escaneas nada.</p>}

          {scanned && !item && !sale && (
            <div className="rounded-xl bg-critical-soft text-critical p-4 text-sm">
              Codigo <span className="font-mono font-bold">{scanned}</span> no encontrado.
            </div>
          )}

          {sale && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{sale.code}</p>
                    <p className="font-display font-bold text-lg">{sale.sellerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {sale.lines.length} items - {fmtMoney(sale.status === "pendiente_cobro" ? sale.subtotal : sale.total)}
                    </p>
                  </div>
                  <StatusBadge kind={sale.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {canCollect && sale.status === "pendiente_cobro" && (
                  <Link to="/ventas/por-cobrar" state={{ saleCode: sale.code }}>
                    <Button className="w-full h-12 bg-foreground text-background hover:bg-foreground/90">
                      <Receipt className="size-4 mr-1" /> Cobrar ahora
                    </Button>
                  </Link>
                )}
                <Link to="/ventas">
                  <Button variant="outline" className="w-full h-12"><Receipt className="size-4 mr-1" /> Ver venta</Button>
                </Link>
                <Button variant="outline" className="w-full h-12" onClick={() => setScanned(null)}>
                  <Package className="size-4 mr-1" /> Escanear otro
                </Button>
              </div>
            </div>
          )}

          {item && product && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{scanned}</p>
                    <p className="font-display font-bold text-lg">{product.brand} - {product.model}</p>
                    <p className="text-sm text-muted-foreground">{product.color}{product.size ? ` - Talla ${product.size}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ubicacion: <strong className="text-foreground">{location?.name}</strong></p>
                  </div>
                  <StatusBadge kind={item.status} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Precio base</p>
                    <p className="font-display font-extrabold text-xl">{fmtMoney(prices?.basePrice || 0)}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {canViewPriceAdmin && <p>Precio por mayor: {fmtMoney(prices?.wholesalePrice || 0)}</p>}
                    {canViewProfit && <p>Utilidad base: {fmtMoney((prices?.basePrice || 0) - (prices?.cost || 0))}</p>}
                  </div>
                </div>
              </div>

              {item.pairCode && (
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Estado del par</p>
                  <div className="grid grid-cols-2 gap-2">
                    {pair.map((piece) => (
                      <div key={piece.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                        <span className="font-mono">{piece.unitCode}</span>
                        <StatusBadge kind={piece.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {canSell && (
                  <Link to="/ventas/nueva" state={{ prefillUnit: actionCode }}>
                    <Button className="w-full h-12 bg-foreground text-background hover:bg-foreground/90">
                      <ShoppingCart className="size-4 mr-1" /> Vender
                    </Button>
                  </Link>
                )}
                {canDelivery && (
                  <Link to="/inventario/entregas" state={{ prefillUnit: actionCode }}>
                    <Button variant="outline" className="w-full h-12"><ArrowDownToLine className="size-4 mr-1" /> Entregar</Button>
                  </Link>
                )}
                {canTransfer && (
                  <Link to="/inventario/traslados" state={{ prefillUnit: actionCode }}>
                    <Button variant="outline" className="w-full h-12"><Truck className="size-4 mr-1" /> Trasladar</Button>
                  </Link>
                )}
                {canFault && (
                  <Link to="/inventario/fallas" state={{ prefillUnit: item.unitCode }}>
                    <Button variant="outline" className="w-full h-12"><AlertTriangle className="size-4 mr-1" /> Falla</Button>
                  </Link>
                )}
                {canAdjust && (
                  <Link to="/inventario/ajustes" state={{ prefillUnit: actionCode }}>
                    <Button variant="outline" className="w-full h-12"><SlidersHorizontal className="size-4 mr-1" /> Ajustar</Button>
                  </Link>
                )}
                {canStorefront && (
                  <Link to="/inventario/tienda">
                    <Button variant="outline" className="w-full h-12"><Store className="size-4 mr-1" /> Tienda</Button>
                  </Link>
                )}
                <Button variant="outline" className="w-full h-12" onClick={() => setScanned(null)}>
                  <Package className="size-4 mr-1" /> Otro
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
