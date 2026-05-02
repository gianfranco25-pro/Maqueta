import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentRole, useCurrentUser } from "@/lib/store";
import { useCan } from "@/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { getProductPrices } from "@/lib/pricing";
import { operationalRoleFor, PaymentMethod, PaymentSplit } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRScanner } from "@/components/QRScanner";
import { ScanLine, ArrowLeftRight, CreditCard, Trash2 } from "lucide-react";

type ExchangeOption = {
  code: string;
  displayCode: string;
  productId: string;
  locationId: string;
  locationName: string;
};

type SoldItemOption = {
  saleId: string;
  sellerId: string;
  sellerName: string;
  customerPhone?: string;
  soldFrom: string;
  timestamp: string;
  line: {
    productId: string;
    productLabel: string;
    unitCode: string;
    sourceLocationName?: string;
    sourceUnitCodes?: string[];
    finalPrice: number;
  };
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  yape_plin: "Yape/Plin",
  tarjeta: "Tarjeta",
};

const emptyPayment = (): PaymentSplit => ({ method: "efectivo", amount: 0 });

const locationNameFor = (locationId: string, locations: Array<{ id: string; name: string }>) =>
  locations.find((location) => location.id === locationId)?.name || "Sin ubicacion";

const lineDisplayCode = (line?: { sourceUnitCodes?: string[]; unitCode: string }) =>
  line?.sourceUnitCodes?.length ? line.sourceUnitCodes.join(" / ") : line?.unitCode || "";

const saleDisplayCode = (sale?: { lines: Array<{ sourceUnitCodes?: string[]; unitCode: string }> }) => {
  if (!sale || sale.lines.length === 0) return "";
  const firstCode = lineDisplayCode(sale.lines[0]);
  const extraCount = sale.lines.length - 1;
  return extraCount > 0 ? `${firstCode} + ${extraCount} mas` : firstCode;
};

const saleOriginLabel = (
  sale?: {
    locationId?: string;
    lines: Array<{ sourceLocationName?: string }>;
  },
  locations?: Array<{ id: string; name: string }>
) => {
  if (!sale) return "Sin ubicacion";
  if (sale.locationId && locations?.length) {
    return locationNameFor(sale.locationId, locations);
  }
  const firstSource = sale.lines.find((line) => line.sourceLocationName)?.sourceLocationName;
  return firstSource || "Sin ubicacion";
};

