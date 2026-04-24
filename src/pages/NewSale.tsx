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
import { ScanLine, Trash2, Plus, ShieldAlert, Send, CreditCard, ArrowLeftRight } from "lucide-react";
import type { PaymentMethod, PaymentSplit, SaleLine } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";

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
  const [payments, setPayments] = useState<PaymentSplit[]>([{ method: "efectivo", amount: 0 }]);

  const addUnit = (code: string) => {
    code = code.trim().toUpperCase();
    if (!isValidUnitCode(code) && !isPairCode(code)) {
      toast.error("Código inválido");
      return;
    }
    let isPair = false;
    let unitCode = code;
    if (code.startsWith("A")) {
      isPair = true;
      unitCode = code.includes("-") ? code.split("-")[0] : code;
    }
    if (lines.find((l) => l.unitCode === unitCode)) {
      toast.info("Ya está agregado");
      return;
    }
    if (isPair) {
      const d = inventory.find((i) => i.unitCode === `${unitCode}-D` && i.status === "disponible");
      const i = inventory.find((it) => it.unitCode === `${unitCode}-I` && it.status === "disponible");
      if (!d || !i) {
        toast.error("Par incompleto o no disponible");
        return;
      }
      const product = products.find((p) => p.id === d.productId);
      if (!product) return;
      setLines([
        ...lines,
        {
          productId: product.id,
          productLabel: `${product.brand} · ${product.model}${product.size ? ` T${product.size}` : ""}`,
          unitCode,
          basePrice: product.basePrice,
          finalPrice: product.basePrice,
          discount: 0,
          isPair: true,
        },
      ]);
    } else {
      const it = inventory.find((x) => x.unitCode === unitCode && x.status === "disponible");
      if (!it) return toast.error("Unidad no disponible");
      const product = products.find((p) => p.id === it.productId);
      if (!product) return;
      setLines([
        ...lines,
        {
          productId: product.id,
          productLabel: `${product.brand} · ${product.model}`,
          unitCode,
          basePrice: product.basePrice,
          finalPrice: product.basePrice,
          discount: 0,
          isPair: false,
        },
      ]);
    }
  };

  const updateLinePrice = (idx: number, finalPrice: number) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, finalPrice, discount: l.basePrice - finalPrice } : l)));
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter((p) => `${p.brand} ${p.model} ${p.color}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => {
        if (p.type === "zapato") {
          const map: Record<string, { d?: any; i?: any }> = {};
          inventory
            .filter((i) => i.productId === p.id && i.status === "disponible" && i.pairCode)
            .forEach((i) => {
              map[i.pairCode!] ||= {};
              if (i.side === "D") map[i.pairCode!].d = i;
              if (i.side === "I") map[i.pairCode!].i = i;
            });
          const pair = Object.entries(map).find(([, v]) => v.d && v.i);
          return { product: p, code: pair?.[0], isPair: true };
        }
        const u = inventory.find((i) => i.productId === p.id && !i.pairCode && i.status === "disponible");
        return { product: p, code: u?.unitCode, isPair: false };
      });
  }, [search, products, inventory]);

  const subtotal = lines.reduce((a, l) => a + l.finalPrice, 0);
  const discountTotal = lines.reduce((a, l) => a + Math.max(0, l.discount), 0);
  const exceedsDiscount = discountTotal > settings.maxDiscountSoles;
  const surchargeTotal = payments.reduce((a, p) => a + (p.surcharge || 0), 0);
  const total = subtotal + surchargeTotal;
  const paid = payments.reduce((a, p) => a + p.amount + (p.surcharge || 0), 0);
  const remaining = total - paid;

  const updatePayment = (i: number, patch: Partial<PaymentSplit>) =>
    setPayments(payments.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const addPayment = () => setPayments([...payments, { method: "efectivo", amount: 0 }]);
  const removePayment = (i: number) => setPayments(payments.filter((_, idx) => idx !== i));
  const applyCardSurcharge = (i: number, apply: boolean) => {
    const p = payments[i];
    const surcharge = apply ? +(p.amount * (settings.cardSurchargePct / 100)).toFixed(2) : 0;
    updatePayment(i, { surcharge });
  };

  useEffect(() => {
    if (payments.length === 1 && payments[0].method !== "tarjeta") {
      setPayments([{ ...payments[0], amount: subtotal }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const sendToCashier = () => {
    if (!user) return;
    if (lines.length === 0) return toast.error("Agrega al menos un producto");
    if (Math.abs(remaining) > 0.01) return toast.error(`Pago no cuadra: ${remaining > 0 ? "falta" : "sobra"} ${fmtMoney(Math.abs(remaining))}`);
    if (exceedsDiscount) {
      requestAuth({
        type: "descuento_excedido",
        requestedBy: user.id,
        requestedByName: user.name,
        detail: `Descuento ${fmtMoney(discountTotal)} excede límite ${fmtMoney(settings.maxDiscountSoles)}`,
        amount: discountTotal,
      });
      toast.error("Descuento excede límite. Solicitud enviada al administrador.");
      return;
    }
    const sale = createDraftSale({
      sellerId: user.id,
      sellerName: user.name,
      locationId: user.locationId,
      customerPhone: customerPhone || undefined,
      lines,
      subtotal,
      payments,
      totalSurcharge: surchargeTotal,
      total,
    });
    toast.success(`Venta ${sale.code} enviada a cobro`, { description: "El cajero la verá en 'Por cobrar'" });
    navigate("/ventas");
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const prefill = (loc.state as any)?.prefillUnit;
    if (prefill) addUnit(prefill);
  }, []);

  return (
    <>
      <PageHeader title="Nueva venta" subtitle={user ? `Vendedor: ${user.name}` : ""} />

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
                {searchResults.map((r) => (
                  <li key={r.product.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{r.product.brand} · {r.product.model}</p>
                      <p className="text-xs text-muted-foreground">{r.product.color}{r.product.size ? ` · T${r.product.size}` : ""} · {fmtMoney(r.product.basePrice)}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={!r.code}
                      onClick={() => { if (r.code) { addUnit(r.code); setSearch(""); } }}
                      variant="outline"
                    >
                      {r.code ? <><Plus className="size-3.5 mr-1" />Agregar</> : "Sin stock"}
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
                  Descuento total: {fmtMoney(discountTotal)} / máx {fmtMoney(settings.maxDiscountSoles)}
                </span>
              )}
            </div>
            {lines.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Escanea o busca productos para empezar</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {lines.map((l, i) => (
                  <li key={l.unitCode} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{l.unitCode} · {l.isPair ? "PAR" : "UNIDAD"}</p>
                      <p className="font-medium truncate">{l.productLabel}</p>
                      <p className="text-xs text-muted-foreground">Base {fmtMoney(l.basePrice)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <Label className="text-[10px] uppercase">Precio final</Label>
                        <Input
                          type="number"
                          value={l.finalPrice}
                          onChange={(e) => updateLinePrice(i, +e.target.value)}
                          className="w-28 text-right font-bold"
                        />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="size-4" /></Button>
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

          <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold">Pago cobrado por vendedor</h2>
              <span className="text-xs text-muted-foreground">El cobrador solo confirma</span>
            </div>
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={i} className="rounded-xl border border-border p-2 space-y-1.5">
                  <div className="flex gap-2 items-center">
                    <select
                      value={p.method}
                      onChange={(e) => updatePayment(i, { method: e.target.value as PaymentMethod, surcharge: 0 })}
                      className="flex-1 rounded-md border border-input bg-card text-sm h-9 px-2"
                    >
                      <option value="efectivo">💵 Efectivo</option>
                      <option value="transferencia">🏦 Transferencia</option>
                      <option value="yape_plin">📱 Yape/Plin</option>
                      <option value="tarjeta">💳 Tarjeta</option>
                    </select>
                    <Input
                      type="number"
                      value={p.amount}
                      onChange={(e) => updatePayment(i, { amount: +e.target.value })}
                      className="w-28"
                      placeholder="Monto"
                    />
                    {payments.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removePayment(i)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  {p.method === "tarjeta" && (
                    <label className="flex items-center justify-between text-xs gap-2 bg-secondary/50 rounded-md px-2 py-1.5">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="size-3.5" />Recargo {settings.cardSurchargePct}%
                      </span>
                      <input
                        type="checkbox"
                        checked={(p.surcharge || 0) > 0}
                        onChange={(e) => applyCardSurcharge(i, e.target.checked)}
                      />
                    </label>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addPayment} className="w-full">
                <ArrowLeftRight className="size-4 mr-1" /> Agregar pago mixto
              </Button>
            </div>
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
            {surchargeTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Recargo tarjeta</span>
                <span>+{fmtMoney(surchargeTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-display font-extrabold text-2xl pt-1 border-t border-background/20">
              <span>Total</span>
              <span className="text-accent">{fmtMoney(total)}</span>
            </div>
            <div className="flex justify-between text-xs"><span className="opacity-70">Pagado</span><span>{fmtMoney(paid)}</span></div>
            {Math.abs(remaining) > 0.01 && (
              <div className={`flex justify-between text-xs font-semibold ${remaining > 0 ? "text-critical" : "text-accent"}`}>
                <span>{remaining > 0 ? "Falta" : "Sobra"}</span>
                <span>{fmtMoney(Math.abs(remaining))}</span>
              </div>
            )}
            {exceedsDiscount && (
              <div className="rounded-lg bg-critical/20 text-background p-2 text-xs flex items-start gap-2 mt-2">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>Descuento excede el máximo permitido. Requiere autorización.</span>
              </div>
            )}
            <Button
              onClick={sendToCashier}
              disabled={lines.length === 0 || Math.abs(remaining) > 0.01}
              className="w-full h-12 mt-2 bg-gradient-gold text-accent-foreground hover:opacity-90 font-bold"
            >
              <Send className="size-5 mr-2" /> Enviar al cajero
            </Button>
          </div>

          <div className="rounded-2xl bg-card border border-border/60 p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Flujo de la venta</p>
            <p>1. Tú armas la venta, cobras y registras el método de pago.</p>
            <p>2. Queda <span className="font-semibold text-gold">Por cobrar</span>.</p>
            <p>3. El cobrador revisa cómo se vendió, cuánto se cobró y confirma.</p>
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
