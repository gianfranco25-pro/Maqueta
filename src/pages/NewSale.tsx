import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRScanner, isPairCode, isValidUnitCode } from "@/components/QRScanner";
import { ScanLine, Trash2, Plus, ShieldAlert, Send } from "lucide-react";
import type { SaleLine } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { getProductPrices } from "@/lib/pricing";

export default function NewSale() {
  const navigate = useNavigate();
  const loc = useLocation();
  const user = useCurrentUser();
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const settings = useAppStore((s) => s.settings);
  const createDraftSale = useAppStore((s) => s.createDraftSale);
  const requestAuth = useAppStore((s) => s.requestAuthorization);

  const [lines, setLines] = useState<SaleLine[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isAvailableAtUserLocation = (unitCode: string) =>
    inventory.find((item) =>
      item.unitCode === unitCode &&
      item.status === "disponible" &&
      item.locationId === user?.locationId
    );

  const addUnit = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!isValidUnitCode(code) && !isPairCode(code)) {
      toast.error("Codigo invalido");
      return;
    }

    const isPair = code.startsWith("A");
    const unitCode = isPair && code.includes("-") ? code.split("-")[0] : code;
    if (lines.find((line) => line.unitCode === unitCode)) {
      toast.info("Ya esta agregado");
      return;
    }

    if (isPair) {
      const right = isAvailableAtUserLocation(`${unitCode}-D`);
      const left = isAvailableAtUserLocation(`${unitCode}-I`);
      if (!right || !left) {
        toast.error("Par incompleto o no disponible en tu ubicacion");
        return;
      }
      const product = products.find((p) => p.id === right.productId);
      if (!product) return;
      const prices = getProductPrices(product);
      setLines([
        ...lines,
        {
          productId: product.id,
          productLabel: `${product.brand} - ${product.model}${product.size ? ` T${product.size}` : ""}`,
          unitCode,
          cost: prices.cost,
          basePrice: prices.basePrice,
          finalPrice: prices.basePrice,
          discount: 0,
          maxDiscountSoles: product.maxDiscountSoles ?? settings.maxDiscountSoles,
          utility: prices.basePrice - prices.cost,
          isPair: true,
        },
      ]);
      return;
    }

    const item = isAvailableAtUserLocation(unitCode);
    if (!item) {
      toast.error("Unidad no disponible en tu ubicacion");
      return;
    }
    const product = products.find((p) => p.id === item.productId);
    if (!product) return;
    const prices = getProductPrices(product);
    setLines([
      ...lines,
      {
        productId: product.id,
        productLabel: `${product.brand} - ${product.model}`,
        unitCode,
        cost: prices.cost,
        basePrice: prices.basePrice,
        finalPrice: prices.basePrice,
        discount: 0,
        maxDiscountSoles: product.maxDiscountSoles ?? settings.maxDiscountSoles,
        utility: prices.basePrice - prices.cost,
        isPair: false,
      },
    ]);
  };

  const updateLinePrice = (idx: number, finalPrice: number) => {
    setLines(lines.map((line, index) =>
      index === idx ? { ...line, finalPrice, discount: line.basePrice - finalPrice, utility: finalPrice - line.cost } : line
    ));
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, index) => index !== idx));

  const searchResults = useMemo(() => {
    if (!search.trim() || !user) return [];
    const q = search.toLowerCase();
    return products
      .filter((product) => product.active)
      .filter((product) => `${product.brand} ${product.model} ${product.color}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((product) => {
        if (product.type === "zapato") {
          const pairs: Record<string, { d?: boolean; i?: boolean }> = {};
          inventory
            .filter((item) =>
              item.productId === product.id &&
              item.status === "disponible" &&
              item.locationId === user.locationId &&
              item.pairCode
            )
            .forEach((item) => {
              pairs[item.pairCode!] ||= {};
              if (item.side === "D") pairs[item.pairCode!].d = true;
              if (item.side === "I") pairs[item.pairCode!].i = true;
            });
          const pair = Object.entries(pairs).find(([, value]) => value.d && value.i);
          return { product, code: pair?.[0], isPair: true };
        }

        const unit = inventory.find((item) =>
          item.productId === product.id &&
          !item.pairCode &&
          item.status === "disponible" &&
          item.locationId === user.locationId
        );
        return { product, code: unit?.unitCode, isPair: false };
      });
  }, [search, products, inventory, user]);

  const subtotal = lines.reduce((acc, line) => acc + line.finalPrice, 0);
  const discountTotal = lines.reduce((acc, line) => acc + Math.max(0, line.discount), 0);
  const allowedDiscountTotal = lines.reduce((acc, line) => acc + (line.maxDiscountSoles ?? settings.maxDiscountSoles), 0);
  const exceedsDiscount = lines.some((line) => Math.max(0, line.discount) > (line.maxDiscountSoles ?? settings.maxDiscountSoles));

  const sendToCashier = () => {
    if (!user) return;
    if (lines.length === 0) return toast.error("Agrega al menos un producto");
    if (lines.some((line) => line.finalPrice <= 0)) return toast.error("El precio final debe ser mayor a 0");

    if (exceedsDiscount) {
      requestAuth({
        type: "descuento_excedido",
        requestedBy: user.id,
        requestedByName: user.name,
        detail: `Descuento ${fmtMoney(discountTotal)} excede limite por producto ${fmtMoney(allowedDiscountTotal)}`,
        amount: discountTotal,
      });
      toast.error("Descuento excede limite. Solicitud enviada al administrador.");
      return;
    }

    const sale = createDraftSale({
      sellerId: user.id,
      sellerName: user.name,
      locationId: user.locationId,
      customerPhone: customerPhone || undefined,
      lines,
      subtotal,
      payments: [],
      totalSurcharge: 0,
      total: subtotal,
    });
    toast.success(`Venta ${sale.code} enviada a caja`, { description: "Caja registrara el cobro en Por cobrar" });
    navigate("/ventas");
  };

  useEffect(() => {
    const prefill = (loc.state as any)?.prefillUnit;
    if (prefill) addUnit(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader title="Nueva venta" subtitle={user ? `Colaborador: ${user.name}` : ""} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="Buscar marca, modelo o color" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
              <Button onClick={() => setScanOpen(true)} className="bg-foreground text-background hover:bg-foreground/90">
                <ScanLine className="size-4 mr-1" /> Escanear
              </Button>
            </div>
            {searchResults.length > 0 && (
              <ul className="rounded-xl border border-border divide-y">
                {searchResults.map((result) => (
                  <li key={result.product.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{result.product.brand} - {result.product.model}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.product.color}{result.product.size ? ` - T${result.product.size}` : ""} - {fmtMoney(getProductPrices(result.product).basePrice)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={!result.code}
                      onClick={() => {
                        if (result.code) {
                          addUnit(result.code);
                          setSearch("");
                        }
                      }}
                      variant="outline"
                    >
                      {result.code ? <><Plus className="size-3.5 mr-1" />Agregar</> : "Sin stock"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border/60">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <h2 className="font-display font-bold">Productos ({lines.length})</h2>
              {discountTotal > 0 && (
                <span className={`text-xs font-semibold ${exceedsDiscount ? "text-critical" : "text-success"}`}>
                  Descuento total: {fmtMoney(discountTotal)} / max {fmtMoney(allowedDiscountTotal)}
                </span>
              )}
            </div>
            {lines.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Escanea o busca productos disponibles en tu ubicacion</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {lines.map((line, index) => (
                  <li key={line.unitCode} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{line.unitCode} - {line.isPair ? "PAR" : "UNIDAD"}</p>
                      <p className="font-medium truncate">{line.productLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        Base {fmtMoney(line.basePrice)}
                        {line.discount > 0 ? ` - Descuento ${fmtMoney(line.discount)}` : ""}
                        {` - Max ${fmtMoney(line.maxDiscountSoles ?? settings.maxDiscountSoles)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <Label className="text-[10px] uppercase">Precio final</Label>
                        <Input
                          type="number"
                          value={line.finalPrice}
                          onChange={(e) => updateLinePrice(index, +e.target.value)}
                          className="w-28 text-right font-bold"
                        />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeLine(index)}><Trash2 className="size-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
            <h2 className="font-display font-bold">Cliente</h2>
            <div>
              <Label>Celular del cliente</Label>
              <Input placeholder="987654321" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border/60 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Cobro separado</p>
            <p>El colaborador registra la operacion comercial. Caja registrara metodo de pago, recargos y conciliacion en Por cobrar.</p>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl bg-foreground text-background p-4 space-y-2 shadow-lg">
            <div className="flex justify-between text-sm">
              <span className="opacity-70">Productos</span>
              <span>{lines.length}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Descuento</span>
                <span>-{fmtMoney(discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="opacity-70">Subtotal</span>
              <span>{fmtMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between font-display font-extrabold text-2xl pt-1 border-t border-background/20">
              <span>Total comercial</span>
              <span className="text-accent">{fmtMoney(subtotal)}</span>
            </div>
            {exceedsDiscount && (
              <div className="rounded-lg bg-critical/20 text-background p-2 text-xs flex items-start gap-2 mt-2">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>Descuento excede el maximo permitido. Requiere autorizacion.</span>
              </div>
            )}
            <Button
              onClick={sendToCashier}
              disabled={lines.length === 0}
              className="w-full h-12 mt-2 bg-gradient-gold text-accent-foreground hover:opacity-90 font-bold"
            >
              <Send className="size-5 mr-2" /> Enviar a caja
            </Button>
          </div>

          <div className="rounded-2xl bg-card border border-border/60 p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Flujo de la venta</p>
            <p>1. Colaborador registra producto, cliente y precio comercial.</p>
            <p>2. La venta queda <span className="font-semibold text-gold">Por cobrar</span>.</p>
            <p>3. Caja registra el pago, concilia y confirma.</p>
          </div>
        </div>
      </div>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Escanear producto</DialogTitle></DialogHeader>
          <QRScanner
            onResult={(code) => {
              addUnit(code);
              setScanOpen(false);
            }}
            onClose={() => setScanOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
