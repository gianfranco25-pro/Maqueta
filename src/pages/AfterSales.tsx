import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { useCan } from "@/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export default function AfterSales() {
  const sales = useAppStore((s) => s.sales);
  const aftersales = useAppStore((s) => s.afterSales);
  const exchange = useAppStore((s) => s.registerExchange);
  const wrong = useAppStore((s) => s.registerWrongPurchase);
  const user = useCurrentUser();
  const canWrong = useCan("aftersales.wrong");

  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<string>("");
  const [oldUnit, setOldUnit] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [diff, setDiff] = useState(0);
  const [reason, setReason] = useState("");

  const found = sales.filter((s) =>
    !search ? true : (s.code + (s.customerPhone || "") + s.sellerName).toLowerCase().includes(search.toLowerCase())
  );

  const submitExchange = () => {
    if (!user) return;
    if (!selectedSale || !oldUnit || !newUnit) return toast.error("Completa los códigos");
    exchange(selectedSale, oldUnit.toUpperCase(), newUnit.toUpperCase(), diff, user.id, user.name, reason || "Cambio de producto");
    toast.success("Cambio registrado");
    setSelectedSale(""); setOldUnit(""); setNewUnit(""); setDiff(0); setReason("");
  };

  const submitWrong = () => {
    if (!user) return;
    if (!selectedSale) return toast.error("Selecciona venta");
    wrong(selectedSale, reason || "Compra por error", user.id, user.name);
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
            <Input placeholder="Buscar venta (código o cliente)" value={search} onChange={(e) => setSearch(e.target.value)} />
            <ul className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {found.slice(0, 20).map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedSale(s.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-secondary text-sm ${selectedSale === s.id ? "bg-gold-soft" : ""}`}
                  >
                    <div className="flex justify-between">
                      <span className="font-mono">{s.code}</span>
                      <span>{fmtMoney(s.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.sellerName} · {fmtDateTime(s.timestamp)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-card border p-5 space-y-3">
            <h3 className="font-display font-bold">Datos del cambio</h3>
            <div><Label>Código del producto a devolver</Label><Input value={oldUnit} onChange={(e) => setOldUnit(e.target.value)} placeholder="A00001 o B00001" /></div>
            <div><Label>Código del producto nuevo</Label><Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="A00002 o B00002" /></div>
            <div>
              <Label>Diferencia (positiva si cliente paga más)</Label>
              <Input type="number" value={diff} onChange={(e) => setDiff(+e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Si el nuevo cuesta menos, no se devuelve dinero.</p>
            </div>
            <div><Label>Motivo</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <Button onClick={submitExchange} className="w-full bg-foreground text-background hover:bg-foreground/90">Registrar cambio</Button>
          </div>
        </TabsContent>

        <TabsContent value="error" className="grid lg:grid-cols-2 gap-6 mt-4">
          <div className="rounded-2xl bg-card border p-5 space-y-3">
            <Input placeholder="Buscar venta" value={search} onChange={(e) => setSearch(e.target.value)} />
            <ul className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {found.slice(0, 20).map((s) => (
                <li key={s.id}>
                  <button onClick={() => setSelectedSale(s.id)} className={`w-full text-left px-3 py-2 hover:bg-secondary text-sm ${selectedSale === s.id ? "bg-gold-soft" : ""}`}>
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
