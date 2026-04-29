import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { StatCard } from "@/components/StatCard";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Wallet, Package, TrendingUp } from "lucide-react";
import { getUserRoles } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Commissions() {
  const sales = useAppStore((s) => s.sales);
  const users = useAppStore((s) => s.users);
  const settings = useAppStore((s) => s.settings);
  const advances = useAppStore((s) => s.advances);
  const addAdvance = useAppStore((s) => s.addAdvance);
  const currentUser = useCurrentUser();

  const sellers = users.filter((user) => getUserRoles(user).includes("vendedor"));
  const [sellerId, setSellerId] = useState(sellers[0]?.id || "");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  const rows = sellers.map((seller) => {
    const sellerSales = sales.filter((sale) => sale.sellerId === seller.id && sale.status === "confirmada");
    const pairs = sellerSales.reduce((acc, sale) => acc + sale.lines.filter((line) => line.isPair).length, 0);
    const totalSold = sellerSales.reduce((acc, sale) => acc + sale.total, 0);
    const commission = sellerSales.reduce(
      (acc, sale) => acc + (sale.commissionTotal ?? sale.lines.filter((line) => line.isPair).length * settings.commissionPerPair),
      0
    );
    const advanceTotal = advances
      .filter((advance) => advance.userId === seller.id)
      .reduce((acc, advance) => acc + advance.amount, 0);
    return {
      user: seller,
      pairs,
      commission,
      advances: advanceTotal,
      netToPay: Math.max(0, commission - advanceTotal),
      carryover: Math.max(0, advanceTotal - commission),
      totalSold,
      count: sellerSales.length,
    };
  });

  const totalCommission = rows.reduce((acc, row) => acc + row.commission, 0);
  const totalPairs = rows.reduce((acc, row) => acc + row.pairs, 0);
  const totalAdvances = rows.reduce((acc, row) => acc + row.advances, 0);
  const totalNetToPay = rows.reduce((acc, row) => acc + row.netToPay, 0);
  const totalCarryover = rows.reduce((acc, row) => acc + row.carryover, 0);

  const submitAdvance = () => {
    const seller = sellers.find((item) => item.id === sellerId);
    if (!seller || !currentUser) return;
    if (amount <= 0) return toast.error("El adelanto debe ser mayor a 0");
    if (!reason.trim()) return toast.error("Indica un motivo");

    addAdvance({
      userId: seller.id,
      userName: seller.name,
      amount,
      reason,
      paymentDate: paymentDate || undefined,
      byUserId: currentUser.id,
      byUserName: currentUser.name,
    });
    toast.success("Adelanto registrado");
    setAmount(0);
    setReason("");
    setPaymentDate("");
  };

  return (
    <>
      <PageHeader title="Comisiones y liquidaciones" subtitle="Comision por par congelada al confirmar la venta" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total comisiones" value={fmtMoney(totalCommission)} icon={Wallet} tone="gold" />
        <StatCard label="Adelantos" value={fmtMoney(totalAdvances)} icon={TrendingUp} />
        <StatCard label="Neto a pagar" value={fmtMoney(totalNetToPay)} icon={Wallet} />
        <StatCard label="Saldo por descontar" value={fmtMoney(totalCarryover)} icon={TrendingUp} />
        <StatCard label="Pares vendidos" value={totalPairs} icon={Package} />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Liquidacion por colaborador</div>
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.user.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-foreground text-background grid place-items-center font-bold text-sm">
                    {row.user.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{row.user.name}</p>
                    <p className="text-xs text-muted-foreground">{row.count} ventas - {row.pairs} pares - vendido {fmtMoney(row.totalSold)}</p>
                    <p className="text-xs text-muted-foreground">Adelantos {fmtMoney(row.advances)}</p>
                    {row.carryover > 0 && (
                      <p className="text-xs text-critical">Saldo por descontar {fmtMoney(row.carryover)}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-extrabold text-xl text-accent">{fmtMoney(row.netToPay)}</p>
                  <p className="text-[11px] text-muted-foreground">A pagar</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-card border p-5">
            <h2 className="font-display font-bold">Politica de pago</h2>
            <p className="text-sm text-muted-foreground mt-1">{settings.paymentPolicy}</p>
          </div>

          <div className="rounded-2xl bg-card border p-5 space-y-3">
            <h2 className="font-display font-bold">Registrar adelanto</h2>
            <div>
              <Label>Colaborador</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" value={amount} onChange={(event) => setAmount(+event.target.value)} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            <div>
              <Label>Fecha o politica de pago</Label>
              <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </div>
            <Button onClick={submitAdvance} className="w-full bg-foreground text-background hover:bg-foreground/90">
              Guardar adelanto
            </Button>
          </div>

          <div className="rounded-2xl bg-card border overflow-hidden">
            <div className="px-4 py-3 border-b font-display font-bold">Historial de adelantos</div>
            {advances.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground text-center">Sin adelantos registrados</p>
            ) : (
              <ul className="divide-y max-h-80 overflow-y-auto">
                {advances.map((advance) => (
                  <li key={advance.id} className="px-4 py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{advance.userName}</p>
                        <p className="text-xs text-muted-foreground">{advance.reason}</p>
                        {advance.paymentDate && <p className="text-xs text-muted-foreground">Pago: {fmtDate(advance.paymentDate)}</p>}
                      </div>
                      <p className="font-bold">{fmtMoney(advance.amount)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
