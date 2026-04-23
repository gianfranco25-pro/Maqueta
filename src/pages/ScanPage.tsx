import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { QRScanner } from "@/components/QRScanner";
import { useAppStore } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { fmtMoney } from "@/lib/format";
import { Package, ShoppingCart, Truck, AlertTriangle } from "lucide-react";

export default function ScanPage() {
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);
  const [scanned, setScanned] = useState<string | null>(null);

  const item = scanned ? inventory.find((i) => i.unitCode === scanned) : null;
  const product = item ? products.find((p) => p.id === item.productId) : null;
  const location = item ? locations.find((l) => l.id === item.locationId) : null;

  // Para zapatos buscar también la pareja
  const pair = item?.pairCode
    ? inventory.filter((i) => i.pairCode === item.pairCode)
    : [];

  return (
    <>
      <PageHeader title="Escanear QR" subtitle="Lee códigos de pares o unidades" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border/60 p-5">
          <QRScanner
            onResult={(code) => setScanned(code)}
            expectedHint="Escanea o ingresa: A00001-D, A00001-I (zapatos) o B00001 (accesorios)"
          />
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-5">
          <h2 className="font-display font-bold mb-3">Resultado</h2>
          {!scanned && <p className="text-sm text-muted-foreground">Aún no escaneas nada.</p>}
          {scanned && !item && (
            <div className="rounded-xl bg-critical-soft text-critical p-4 text-sm">
              Código <span className="font-mono font-bold">{scanned}</span> no encontrado en el inventario.
            </div>
          )}
          {item && product && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{item.unitCode}</p>
                    <p className="font-display font-bold text-lg">{product.brand} · {product.model}</p>
                    <p className="text-sm text-muted-foreground">{product.color}{product.size ? ` · Talla ${product.size}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ubicación: <strong className="text-foreground">{location?.name}</strong></p>
                  </div>
                  <StatusBadge kind={item.status} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Precio base</p>
                    <p className="font-display font-extrabold text-xl">{fmtMoney(product.basePrice)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Mayor: {fmtMoney(product.wholesalePrice)}</p>
                </div>
              </div>

              {item.pairCode && (
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Estado del par</p>
                  <div className="grid grid-cols-2 gap-2">
                    {pair.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                        <span className="font-mono">{p.unitCode}</span>
                        <StatusBadge kind={p.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Link to="/ventas/nueva" state={{ prefillUnit: item.unitCode }}>
                  <Button className="w-full bg-foreground text-background hover:bg-foreground/90">
                    <ShoppingCart className="size-4 mr-1" /> Vender
                  </Button>
                </Link>
                <Link to="/inventario/traslados" state={{ prefillUnit: item.unitCode }}>
                  <Button variant="outline" className="w-full"><Truck className="size-4 mr-1" /> Trasladar</Button>
                </Link>
                <Link to="/inventario/fallas" state={{ prefillUnit: item.unitCode }}>
                  <Button variant="outline" className="w-full"><AlertTriangle className="size-4 mr-1" /> Marcar falla</Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={() => setScanned(null)}>
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
