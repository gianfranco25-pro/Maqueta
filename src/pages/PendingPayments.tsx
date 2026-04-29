import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
import { CheckCircle2, CreditCard, Receipt, Trash2, XCircle, ArrowLeftRight } from "lucide-react";
import type { PaymentMethod, PaymentSplit } from "@/lib/types";
import { operationalRoleFor } from "@/lib/types";
import { toast } from "sonner";
import { useCan } from "@/components/Can";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  yape_plin: "Yape/Plin",
  tarjeta: "Tarjeta",
};

const emptyPayment = (): PaymentSplit => ({ method: "efectivo", amount: 0 });

export default function PendingPayments() {
  const loc = useLocation();
  const sales = useAppStore((s) => s.sales);
  const settings = useAppStore((s) => s.settings);
  const confirmSalePayment = useAppStore((s) => s.confirmSalePayment);
  const cancelDraftSale = useAppStore((s) => s.cancelDraftSale);
  const user = useCurrentUser();
  const canCancelDraft = useCan("sales.cancelDraft");

  const pending = useMemo(
    () => sales.filter((sale) => sale.status === "pendiente_cobro"),
    [sales]
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentSplit[]>([emptyPayment()]);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  const sale = openId ? pending.find((item) => item.id === openId) : null;
  const normalizedPayments = payments.map((payment) => {
    const amount = Number.isFinite(payment.amount) ? payment.amount : 0;
    return {
      ...payment,
      amount,
      surcharge: payment.method === "tarjeta" ? +(amount * (settings.cardSurchargePct / 100)).toFixed(2) : 0,
    };
  });
  const surchargeTotal = normalizedPayments.reduce((acc, payment) => acc + (payment.surcharge || 0), 0);
  const totalDue = (sale?.subtotal || 0) + surchargeTotal;
  const paid = normalizedPayments.reduce((acc, payment) => acc + payment.amount + (payment.surcharge || 0), 0);
  const remaining = totalDue - paid;

  const openSale = (id: string) => {
    setOpenId(id);
    const selected = pending.find((item) => item.id === id);
    setPayments(selected?.payments.length ? selected.payments : [emptyPayment()]);
  };

  useEffect(() => {
    const saleCode = (loc.state as any)?.saleCode;
    const selected = saleCode ? pending.find((item) => item.code === saleCode) : null;
    if (selected) openSale(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const updatePayment = (index: number, patch: Partial<PaymentSplit>) => {
    setPayments(payments.map((payment, currentIndex) =>
      currentIndex === index ? { ...payment, ...patch } : payment
    ));
  };

  const addPayment = () => setPayments([...payments, emptyPayment()]);
  const fillRemaining = (index: number) => updatePayment(index, { amount: Math.max(0, +(remaining + (payments[index]?.amount || 0)).toFixed(2)) });
  const removePayment = (index: number) => setPayments(payments.filter((_, currentIndex) => currentIndex !== index));

  const confirm = () => {
    if (!sale || !user) return;
    if (payments.length === 0 || payments.every((payment) => payment.amount <= 0)) {
      return toast.error("Registra al menos un pago");
    }
    if (remaining > 0.001) return toast.error(`Falta ${fmtMoney(remaining)} por cobrar`);
    if (paid - totalDue > 0.001) return toast.error(`Sobra ${fmtMoney(paid - totalDue)}. Corrige el cobro antes de confirmar`);

    const updated = confirmSalePayment(
      sale.id,
      normalizedPayments,
      surchargeTotal,
      totalDue,
      user.id,
      user.name,
      operationalRoleFor(user, "cajero")
    );
    if (updated) {
      toast.success(`Venta ${updated.code} cobrada`, { description: fmtMoney(updated.total) });
      setOpenId(null);
      setPayments([emptyPayment()]);
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
        subtitle={`${pending.length} venta${pending.length === 1 ? "" : "s"} esperando cobro`}
      />

      <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
        {pending.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="size-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No hay ventas pendientes de cobro</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {pending.map((item) => (
              <li
                key={item.id}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/40 cursor-pointer"
                onClick={() => openSale(item.id)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                    <StatusBadge kind="pendiente_cobro" />
                  </div>
                  <p className="font-medium truncate">{item.sellerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(item.timestamp)} - {item.lines.length} item{item.lines.length === 1 ? "" : "s"}
                    {item.customerPhone ? ` - ${item.customerPhone}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-lg">{fmtMoney(item.subtotal)}</p>
                  <Button size="sm" className="mt-1 bg-gradient-gold text-accent-foreground hover:opacity-90">
                    Cobrar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!openId} onOpenChange={(open) => {
        if (!open) {
          setOpenId(null);
          setPayments([emptyPayment()]);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" /> Cobrar {sale?.code}
            </DialogTitle>
          </DialogHeader>
          {sale && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Colaborador: <strong>{sale.sellerName}</strong></p>
                {sale.customerPhone && (
                  <p className="text-xs text-muted-foreground">Cliente: <strong>{sale.customerPhone}</strong></p>
                )}
              </div>

              <div className="rounded-lg border border-border divide-y">
                {sale.lines.map((line) => (
                  <div key={line.unitCode} className="flex justify-between p-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-muted-foreground">{line.unitCode}</p>
                      <p className="text-xs truncate">{line.productLabel}</p>
                    </div>
                    <span className="font-semibold">{fmtMoney(line.finalPrice)}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs uppercase font-semibold">Cobro por caja</Label>
                  <Button variant="outline" size="sm" onClick={addPayment}>
                    <ArrowLeftRight className="size-4 mr-1" /> Pago mixto
                  </Button>
                </div>
                <div className="space-y-2">
                  {payments.map((payment, index) => {
                    const effectivePayment = normalizedPayments[index];
                    return (
                    <div key={index} className="rounded-xl border border-border p-2 space-y-1.5">
                      <div className="flex gap-2 items-center">
                        <select
                          value={payment.method}
                          onChange={(event) => updatePayment(index, { method: event.target.value as PaymentMethod, surcharge: 0 })}
                          className="flex-1 rounded-md border border-input bg-card text-sm h-9 px-2"
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
                        <Button size="sm" variant="outline" onClick={() => fillRemaining(index)}>Falta</Button>
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
                  )})}
                </div>
              </div>

              <div className="rounded-2xl bg-foreground text-background p-3 space-y-1.5">
                <div className="flex justify-between text-xs"><span className="opacity-70">Subtotal comercial</span><span>{fmtMoney(sale.subtotal)}</span></div>
                {surchargeTotal > 0 && (
                  <div className="flex justify-between text-xs"><span className="opacity-70">Recargo</span><span>+{fmtMoney(surchargeTotal)}</span></div>
                )}
                <div className="flex justify-between font-display font-extrabold text-xl pt-1 border-t border-background/20">
                  <span>Total a cobrar</span><span className="text-accent">{fmtMoney(totalDue)}</span>
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
                  disabled={Math.abs(remaining) > 0.001 || payments.every((payment) => payment.amount <= 0)}
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
            <p className="text-sm text-muted-foreground">El stock reservado volvera a estar disponible.</p>
            <Input placeholder="Motivo" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
            <Button variant="destructive" className="w-full" onClick={cancel}>
              Anular venta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
