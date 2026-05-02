import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { useCan } from "@/components/Can";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { operationalRoleFor } from "@/lib/types";

type Filter = "todas" | "pendiente_cobro" | "confirmada" | "anulada";

const lineCodesLabel = (line?: { sourceUnitCodes?: string[]; unitCode: string }) =>
  line?.sourceUnitCodes?.length ? line.sourceUnitCodes.join(" / ") : line?.unitCode || "";

export default function Sales() {
  const allSales = useAppStore((s) => s.sales);
  const locations = useAppStore((s) => s.locations);
  const voidSale = useAppStore((s) => s.voidSale);
  const user = useCurrentUser();
  const canViewAll = useCan("sales.view.all");
  const canCreate = useCan("sales.create");
  const canCollect = useCan("sales.collect");
  const canCancel = useCan("sales.cancel");
  const canViewProfit = useCan("profit.view");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");

  // Colaborador: solo ve sus propias ventas
  const sales = useMemo(
    () => (canViewAll ? allSales : allSales.filter((s) => s.sellerId === user?.id)),
    [allSales, canViewAll, user?.id]
  );

  const counts = useMemo(() => ({
    todas: sales.length,
    pendiente_cobro: sales.filter((s) => s.status === "pendiente_cobro").length,
    confirmada: sales.filter((s) => s.status === "confirmada").length,
    anulada: sales.filter((s) => s.status === "anulada").length,
  }), [sales]);

  const filtered = sales.filter((s) => {
    if (filter !== "todas" && s.status !== filter) return false;
    if (!search) return true;
    return (
      s.sellerName +
      (s.customerPhone || "") +
      s.lines.map((line) => lineCodesLabel(line)).join(" ")
    ).toLowerCase().includes(search.toLowerCase());
  });

  const sale = open ? sales.find((s) => s.id === open) : null;
  const saleLocationName = sale ? locations.find((location) => location.id === sale.locationId)?.name : undefined;

  return (
    <>
      <PageHeader title="Ventas" subtitle={`${sales.length} registradas`} action={
        canCreate ? (
          <Link to="/ventas/nueva"><Button className="bg-foreground text-background hover:bg-foreground/90">Nueva venta</Button></Link>
        ) : null
      }/>

      <div className="space-y-3 mb-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="todas" className="text-xs">Todas <span className="ml-1 opacity-60">{counts.todas}</span></TabsTrigger>
            <TabsTrigger value="pendiente_cobro" className="text-xs">Por cobrar <span className="ml-1 opacity-60">{counts.pendiente_cobro}</span></TabsTrigger>
            <TabsTrigger value="confirmada" className="text-xs">Confirmadas <span className="ml-1 opacity-60">{counts.confirmada}</span></TabsTrigger>
            <TabsTrigger value="anulada" className="text-xs">Anuladas <span className="ml-1 opacity-60">{counts.anulada}</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="Buscar por código, colaborador o cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Sin ventas</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/40 cursor-pointer" onClick={() => setOpen(s.id)}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-muted-foreground">{lineCodesLabel(s.lines[0])}</p>
                    <StatusBadge kind={s.status} />
                  </div>
                  <p className="font-medium truncate">{s.sellerName}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(s.timestamp)} · {s.lines.length} ítems</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-lg">{fmtMoney(s.status === "pendiente_cobro" ? s.subtotal : s.total)}</p>
                  {s.status === "pendiente_cobro" && canCollect && (
                    <Link to="/ventas/por-cobrar" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="text-xs h-7 mt-1">Cobrar</Button>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={() => { setOpen(null); setVoidReason(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="size-5" />Detalle de venta</DialogTitle></DialogHeader>
          {sale && (
            <div className="space-y-3 text-sm">
              <p><strong>Colaborador:</strong> {sale.sellerName}</p>
              {saleLocationName && <p><strong>Venta registrada en:</strong> {saleLocationName}</p>}
              {sale.customerPhone && <p><strong>Cliente:</strong> {sale.customerPhone}</p>}
              <p><strong>Fecha:</strong> {fmtDateTime(sale.timestamp)}</p>
              <div className="rounded-lg border p-3 space-y-1.5">
                {sale.lines.map((l) => (
                  <div key={l.unitCode} className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-xs">{l.unitCode}</span>
                      <p className="text-xs text-muted-foreground">{l.productLabel}</p>
                      {l.sourceLocationName && (
                        <p className="text-[11px] text-muted-foreground">
                          Se saco de: {l.sourceLocationName}
                          {l.takenFromStorageByName ? ` · Lo retiro ${l.takenFromStorageByName}` : ""}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0">{fmtMoney(l.finalPrice)}</span>
                  </div>
                ))}
              </div>
              {canViewProfit && (
                <div className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span>Utilidad de la venta</span>
                    <strong>{fmtMoney(sale.utilityTotal ?? sale.lines.reduce((acc, line) => acc + (line.utility ?? line.finalPrice - (line.cost ?? 0)), 0))}</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Utilidad = precio final vendido - costo.</p>
                </div>
              )}
              {sale.payments.length > 0 && (
                <div className="rounded-lg border p-3 space-y-1.5">
                  {sale.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{p.method}{p.surcharge ? ` (+${fmtMoney(p.surcharge)})` : ""}</span>
                      <span>{fmtMoney(p.amount + (p.surcharge || 0))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span>{fmtMoney(sale.total)}</span></div>
                </div>
              )}
              {sale.status === "pendiente_cobro" && (
                <p className="text-xs text-gold"><strong>Esta venta está esperando cobro.</strong> Ve a "Por cobrar" para registrar el pago.</p>
              )}
              {sale.status === "anulada" && <p className="text-critical text-xs"><strong>Motivo anulación:</strong> {sale.voidReason}</p>}
              {canCancel && sale.status === "confirmada" && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold uppercase text-critical">Anular venta (admin)</p>
                  <Input placeholder="Motivo" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      if (!voidReason.trim()) return toast.error("Indica un motivo");
                      voidSale(sale.id, voidReason, user!.id, user!.name, operationalRoleFor(user, "admin"));
                      toast.success("Venta anulada");
                      setOpen(null);
                      setVoidReason("");
                    }}
                  >
                    Anular venta
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
