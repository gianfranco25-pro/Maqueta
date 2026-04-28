import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Receipt, XCircle } from "lucide-react";
import type { PaymentMethod } from "@/lib/types";
import { toast } from "sonner";

import { useCan } from "@/components/Can";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "💵 Efectivo",
  transferencia: "🏦 Transferencia",
  yape_plin: "📱 Yape/Plin",
  tarjeta: "💳 Tarjeta",
};

export default function PendingPayments() {
  const sales = useAppStore((s) => s.sales);
  const confirmSalePayment = useAppStore((s) => s.confirmSalePayment);
  const cancelDraftSale = useAppStore((s) => s.cancelDraftSale);
  const user = useCurrentUser();
  const canCancelDraft = useCan("sales.cancelDraft");

  const pending = useMemo(
    () => sales.filter((s) => s.status === "pendiente_cobro"),
    [sales]
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  const sale = openId ? pending.find((s) => s.id === openId) : null;

  const openSale = (id: string) => setOpenId(id);

  const paid = sale?.payments.reduce((a, p) => a + p.amount + (p.surcharge || 0), 0) || 0;
  const remaining = sale ? sale.total - paid : 0;

  const confirm = () => {
    if (!sale || !user) return;
    if (remaining > 0.001) return toast.error(`Falta ${fmtMoney(remaining)} por cobrar`);
    if (paid - sale.total > 0.001) return toast.error(`Sobra ${fmtMoney(paid - sale.total)} — debe corregirlo el vendedor`);
    const updated = confirmSalePayment(sale.id, sale.payments, sale.totalSurcharge, sale.total, user.id, user.name, user.role);
    if (updated) {
      toast.success(`Venta ${updated.code} cobrada`, { description: fmtMoney(updated.total) });
      setOpenId(null);
    }
  };

  const cancel = () => {
    if (!sale) return;
    if (!cancelReason.trim()) return toast.error("Indica un motivo");
    cancelDraftSale(sale.id, cancelReason);
    toast.success("Venta cancelada y stock liberado");
    setCancelOpen(false);
    setCancelReason("");
    setOpenId(null);
  };

  return (
    <>
      <PageHeader
        title="Por cobrar"
        subtitle={`${pending.length} venta${pending.length === 1 ? "" : "s"} esperando pago`}
      />

      <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
        {pending.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="size-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No hay ventas pendientes de cobro</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {pending.map((s) => {
              return (
                <li
                  key={s.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/40 cursor-pointer"
                  onClick={() => openSale(s.id)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
                      <StatusBadge kind="pendiente_cobro" />
                    </div>
                    <p className="font-medium truncate">{s.sellerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(s.timestamp)} · {s.lines.length} ítem{s.lines.length === 1 ? "" : "s"}
                      {s.customerPhone ? ` · ${s.customerPhone}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-lg">{fmtMoney(s.total || s.subtotal)}</p>
                    <Button size="sm" className="mt-1 bg-gradient-gold text-accent-foreground hover:opacity-90">
                      Verificar
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!openId} onOpenChange={() => setOpenId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" /> Verificar y cobrar {sale?.code}
            </DialogTitle>
          </DialogHeader>
          {sale && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Vendedor: <strong>{sale.sellerName}</strong></p>
                {sale.customerPhone && (
                  <p className="text-xs text-muted-foreground">Cliente: <strong>{sale.customerPhone}</strong></p>
                )}
              </div>

              <div className="rounded-lg border border-border divide-y">
                {sale.lines.map((l) => (
                  <div key={l.unitCode} className="flex justify-between p-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-muted-foreground">{l.unitCode}</p>
                      <p className="text-xs truncate">{l.productLabel}</p>
                    </div>
                    <span className="font-semibold">{fmtMoney(l.finalPrice)}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs uppercase font-semibold">Pago registrado por vendedor</Label>
                </div>
                <div className="rounded-xl border border-border divide-y">
                  {sale.payments.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-2 text-sm">
                      <span>{METHOD_LABEL[p.method]}</span>
                      <span className="font-semibold">
                        {fmtMoney(p.amount + (p.surcharge || 0))}
                        {p.surcharge ? <span className="text-xs text-muted-foreground"> (+{fmtMoney(p.surcharge)})</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-foreground text-background p-3 space-y-1.5">
                <div className="flex justify-between text-xs"><span className="opacity-70">Subtotal</span><span>{fmtMoney(sale.subtotal)}</span></div>
                {sale.totalSurcharge > 0 && (
                  <div className="flex justify-between text-xs"><span className="opacity-70">Recargo</span><span>+{fmtMoney(sale.totalSurcharge)}</span></div>
                )}
                <div className="flex justify-between font-display font-extrabold text-xl pt-1 border-t border-background/20">
                  <span>Total</span><span className="text-accent">{fmtMoney(sale.total)}</span>
                </div>
                <div className="flex justify-between text-xs"><span className="opacity-70">Pagado</span><span>{fmtMoney(paid)}</span></div>
                <div className={`flex justify-between text-xs font-semibold ${Math.abs(remaining) < 0.01 ? "text-success" : "text-critical"}`}>
                  <span>{remaining < 0 ? "Sobra" : "Falta"}</span>
                  <span>{fmtMoney(Math.abs(remaining))}</span>
                </div>
              </div>

              <div className={`grid ${canCancelDraft ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                {canCancelDraft && (
                  <Button
                    variant="outline"
                    onClick={() => setCancelOpen(true)}
                    className="border-critical/40 text-critical hover:bg-critical-soft"
                  >
                    <XCircle className="size-4 mr-1" /> Anular
                  </Button>
                )}
                <Button
                  onClick={confirm}
                  disabled={Math.abs(remaining) > 0.001}
                  className="bg-gradient-gold text-accent-foreground hover:opacity-90 font-bold"
                >
                  <CheckCircle2 className="size-4 mr-1" /> Confirmar pago
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anular venta pendiente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">El stock reservado volverá a estar disponible.</p>
            <Input placeholder="Motivo" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            <Button variant="destructive" className="w-full" onClick={cancel}>
              Anular venta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
