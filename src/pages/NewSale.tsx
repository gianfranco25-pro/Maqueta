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
import type { InventoryItem, ItemStatus, Location, PaymentMethod, PaymentSplit, Product, SaleLine } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { getProductPrices } from "@/lib/pricing";
import { isStorageLocation } from "@/lib/types";

const isSellableStatus = (status: "disponible" | "vendido" | "con_falla" | "bloqueado" | "reservado") =>
  status === "disponible" || status === "con_falla";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  yape_plin: "Yape/Plin",
  tarjeta: "Tarjeta",
};

const emptyPayment = (): PaymentSplit => ({ method: "efectivo", amount: 0 });

type SaleCandidate = {
  key: string;
  code: string;
  isPair: boolean;
  product: Product;
  locationId: string;
  locationName: string;
  availabilityLabel: string;
  sourceUnitCodes: string[];
  sourceUnitStatuses: Partial<Record<string, ItemStatus>>;
  takenFromStorageByName?: string;
};

const productLabelFor = (product: Product, isPair: boolean) =>
  isPair
    ? `${product.brand} - ${product.model}${product.size ? ` T${product.size}` : ""}`
    : `${product.brand} - ${product.model}`;

const locationNameFor = (locationId: string, locations: Location[]) =>
  locations.find((location) => location.id === locationId)?.name || "Sin ubicacion";

const statusLabelFor = (items: InventoryItem[]) =>
  items.some((item) => item.status === "con_falla") ? "Disponible con falla" : "Disponible";

const buildPairCandidate = (
  pairCode: string,
  inventory: InventoryItem[],
  products: Product[],
  locations: Location[],
  currentUserName: string
): SaleCandidate | null => {
  const right = inventory.find((item) => item.unitCode === `${pairCode}-D` && isSellableStatus(item.status));
  const left = inventory.find((item) => item.unitCode === `${pairCode}-I` && isSellableStatus(item.status));
  if (!right || !left) return null;
  if (right.locationId !== left.locationId) return null;

  const product = products.find((item) => item.id === right.productId && item.active);
  if (!product) return null;

  const location = locations.find((item) => item.id === right.locationId);
  return {
    key: pairCode,
    code: pairCode,
    isPair: true,
    product,
    locationId: right.locationId,
    locationName: locationNameFor(right.locationId, locations),
    availabilityLabel: statusLabelFor([right, left]),
    sourceUnitCodes: [right.unitCode, left.unitCode],
    sourceUnitStatuses: {
      [right.unitCode]: right.status,
      [left.unitCode]: left.status,
    },
    takenFromStorageByName: isStorageLocation(location) ? currentUserName : undefined,
  };
};

const buildUnitCandidate = (
  item: InventoryItem,
  products: Product[],
  locations: Location[],
  currentUserName: string
): SaleCandidate | null => {
  if (item.pairCode || !isSellableStatus(item.status)) return null;

  const product = products.find((entry) => entry.id === item.productId && entry.active);
  if (!product) return null;

  const location = locations.find((entry) => entry.id === item.locationId);
  return {
    key: item.unitCode,
    code: item.unitCode,
    isPair: false,
    product,
    locationId: item.locationId,
    locationName: locationNameFor(item.locationId, locations),
    availabilityLabel: item.status === "con_falla" ? "Disponible con falla" : "Disponible",
    sourceUnitCodes: [item.unitCode],
    sourceUnitStatuses: {
      [item.unitCode]: item.status,
    },
    takenFromStorageByName: isStorageLocation(location) ? currentUserName : undefined,
  };
};

const candidatePriority = (candidate: SaleCandidate, userLocationId?: string, locations?: Location[]) => {
  if (!userLocationId) return 9;
  if (candidate.locationId === userLocationId) return 0;
  const location = locations?.find((item) => item.id === candidate.locationId);
  return isStorageLocation(location) ? 1 : 2;
};

const lineCodesLabel = (line: SaleLine) =>
  line.sourceUnitCodes?.length ? line.sourceUnitCodes.join(" · ") : line.unitCode;

