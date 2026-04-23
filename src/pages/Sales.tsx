import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
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

type Filter = "todas" | "pendiente_cobro" | "confirmada" | "anulada";

export default function Sales() {
  const sales = useAppStore((s) => s.sales);
  const voidSale = useAppStore((s) => s.voidSale);
  const user = useCurrentUser();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");

  const counts = useMemo(() => ({
    todas: sales.length,
    pendiente_cobro: sales.filter((s) => s.status === "pendiente_cobro").length,
    confirmada: sales.filter((s) => s.status === "confirmada").length,
    anulada: sales.filter((s) => s.status === "anulada").length,
  }), [sales]);

  const filtered = sales.filter((s) => {
    if (filter !== "todas" && s.status !== filter) return false;
    if (!search) return true;
    return (s.code + s.sellerName + (s.customerPhone || "")).toLowerCase().includes(search.toLowerCase());
  });

  const sale = open ? sales.find((s) => s.id === open) : null;
  const isAdmin = user?.role === "admin";

  return (
    <>
      <PageHeader title="Ventas" subtitle={`${sales.length} registradas`} action={
        <Link to="/ventas/nueva"><Button className="bg-foreground text-background hover:bg-foreground/90">Nueva venta</Button></Link>
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
        <Input placeholder="Buscar por código, vendedor o cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
                    <StatusBadge kind={s.status} />
                  </div>
                  <p className="font-medium truncate">{s.sellerName}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(s.timestamp)} · {s.lines.length} ítems</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-lg">{fmtMoney(s.total)}</p>
                  <StatusBadge kind={s.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={() => { setOpen(null); setVoidReason(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="size-5" />{sale?.code}</DialogTitle></DialogHeader>
          {sale && (
            <div className="space-y-3 text-sm">
              <p><strong>Vendedor:</strong> {sale.sellerName}</p>
              {sale.customerPhone && <p><strong>Cliente:</strong> {sale.customerPhone}</p>}
              <p><strong>Fecha:</strong> {fmtDateTime(sale.timestamp)}</p>
              <div className="rounded-lg border p-3 space-y-1.5">
                {sale.lines.map((l) => (
                  <div key={l.unitCode} className="flex justify-between">
                    <span className="font-mono text-xs">{l.unitCode}</span>
                    <span>{fmtMoney(l.finalPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border p-3 space-y-1.5">
                {sale.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{p.method}{p.surcharge ? ` (+${fmtMoney(p.surcharge)})` : ""}</span>
                    <span>{fmtMoney(p.amount + (p.surcharge || 0))}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span>{fmtMoney(sale.total)}</span></div>
              </div>
              {sale.status === "anulada" && <p className="text-critical text-xs"><strong>Motivo anulación:</strong> {sale.voidReason}</p>}
              {isAdmin && sale.status === "confirmada" && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold uppercase text-critical">Anular venta (admin)</p>
                  <Input placeholder="Motivo" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      if (!voidReason.trim()) return toast.error("Indica un motivo");
                      voidSale(sale.id, voidReason, user!.id, user!.name);
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
