import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { useCan } from "@/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { getProductPrices } from "@/lib/pricing";
import { operationalRoleFor } from "@/lib/types";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export default function AfterSales() {
  const sales = useAppStore((s) => s.sales);
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const aftersales = useAppStore((s) => s.afterSales);
  const exchange = useAppStore((s) => s.registerExchange);
  const wrong = useAppStore((s) => s.registerWrongPurchase);
  const user = useCurrentUser();
  const canWrong = useCan("aftersales.wrong");

  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<string>("");
  const [oldUnit, setOldUnit] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [reason, setReason] = useState("");

  const confirmedSales = sales.filter((s) => s.status === "confirmada");
  const found = confirmedSales.filter((s) =>
    !search ? true : (s.code + (s.customerPhone || "") + s.sellerName).toLowerCase().includes(search.toLowerCase())
  );
  const sale = confirmedSales.find((s) => s.id === selectedSale);
  const oldLine = sale?.lines.find((l) => l.unitCode === oldUnit);

  const availableOptions = useMemo(() => {
    const groupedPairs = new Map<string, typeof inventory>();
    inventory.forEach((item) => {
      if (item.status !== "disponible") return;
      if (!item.pairCode) return;
      groupedPairs.set(item.pairCode, [...(groupedPairs.get(item.pairCode) || []), item]);
    });

    const pairs = Array.from(groupedPairs.entries())
      .filter(([, items]) => items.length === 2 && items.every((i) => i.locationId === items[0].locationId))
      .map(([pairCode, items]) => ({ code: pairCode, productId: items[0].productId }));

    const accessories = inventory
      .filter((item) => item.status === "disponible" && !item.pairCode)
      .map((item) => ({ code: item.unitCode, productId: item.productId }));

    return [...pairs, ...accessories]
      .map((option) => {
        const product = products.find((p) => p.id === option.productId);
        return product ? { ...option, product } : null;
      })
      .filter((option): option is NonNullable<typeof option> => Boolean(option));
  }, [inventory, products]);

  const newOption = availableOptions.find((option) => option.code === newUnit);
  const difference = oldLine && newOption ? Math.max(0, getProductPrices(newOption.product).basePrice - oldLine.finalPrice) : 0;

  const selectSale = (id: string) => {
    setSelectedSale(id);
    setOldUnit("");
    setNewUnit("");
  };

  const submitExchange = () => {
    if (!user) return;
    if (!selectedSale || !oldUnit || !newUnit) return toast.error("Selecciona la venta, el producto devuelto y el nuevo producto");
    try {
      exchange(selectedSale, oldUnit, newUnit, difference, user.id, user.name, operationalRoleFor(user, "vendedor"), reason || "Cambio de producto");
      toast.success("Cambio registrado");
      setSelectedSale("");
      setOldUnit("");
      setNewUnit("");
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el cambio");
    }
  };

  const submitWrong = () => {
    if (!user) return;
    if (!selectedSale) return toast.error("Selecciona venta");
    wrong(selectedSale, reason || "Compra por error", user.id, user.name, operationalRoleFor(user, "admin"));
    toast.success("Compra por error registrada");
    setSelectedSale(""); setReason("");
  };

  return (
    <>
      <PageHeader title="Postventa" subtitle="Cambios, errores y correcciones" />

      <Tabs defaultValue="cambio">
        <TabsList className={`grid ${canWrong ? "grid-cols-3" : "grid-cols-2"} max-w-md`}>
          <TabsTrigger value="cambio">Cambio</TabsTrigger>
          {canWrong && <TabsTrigger value="error">Por error</TabsTrigger>}
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="cambio" className="grid lg:grid-cols-2 gap-6 mt-4">
          <div className="rounded-2xl bg-card border p-5 space-y-3">
            <Input placeholder="Buscar venta confirmada" value={search} onChange={(e) => setSearch(e.target.value)} />
            <ul className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {found.slice(0, 20).map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => selectSale(s.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-secondary text-sm ${selectedSale === s.id ? "bg-gold-soft" : ""}`}
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-mono">{s.code}</span>
                      <span>{fmtMoney(s.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.sellerName} · {fmtDateTime(s.timestamp)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-card border p-5 space-y-4">
            <h3 className="font-display font-bold">Cambio guiado</h3>

            {sale ? (
              <div className="space-y-3">
                <div className="rounded-lg border divide-y overflow-hidden">
                  {sale.lines.map((line) => (
                    <button
                      key={line.unitCode}
                      onClick={() => setOldUnit(line.unitCode)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-secondary ${oldUnit === line.unitCode ? "bg-gold-soft" : ""}`}
                    >
                      <div className="flex justify-between gap-3">
                        <span className="font-medium">{line.productLabel}</span>
                        <span>{fmtMoney(line.finalPrice)}</span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{line.unitCode}</p>
                    </button>
                  ))}
                </div>

                <div>
                  <Label>Nuevo producto disponible</Label>
                  <div className="max-h-56 overflow-y-auto rounded-lg border divide-y mt-1">
                    {availableOptions.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">Sin stock disponible para cambio</p>
                    ) : availableOptions.map((option) => (
                      <button
                        key={option.code}
                        onClick={() => setNewUnit(option.code)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-secondary ${newUnit === option.code ? "bg-gold-soft" : ""}`}
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-medium">{option.product.brand} {option.product.model}</span>
                          <span>{fmtMoney(getProductPrices(option.product).basePrice)}</span>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{option.code}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-secondary p-3 text-sm">
                  <div className="flex justify-between"><span>Vendido en</span><strong>{oldLine ? fmtMoney(oldLine.finalPrice) : "—"}</strong></div>
                  <div className="flex justify-between"><span>Nuevo precio</span><strong>{newOption ? fmtMoney(getProductPrices(newOption.product).basePrice) : "—"}</strong></div>
                  <div className="flex justify-between"><span>Diferencia a cobrar</span><strong>{fmtMoney(difference)}</strong></div>
                  <p className="text-xs text-muted-foreground mt-2">Si el nuevo producto cuesta menos, no se devuelve diferencia.</p>
                </div>

                <div><Label>Motivo</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                <Button onClick={submitExchange} className="w-full bg-foreground text-background hover:bg-foreground/90">Registrar cambio</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona una venta confirmada para ver sus productos.</p>
            )}
          </div>
        </TabsContent>

        {canWrong && (
          <TabsContent value="error" className="grid lg:grid-cols-2 gap-6 mt-4">
            <div className="rounded-2xl bg-card border p-5 space-y-3">
              <Input placeholder="Buscar venta" value={search} onChange={(e) => setSearch(e.target.value)} />
              <ul className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {found.slice(0, 20).map((s) => (
                  <li key={s.id}>
                    <button onClick={() => selectSale(s.id)} className={`w-full text-left px-3 py-2 hover:bg-secondary text-sm ${selectedSale === s.id ? "bg-gold-soft" : ""}`}>
                      <div className="flex justify-between"><span className="font-mono">{s.code}</span><span>{fmtMoney(s.total)}</span></div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-card border p-5 space-y-3">
              <h3 className="font-display font-bold">Compra por error</h3>
              <div><Label>Motivo</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
              <Button onClick={submitWrong} className="w-full bg-foreground text-background hover:bg-foreground/90">Registrar</Button>
            </div>
          </TabsContent>
        )}

        <TabsContent value="historial" className="mt-4">
          <div className="rounded-2xl bg-card border overflow-hidden">
            {aftersales.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground text-sm">Sin operaciones de postventa</p>
            ) : (
              <ul className="divide-y">
                {aftersales.map((a) => (
                  <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{a.saleCode}</p>
                      <p className="font-medium capitalize">{a.type.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">{a.byUserName} · {a.reason}</p>
                    </div>
                    <div className="text-right">
                      {a.diff !== undefined && <p className="font-bold">{fmtMoney(a.diff)}</p>}
                      <p className="text-xs text-muted-foreground">{fmtDateTime(a.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