const minimumSalePrice = (line: SaleLine, fallbackMaxDiscount: number) =>
  Math.max(0, line.basePrice - (line.maxDiscountSoles ?? fallbackMaxDiscount));

export default function NewSale() {
  const navigate = useNavigate();
  const loc = useLocation();
  const user = useCurrentUser();
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const locations = useAppStore((s) => s.locations);
  const settings = useAppStore((s) => s.settings);
  const createDraftSale = useAppStore((s) => s.createDraftSale);

  const [lines, setLines] = useState<SaleLine[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<PaymentSplit[]>([emptyPayment()]);

  const saleCandidates = useMemo(() => {
    if (!user) return [];

    const pairCodes = Array.from(
      new Set(
        inventory
          .filter((item) => item.pairCode && isSellableStatus(item.status))
          .map((item) => item.pairCode as string)
      )
    );

    const pairs = pairCodes
      .map((pairCode) => buildPairCandidate(pairCode, inventory, products, locations, user.name))
      .filter((candidate): candidate is SaleCandidate => Boolean(candidate));

    const accessories = inventory
      .filter((item) => !item.pairCode && isSellableStatus(item.status))
      .map((item) => buildUnitCandidate(item, products, locations, user.name))
      .filter((candidate): candidate is SaleCandidate => Boolean(candidate));

    return [...pairs, ...accessories].sort((a, b) => {
      const priority = candidatePriority(a, user.locationId, locations) - candidatePriority(b, user.locationId, locations);
      if (priority !== 0) return priority;
      return a.code.localeCompare(b.code);
    });
  }, [inventory, locations, products, user]);

  const addCandidate = (candidate: SaleCandidate) => {
    if (lines.find((line) => line.unitCode === candidate.code)) {
      toast.info("Ya esta agregado");
      return;
    }

    const prices = getProductPrices(candidate.product);
    setLines((current) => [
      ...current,
      {
        productId: candidate.product.id,
        productLabel: productLabelFor(candidate.product, candidate.isPair),
        unitCode: candidate.code,
        sourceLocationId: candidate.locationId,
        sourceLocationName: candidate.locationName,
        sourceUnitCodes: candidate.sourceUnitCodes,
        sourceUnitStatuses: candidate.sourceUnitStatuses,
        takenFromStorageByName: candidate.takenFromStorageByName,
        cost: prices.cost,
        basePrice: prices.basePrice,
        finalPrice: prices.basePrice,
        discount: 0,
        maxDiscountSoles: candidate.product.maxDiscountSoles ?? settings.maxDiscountSoles,
        utility: prices.basePrice - prices.cost,
        isPair: candidate.isPair,
      },
    ]);
  };

  const addUnit = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!isValidUnitCode(code) && !isPairCode(code)) {
      toast.error("Codigo invalido");
      return;
    }

    const exactCandidate = saleCandidates.find((item) => item.code === code);
    const normalizedCode = /^[A-Z]\d{5}-(D|I)$/.test(code) ? code.slice(0, -2) : code;
    const candidate = exactCandidate || saleCandidates.find((item) => item.code === normalizedCode);
    if (!candidate) {
      toast.error("No hay stock vendible para ese codigo");
      return;
    }

    addCandidate(candidate);
  };

  const updateLinePrice = (idx: number, finalPrice: number) => {
    setLines(lines.map((line, index) =>
      index === idx ? { ...line, finalPrice, discount: line.basePrice - finalPrice, utility: finalPrice - line.cost } : line
    ));
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, index) => index !== idx));

  const updatePayment = (index: number, patch: Partial<PaymentSplit>) => {
    setPayments(payments.map((payment, currentIndex) =>
      currentIndex === index ? { ...payment, ...patch } : payment
    ));
  };

  const addPayment = () => setPayments([...payments, emptyPayment()]);
  const removePayment = (index: number) => setPayments(payments.filter((_, currentIndex) => currentIndex !== index));

  const searchResults = useMemo(() => {
    if (!search.trim() || !user) return [];
    const q = search.toLowerCase();
    return saleCandidates
      .filter((candidate) => {
        const productText = `${candidate.product.brand} ${candidate.product.model} ${candidate.product.color} ${candidate.product.size || ""}`.toLowerCase();
        return (
          productText.includes(q) ||
          candidate.code.toLowerCase().includes(q) ||
          candidate.locationName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aExact = a.code.toLowerCase() === q ? 0 : 1;
        const bExact = b.code.toLowerCase() === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const aProduct = `${a.product.brand} ${a.product.model}`.toLowerCase();
        const bProduct = `${b.product.brand} ${b.product.model}`.toLowerCase();
        return aProduct.localeCompare(bProduct);
      })
      .slice(0, 10);
  }, [saleCandidates, search, user]);

  const subtotal = lines.reduce((acc, line) => acc + line.finalPrice, 0);
  const normalizedPayments = payments.map((payment) => {
    const amount = Number.isFinite(payment.amount) ? payment.amount : 0;
    return {
      ...payment,
      amount,
      surcharge: payment.method === "tarjeta" ? +(amount * (settings.cardSurchargePct / 100)).toFixed(2) : 0,
    };
  });
  const surchargeTotal = normalizedPayments.reduce((acc, payment) => acc + (payment.surcharge || 0), 0);
  const totalDue = subtotal + surchargeTotal;
  const paid = normalizedPayments.reduce((acc, payment) => acc + payment.amount + (payment.surcharge || 0), 0);
  const remaining = totalDue - paid;
  const discountTotal = lines.reduce((acc, line) => acc + Math.max(0, line.discount), 0);
  const allowedDiscountTotal = lines.reduce((acc, line) => acc + (line.maxDiscountSoles ?? settings.maxDiscountSoles), 0);
  const exceedsDiscount = lines.some((line) => Math.max(0, line.discount) > (line.maxDiscountSoles ?? settings.maxDiscountSoles));

  const sendToCashier = () => {
    if (!user) return;
    if (lines.length === 0) return toast.error("Agrega al menos un producto");
    if (lines.some((line) => line.finalPrice <= 0)) return toast.error("El precio final debe ser mayor a 0");
    if (payments.length === 0 || normalizedPayments.every((payment) => payment.amount <= 0)) {
      return toast.error("Registra al menos un pago");
    }
    if (paid - totalDue > 0.001) {
      return toast.error(`Sobra ${fmtMoney(paid - totalDue)}. Corrige el cobro antes de enviarlo.`);
    }

    if (exceedsDiscount) {
      toast.error(`Descuento excede el limite permitido de ${fmtMoney(allowedDiscountTotal)}.`);
      return;
    }

    const sale = createDraftSale({
      sellerId: user.id,
      sellerName: user.name,
      locationId: user.locationId,
      customerPhone: customerPhone || undefined,
      lines,
      subtotal,
      payments: normalizedPayments,
      totalSurcharge: surchargeTotal,
      total: totalDue,
    });
    toast.success("Operacion enviada a caja", {
      description: remaining > 0.001
        ? `Queda pendiente por ${fmtMoney(remaining)} hasta que caja confirme`
        : "Caja revisara y confirmara el cobro",
    });
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
              <Input placeholder="Buscar producto, codigo o ubicacion" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
              <Button onClick={() => setScanOpen(true)} className="bg-foreground text-background hover:bg-foreground/90">
                <ScanLine className="size-4 mr-1" /> Escanear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes vender stock de cualquier ubicacion. Siempre veras de donde sale cada item.
            </p>
            {searchResults.length > 0 && (
              <ul className="rounded-xl border border-border divide-y">
                {searchResults.map((result) => (
                  <li key={result.key} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{result.product.brand} - {result.product.model}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.code} · {result.locationName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.product.color}{result.product.size ? ` - T${result.product.size}` : ""} · {fmtMoney(getProductPrices(result.product).basePrice)} · {result.availabilityLabel}
                        {result.takenFromStorageByName ? ` · Lo retira ${result.takenFromStorageByName}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        addCandidate(result);
                        setSearch("");
                      }}
                      variant="outline"
                    >
                      <><Plus className="size-3.5 mr-1" />Agregar</>
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
              <p className="p-6 text-sm text-muted-foreground text-center">Escanea o busca stock disponible en cualquier ubicacion</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {lines.map((line, index) => (
                  <li key={line.unitCode} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground break-all">
                        {lineCodesLabel(line)}
                      </p>
                      <p className="font-medium truncate">{line.productLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        Precio de venta {fmtMoney(line.basePrice)}
                        {` · Precio minimo permitido ${fmtMoney(minimumSalePrice(line, settings.maxDiscountSoles))}`}
                        {line.discount > 0 ? ` - Descuento ${fmtMoney(line.discount)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Se saca de: {line.sourceLocationName || "Sin ubicacion"}
                        {line.takenFromStorageByName ? ` - Lo retira ${line.takenFromStorageByName}` : ""}
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

          <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold">Cobro registrado por colaborador</h2>
              <Button variant="outline" size="sm" onClick={addPayment}>
                <ArrowLeftRight className="size-4 mr-1" /> Pago mixto
              </Button>
            </div>
            <div className="space-y-2">
              {payments.map((payment, index) => {
                const effectivePayment = normalizedPayments[index];
                return (
                  <div key={index} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <select
                        value={payment.method}
                        onChange={(event) => updatePayment(index, { method: event.target.value as PaymentMethod, surcharge: 0 })}
                        className="flex-1 rounded-md border border-input bg-card text-sm h-10 px-2"
                      >
                        {Object.entries(METHOD_LABEL).map(([method, label]) => (
                          <option key={method} value={method}>{label}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        value={payment.amount}
                        onChange={(event) => updatePayment(index, { amount: +event.target.value })}
                        className="w-28"
                        placeholder="Monto"
                      />
                      {payments.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removePayment(index)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                    {payment.method === "tarjeta" && (
                      <div className="flex items-center justify-between text-xs gap-2 bg-secondary/50 rounded-md px-2 py-1.5">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="size-3.5" />Recargo tarjeta {settings.cardSurchargePct}%
                        </span>
                        <strong>{fmtMoney(effectivePayment.surcharge || 0)}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl bg-secondary/60 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Subtotal comercial</span><strong>{fmtMoney(subtotal)}</strong></div>
              {surchargeTotal > 0 && (
                <div className="flex justify-between"><span>Recargo tarjeta</span><strong>{fmtMoney(surchargeTotal)}</strong></div>
              )}
              <div className="flex justify-between"><span>Total a cobrar</span><strong>{fmtMoney(totalDue)}</strong></div>
              <div className="flex justify-between"><span>Monto registrado</span><strong>{fmtMoney(paid)}</strong></div>
              <div className={`flex justify-between font-semibold ${Math.abs(remaining) < 0.01 ? "text-success" : "text-critical"}`}>
                <span>{remaining > 0.001 ? "Falta" : "Cobro completo"}</span>
                <span>{remaining > 0.001 ? fmtMoney(remaining) : fmtMoney(0)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border/60 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Cierre por caja</p>
            <p>El colaborador registra la operacion comercial y el detalle del cobro. Caja solo revisa y confirma cuando el pago quede conciliado.</p>
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
                <span className="opacity-70">Recargo</span>
                <span>+{fmtMoney(surchargeTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-display font-extrabold text-2xl pt-1 border-t border-background/20">
              <span>Total comercial</span>
              <span className="text-accent">{fmtMoney(totalDue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-70">Registrado</span>
              <span>{fmtMoney(paid)}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${Math.abs(remaining) < 0.01 ? "text-success" : "text-background"}`}>
              <span>{remaining > 0.001 ? "Falta" : "Cobro completo"}</span>
              <span>{remaining > 0.001 ? fmtMoney(remaining) : fmtMoney(0)}</span>
            </div>
            {exceedsDiscount && (
              <div className="rounded-lg bg-critical/20 text-background p-2 text-xs flex items-start gap-2 mt-2">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>Descuento excede el maximo permitido. Corrige el precio antes de enviarlo.</span>
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