export default function AfterSales() {
  const sales = useAppStore((s) => s.sales);
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const locations = useAppStore((s) => s.locations);
  const settings = useAppStore((s) => s.settings);
  const aftersales = useAppStore((s) => s.afterSales);
  const exchange = useAppStore((s) => s.registerExchange);
  const refund = useAppStore((s) => s.registerRefund);
  const wrong = useAppStore((s) => s.registerWrongPurchase);
  const user = useCurrentUser();
  const currentRole = useCurrentRole();
  const canWrong = useCan("aftersales.wrong");
  const canViewAllSales = useCan("sales.view.all");
  const canSeeOriginalSaleAmounts = canViewAllSales;
  const isAdmin = currentRole === "admin";

  const [soldSearch, setSoldSearch] = useState("");
  const [refundSearch, setRefundSearch] = useState("");
  const [wrongSearch, setWrongSearch] = useState("");
  const [newSearch, setNewSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState("");
  const [oldUnit, setOldUnit] = useState("");
  const [refundSaleId, setRefundSaleId] = useState("");
  const [refundUnit, setRefundUnit] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [chargeNow, setChargeNow] = useState<number>(0);
  const [payments, setPayments] = useState<PaymentSplit[]>([emptyPayment()]);
  const [reason, setReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const visibleSales = useMemo(
    () => (canViewAllSales ? sales : sales.filter((sale) => sale.sellerId === user?.id)),
    [canViewAllSales, sales, user?.id]
  );

  const confirmedSales = useMemo(
    () => visibleSales.filter((sale) => sale.status === "confirmada"),
    [visibleSales]
  );

  const soldItems = useMemo<SoldItemOption[]>(() => {
    const handled = new Set(
      aftersales
        .filter((record) => record.oldUnitCode && (record.type === "cambio" || record.type === "devolucion"))
        .map((record) => `${record.saleId}:${record.oldUnitCode}`)
    );

    return confirmedSales.flatMap((sale) =>
      sale.lines
        .filter((line) => !handled.has(`${sale.id}:${line.unitCode}`))
        .map((line) => ({
          saleId: sale.id,
          sellerId: sale.sellerId,
          sellerName: sale.sellerName,
          customerPhone: sale.customerPhone,
          soldFrom: line.sourceLocationName || saleOriginLabel(sale, locations),
          timestamp: sale.timestamp,
          line: {
            productId: line.productId,
            productLabel: line.productLabel,
            unitCode: line.unitCode,
            sourceLocationName: line.sourceLocationName,
            sourceUnitCodes: line.sourceUnitCodes,
            finalPrice: line.finalPrice,
          },
        }))
    );
  }, [aftersales, confirmedSales, locations]);

  const foundSoldItems = useMemo(() => {
    if (!soldSearch.trim()) return soldItems;
    const query = soldSearch.toLowerCase();
    return soldItems.filter((item) =>
      [
        item.line.productLabel,
        lineDisplayCode(item.line),
        item.sellerName,
        item.soldFrom,
        item.customerPhone || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [soldSearch, soldItems]);

  const selectedSoldItem = soldItems.find(
    (item) => item.saleId === selectedSale && item.line.unitCode === oldUnit
  );
  const selectedRefundItem = soldItems.find(
    (item) => item.saleId === refundSaleId && item.line.unitCode === refundUnit
  );

  const foundWrongSales = useMemo(() => {
    if (!wrongSearch.trim()) return confirmedSales;
    const query = wrongSearch.toLowerCase();
    return confirmedSales.filter((sale) =>
      [
        sale.sellerName,
        sale.customerPhone || "",
        saleOriginLabel(sale, locations),
        saleDisplayCode(sale),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [confirmedSales, locations, wrongSearch]);

  const visibleAfterSales = useMemo(
    () =>
      canViewAllSales
        ? aftersales
        : aftersales.filter(
            (record) => sales.find((saleItem) => saleItem.id === record.saleId)?.sellerId === user?.id
          ),
    [aftersales, canViewAllSales, sales, user?.id]
  );

  const availableOptions = useMemo(() => {
    const groupedPairs = new Map<string, typeof inventory>();
    inventory.forEach((item) => {
      if (item.status !== "disponible") return;
      if (!item.pairCode) return;
      groupedPairs.set(item.pairCode, [...(groupedPairs.get(item.pairCode) || []), item]);
    });

    const pairs: ExchangeOption[] = Array.from(groupedPairs.entries())
      .filter(([, items]) => items.length === 2 && items.every((item) => item.locationId === items[0].locationId))
      .map(([pairCode, items]) => ({
        code: pairCode,
        displayCode: `${pairCode}-D / ${pairCode}-I`,
        productId: items[0].productId,
        locationId: items[0].locationId,
        locationName: locationNameFor(items[0].locationId, locations),
      }));

    const accessories: ExchangeOption[] = inventory
      .filter((item) => item.status === "disponible" && !item.pairCode)
      .map((item) => ({
        code: item.unitCode,
        displayCode: item.unitCode,
        productId: item.productId,
        locationId: item.locationId,
        locationName: locationNameFor(item.locationId, locations),
      }));

    return [...pairs, ...accessories]
      .map((option) => {
        const product = products.find((productItem) => productItem.id === option.productId);
        return product ? { ...option, product } : null;
      })
      .filter((option): option is NonNullable<typeof option> => Boolean(option));
  }, [inventory, locations, products]);

  const filteredOptions = useMemo(() => {
    if (!newSearch.trim()) return availableOptions;
    const query = newSearch.toLowerCase();
    return availableOptions.filter((option) =>
      [
        option.code,
        option.displayCode,
        option.product.brand,
        option.product.model,
        option.locationName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [availableOptions, newSearch]);

  const newOption = availableOptions.find((option) => option.code === newUnit);
  const newProductBasePrice = newOption ? getProductPrices(newOption.product).basePrice : 0;
  const minimumCharge = selectedSoldItem && newOption
    ? Math.max(0, newProductBasePrice - selectedSoldItem.line.finalPrice)
    : 0;
  const priceBelowAllowed = Boolean(
    newOption &&
      chargeNow < minimumCharge &&
      !isAdmin
  );
  const difference = newOption ? Math.max(0, chargeNow) : 0;
  const normalizedPayments = payments.map((payment) => {
    const amount = Number.isFinite(payment.amount) ? payment.amount : 0;
    return {
      ...payment,
      amount,
      surcharge: payment.method === "tarjeta" ? +(amount * (settings.cardSurchargePct / 100)).toFixed(2) : 0,
    };
  });
  const exchangeSurchargeTotal = normalizedPayments.reduce((acc, payment) => acc + (payment.surcharge || 0), 0);
  const exchangeTotalDue = difference + exchangeSurchargeTotal;
  const exchangePaid = normalizedPayments.reduce((acc, payment) => acc + payment.amount + (payment.surcharge || 0), 0);
  const exchangeRemaining = exchangeTotalDue - exchangePaid;

  const resetExchangeForm = () => {
    setSelectedSale("");
    setOldUnit("");
    setNewUnit("");
    setChargeNow(0);
    setPayments([emptyPayment()]);
    setReason("");
    setNewSearch("");
    setSoldSearch("");
  };

  const resetRefundForm = () => {
    setRefundSaleId("");
    setRefundUnit("");
    setRefundReason("");
    setRefundSearch("");
  };

  const clearSelectedSoldItem = () => {
    setSelectedSale("");
    setOldUnit("");
    setNewUnit("");
    setChargeNow(0);
    setPayments([emptyPayment()]);
    setReason("");
    setNewSearch("");
  };

  const clearSelectedRefundItem = () => {
    setRefundSaleId("");
    setRefundUnit("");
    setRefundReason("");
  };

  const selectSoldItem = (item: SoldItemOption) => {
    setSelectedSale(item.saleId);
    setOldUnit(item.line.unitCode);
    setNewUnit("");
    setChargeNow(0);
    setPayments([emptyPayment()]);
    setReason("");
    setNewSearch("");
  };

  const selectRefundItem = (item: SoldItemOption) => {
    setRefundSaleId(item.saleId);
    setRefundUnit(item.line.unitCode);
    setRefundReason("");
  };

  const clearSelectedNewProduct = () => {
    setNewUnit("");
    setChargeNow(0);
    setPayments([emptyPayment()]);
    setNewSearch("");
  };

  const updatePayment = (index: number, patch: Partial<PaymentSplit>) => {
    setPayments(payments.map((payment, currentIndex) =>
      currentIndex === index ? { ...payment, ...patch } : payment
    ));
  };

  const addPayment = () => setPayments([...payments, emptyPayment()]);
  const removePayment = (index: number) => setPayments(payments.filter((_, currentIndex) => currentIndex !== index));

  const selectNewOption = (code: string) => {
    const option = availableOptions.find((entry) => entry.code === code);
    if (!option) return;
    const suggestedCharge = selectedSoldItem
      ? Math.max(0, getProductPrices(option.product).basePrice - selectedSoldItem.line.finalPrice)
      : 0;
    setNewUnit(option.code);
    setChargeNow(suggestedCharge);
    setPayments([{ method: "efectivo", amount: suggestedCharge }]);
  };

  const selectNewOptionByCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    const exact = availableOptions.find((option) => option.code === code);
    const fallback =
      exact ||
      (/^[A-Z]\d{5}-(D|I)$/.test(code)
        ? availableOptions.find((option) => option.code === code.slice(0, -2))
        : undefined);

    if (!fallback) {
      toast.error("No hay stock disponible para cambio con ese codigo");
      return;
    }

    selectNewOption(fallback.code);
    setScanOpen(false);
  };

  const handleExchangePriceBlur = () => {
    if (!newOption || isAdmin) return;
    if (chargeNow < minimumCharge) {
      setChargeNow(minimumCharge);
      toast.error("Solo admin puede cobrar menos de lo que corresponde en el cambio.");
    }
  };

  const submitExchange = () => {
    if (!user) return;
    if (!selectedSoldItem || !newOption) {
      toast.error("Completa el cambio: producto devuelto y producto nuevo");
      return;
    }
    if (!Number.isFinite(chargeNow) || chargeNow < 0) {
      toast.error("Indica cuanto vas a cobrar por el cambio");
      return;
    }
    if (priceBelowAllowed) {
      toast.error("Solo admin puede cobrar menos de lo que corresponde en el cambio.");
      return;
    }
    if (difference > 0) {
      if (normalizedPayments.length === 0 || normalizedPayments.every((payment) => payment.amount <= 0)) {
        toast.error("Registra como se cobro el cambio");
        return;
      }
      if (exchangeRemaining > 0.001) {
        toast.error(`Falta ${fmtMoney(exchangeRemaining)} por cobrar`);
        return;
      }
      if (exchangePaid - exchangeTotalDue > 0.001) {
        toast.error(`Sobra ${fmtMoney(exchangePaid - exchangeTotalDue)}. Corrige el cobro del cambio.`);
        return;
      }
    }

    try {
      const finalExchangePrice = (selectedSoldItem?.line.finalPrice || 0) + chargeNow;
      exchange(
        selectedSale,
        oldUnit,
        newUnit,
        finalExchangePrice,
        difference,
        normalizedPayments,
        exchangeSurchargeTotal,
        exchangeTotalDue,
        user.id,
        user.name,
        operationalRoleFor(user, "vendedor"),
        reason || "Cambio de producto"
      );
      toast.success("Cambio registrado");
      resetExchangeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el cambio");
    }
  };

  const submitWrong = () => {
    if (!user) return;
    if (!selectedSale) {
      toast.error("Selecciona la venta");
      return;
    }
    wrong(selectedSale, reason || "Compra por error", user.id, user.name, operationalRoleFor(user, "admin"));
    toast.success("Compra por error registrada");
    setSelectedSale("");
    setOldUnit("");
    setReason("");
    setWrongSearch("");
  };

  const foundRefundItems = useMemo(() => {
    if (!refundSearch.trim()) return soldItems;
    const query = refundSearch.toLowerCase();
    return soldItems.filter((item) =>
      [
        item.line.productLabel,
        lineDisplayCode(item.line),
        item.sellerName,
        item.soldFrom,
        item.customerPhone || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [refundSearch, soldItems]);

  const submitRefund = () => {
    if (!user) return;
    if (!selectedRefundItem) {
      toast.error("Selecciona el producto que vas a devolver");
      return;
    }

    try {
      refund(
        refundSaleId,
        refundUnit,
        user.id,
        user.name,
        operationalRoleFor(user, "vendedor"),
        refundReason || "Devolucion de producto"
      );
      toast.success("Devolucion registrada");
      resetRefundForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la devolucion");
    }
  };

  return (
    <>
      <PageHeader title="Postventa" subtitle="Cambios, devoluciones y correcciones" />

      <Tabs defaultValue="cambio">
        <TabsList className={`grid ${canWrong ? "grid-cols-4" : "grid-cols-3"} max-w-2xl`}>
          <TabsTrigger value="cambio">Cambio</TabsTrigger>
          <TabsTrigger value="devolucion">Devolucion</TabsTrigger>
          {canWrong && <TabsTrigger value="error">Por error</TabsTrigger>}
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="cambio" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              {!selectedSoldItem ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      1. Busca el producto vendido
                    </p>
                    <Input
                      placeholder="Buscar por codigo vendido, producto o ubicacion"
                      value={soldSearch}
                      onChange={(e) => setSoldSearch(e.target.value)}
                    />
                  </div>

                  <ul className="max-h-[520px] overflow-y-auto rounded-lg border divide-y">
                    {foundSoldItems.length === 0 ? (
                      <li className="p-4 text-sm text-muted-foreground">
                        No hay productos vendidos que coincidan con la busqueda.
                      </li>
                    ) : (
                      foundSoldItems.slice(0, 20).map((item) => (
                        <li key={`${item.saleId}-${item.line.unitCode}`}>
                          <button
                            onClick={() => selectSoldItem(item)}
                            className="w-full px-3 py-3 text-left hover:bg-secondary"
                          >
                            <p className="text-sm font-medium">{item.line.productLabel}</p>
                            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                              {lineDisplayCode(item.line)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Vendida desde: {item.soldFrom}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.sellerName} - {fmtDateTime(item.timestamp)}
                            </p>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Producto vendido
                  </p>
                  <div className="rounded-xl border bg-secondary/20 px-4 py-3">
                    <p className="text-base font-medium">{selectedSoldItem.line.productLabel}</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {lineDisplayCode(selectedSoldItem.line)}
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">Vendida desde:</span>{" "}
                      <strong>{selectedSoldItem.soldFrom}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedSoldItem.sellerName} - {fmtDateTime(selectedSoldItem.timestamp)}
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={clearSelectedSoldItem}>
                    Elegir otro producto vendido
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-5">
              {!selectedSoldItem ? (
                <p className="text-sm text-muted-foreground">
                  Primero elige el producto vendido que el cliente quiere cambiar.
                </p>
              ) : (
                <>
                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      2. Producto que vuelve
                    </p>
                    <div className="rounded-xl border bg-secondary/20 px-4 py-3">
                      <p className="text-base font-medium">{selectedSoldItem.line.productLabel}</p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {lineDisplayCode(selectedSoldItem.line)}
                      </p>
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Vuelve a:</span>{" "}
                        <strong>{selectedSoldItem.line.sourceLocationName || selectedSoldItem.soldFrom}</strong>
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        3. Producto nuevo
                      </p>
                      {!newOption && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setScanOpen(true)}>
                          <ScanLine className="mr-1 size-4" />
                          Escanear
                        </Button>
                      )}
                    </div>

                    {newOption ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border bg-secondary/20 px-4 py-3">
                          <div className="flex justify-between gap-3">
                            <p className="text-base font-medium">
                              {newOption.product.brand} - {newOption.product.model}
                              {newOption.product.size ? ` T${newOption.product.size}` : ""}
                            </p>
                            <strong>{fmtMoney(newProductBasePrice)}</strong>
                          </div>
                          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                            {newOption.displayCode}
                          </p>
                          <p className="mt-2 text-sm">
                            <span className="text-muted-foreground">Sale de:</span>{" "}
                            <strong>{newOption.locationName}</strong>
                          </p>
                        </div>
                        <Button type="button" variant="outline" className="w-full" onClick={clearSelectedNewProduct}>
                          Elegir otro producto nuevo
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input
                          placeholder="Buscar por producto, codigo o ubicacion"
                          value={newSearch}
                          onChange={(e) => setNewSearch(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Puedes hacer el cambio con stock de cualquier tienda o almacen.
                        </p>
                        <div className="max-h-[320px] overflow-y-auto rounded-lg border divide-y">
                          {filteredOptions.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">
                              No hay stock disponible para este cambio.
                            </p>
                          ) : (
                            filteredOptions.map((option) => (
                              <button
                                key={option.code}
                                onClick={() => selectNewOption(option.code)}
                                className="w-full px-3 py-3 text-left hover:bg-secondary"
                              >
                                <div className="flex justify-between gap-3">
                                  <p className="text-sm font-medium">
                                    {option.product.brand} - {option.product.model}
                                    {option.product.size ? ` T${option.product.size}` : ""}
                                  </p>
                                  <span className="text-sm">{fmtMoney(getProductPrices(option.product).basePrice)}</span>
                                </div>
                                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                                  {option.displayCode}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Sale de: {option.locationName}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </section>

                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      4. Resumen del cambio
                    </p>

                    <div className="rounded-xl bg-secondary/40 px-4 py-4 space-y-3">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Producto nuevo</span>
                        <strong className="text-right">
                          {newOption ? `${newOption.product.brand} - ${newOption.product.model}` : "Elige un producto"}
                        </strong>
                      </div>

                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Sale de</span>
                        <strong className="text-right">{newOption?.locationName || "-"}</strong>
                      </div>

                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Precio del producto nuevo</span>
                        <strong>{newOption ? fmtMoney(newProductBasePrice) : "-"}</strong>
                      </div>

                      {canSeeOriginalSaleAmounts && (
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Pagado antes</span>
                          <strong>{fmtMoney(selectedSoldItem.line.finalPrice)}</strong>
                        </div>
                      )}

                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Minimo a cobrar</span>
                        <strong>{newOption ? fmtMoney(minimumCharge) : "-"}</strong>
                      </div>

                      <div className="space-y-2">
                        <Label>Monto a cobrar por el cambio</Label>
                        <Input
                          type="number"
                          min={0}
                          value={chargeNow}
                          onChange={(e) => setChargeNow(Number(e.target.value))}
                          onBlur={handleExchangePriceBlur}
                          placeholder="Ej: 25"
                          disabled={!newOption}
                        />
                      </div>

                      {difference > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label>Cobro registrado por colaborador</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                              <ArrowLeftRight className="size-4 mr-1" /> Pago mixto
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {payments.map((payment, index) => {
                              const effectivePayment = normalizedPayments[index];
                              return (
                                <div key={index} className="rounded-xl border border-border bg-background p-3 space-y-2">
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
                                      <Button size="icon" type="button" variant="ghost" onClick={() => removePayment(index)}>
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
                        </div>
                      )}

                      <div className="flex justify-between gap-3 text-base">
                        <span className="font-medium">Cobrar ahora</span>
                        <strong>{fmtMoney(difference)}</strong>
                      </div>

                      {difference > 0 && (
                        <div className="space-y-1.5 rounded-xl bg-background px-3 py-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cobro comercial</span>
                            <strong>{fmtMoney(difference)}</strong>
                          </div>
                          {exchangeSurchargeTotal > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Recargo tarjeta</span>
                              <strong>{fmtMoney(exchangeSurchargeTotal)}</strong>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total que caja debe confirmar</span>
                            <strong>{fmtMoney(exchangeTotalDue)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Registrado por colaborador</span>
                            <strong>{fmtMoney(exchangePaid)}</strong>
                          </div>
                          <div className={`flex justify-between font-semibold ${Math.abs(exchangeRemaining) < 0.01 ? "text-success" : "text-critical"}`}>
                            <span>{exchangeRemaining > 0.001 ? "Falta" : "Listo para caja"}</span>
                            <strong>{fmtMoney(Math.abs(exchangeRemaining))}</strong>
                          </div>
                        </div>
                      )}

                      {!isAdmin && newOption && (
                        <p className="text-xs text-muted-foreground">
                          Solo admin puede cobrar menos de lo que corresponde en el cambio.
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Si el nuevo producto cuesta menos, no se devuelve diferencia. El colaborador registra el cobro y caja lo confirma.
                      </p>
                    </div>
                  </section>

                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>

                  <Button
                    onClick={submitExchange}
                    className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
                  >
                    Registrar cambio
                  </Button>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="devolucion" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              {!selectedRefundItem ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      1. Busca el producto vendido
                    </p>
                    <Input
                      placeholder="Buscar por codigo vendido, producto o ubicacion"
                      value={refundSearch}
                      onChange={(e) => setRefundSearch(e.target.value)}
                    />
                  </div>

                  <ul className="max-h-[520px] overflow-y-auto rounded-lg border divide-y">
                    {foundRefundItems.length === 0 ? (
                      <li className="p-4 text-sm text-muted-foreground">
                        No hay productos vendidos que coincidan con la busqueda.
                      </li>
                    ) : (
                      foundRefundItems.slice(0, 20).map((item) => (
                        <li key={`refund-${item.saleId}-${item.line.unitCode}`}>
                          <button
                            onClick={() => selectRefundItem(item)}
                            className="w-full px-3 py-3 text-left hover:bg-secondary"
                          >
                            <p className="text-sm font-medium">{item.line.productLabel}</p>
                            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                              {lineDisplayCode(item.line)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Vendida desde: {item.soldFrom}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.sellerName} - {fmtDateTime(item.timestamp)}
                            </p>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Producto vendido
                  </p>
                  <div className="rounded-xl border bg-secondary/20 px-4 py-3">
                    <p className="text-base font-medium">{selectedRefundItem.line.productLabel}</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {lineDisplayCode(selectedRefundItem.line)}
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">Vendida desde:</span>{" "}
                      <strong>{selectedRefundItem.soldFrom}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRefundItem.sellerName} - {fmtDateTime(selectedRefundItem.timestamp)}
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={clearSelectedRefundItem}>
                    Elegir otro producto vendido
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-5">
              {!selectedRefundItem ? (
                <p className="text-sm text-muted-foreground">
                  Primero elige el producto vendido que se va a devolver.
                </p>
              ) : (
                <>
                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      2. Producto que vuelve
                    </p>
                    <div className="rounded-xl border bg-secondary/20 px-4 py-3">
                      <p className="text-base font-medium">{selectedRefundItem.line.productLabel}</p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {lineDisplayCode(selectedRefundItem.line)}
                      </p>
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Vuelve a:</span>{" "}
                        <strong>{selectedRefundItem.line.sourceLocationName || selectedRefundItem.soldFrom}</strong>
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      3. Dinero a devolver
                    </p>
                    <div className="rounded-xl bg-secondary/40 px-4 py-4 space-y-3">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Producto devuelto</span>
                        <strong className="text-right">{selectedRefundItem.line.productLabel}</strong>
                      </div>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Vuelve a</span>
                        <strong className="text-right">
                          {selectedRefundItem.line.sourceLocationName || selectedRefundItem.soldFrom}
                        </strong>
                      </div>
                      <div className="flex justify-between gap-3 text-base">
                        <span className="font-medium">Devolver ahora</span>
                        <strong>{fmtMoney(selectedRefundItem.line.finalPrice)}</strong>
                      </div>
                    </div>
                  </section>

                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
                  </div>

                  <Button
                    onClick={submitRefund}
                    className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
                  >
                    Registrar devolucion
                  </Button>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {canWrong && (
          <TabsContent value="error" className="grid gap-6 mt-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <Input
                placeholder="Buscar venta"
                value={wrongSearch}
                onChange={(e) => setWrongSearch(e.target.value)}
              />
              <ul className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {foundWrongSales.slice(0, 20).map((saleItem) => (
                  <li key={saleItem.id}>
                    <button
                      onClick={() => {
                        setSelectedSale(saleItem.id);
                        setOldUnit("");
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-secondary ${
                        selectedSale === saleItem.id ? "bg-gold-soft" : ""
                      }`}
                    >
                      <div className="flex justify-between gap-3">
                        <span className="font-mono break-all">{saleDisplayCode(saleItem)}</span>
                        {canSeeOriginalSaleAmounts && <span>{fmtMoney(saleItem.total)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vendida desde: {saleOriginLabel(saleItem, locations)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <h3 className="font-display font-bold">Compra por error</h3>
              <div>
                <Label>Motivo</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button onClick={submitWrong} className="w-full bg-foreground text-background hover:bg-foreground/90">
                Registrar
              </Button>
            </div>
          </TabsContent>
        )}

        <TabsContent value="historial" className="mt-4">
          <div className="rounded-2xl border bg-card overflow-hidden">
            {visibleAfterSales.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground text-sm">
                Sin operaciones de postventa
              </p>
            ) : (
              <ul className="divide-y">
                {visibleAfterSales.map((record) => {
                  const differenceValue =
                    record.difference !== undefined ? record.difference : record.diff;
                  return (
                    <li key={record.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium capitalize">{record.type.replace("_", " ")}</p>
                        {record.oldUnitCode && (
                          <p className="font-mono text-xs text-muted-foreground break-all">
                            {record.oldUnitCode}
                            {record.newUnitCode ? ` -> ${record.newUnitCode}` : ""}
                          </p>
                        )}
                        {record.type === "devolucion" && record.returnedToLocationName && (
                          <p className="text-xs text-muted-foreground">
                            Volvio a: {record.returnedToLocationName}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {record.byUserName} - {record.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        {differenceValue !== undefined && <p className="font-bold">{fmtMoney(differenceValue)}</p>}
                        <p className="text-xs text-muted-foreground">{fmtDateTime(record.timestamp)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear producto nuevo</DialogTitle>
          </DialogHeader>
          <QRScanner
            onResult={selectNewOptionByCode}
            onClose={() => setScanOpen(false)}
            allowPairCodes
            expectedHint="Escanea el par o la unidad que vas a entregar en el cambio."
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
