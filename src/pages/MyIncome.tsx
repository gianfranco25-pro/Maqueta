import { PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useMyCommission } from "@/lib/metrics";
import { fmtMoney, fmtDateTime, fmtDate } from "@/lib/format";
import { Wallet, TrendingUp } from "lucide-react";
import { useAppStore, useCurrentUser } from "@/lib/store";

export default function MyIncome() {
  const c = useMyCommission();
  const user = useCurrentUser();
  const settings = useAppStore((s) => s.settings);
  const sales = useAppStore((s) => s.sales).filter((sale) => sale.sellerId === user?.id && sale.status === "confirmada");
  const advances = useAppStore((s) => s.advances).filter((advance) => advance.userId === user?.id);
  const advanceTotal = advances.reduce((acc, advance) => acc + advance.amount, 0);

  return (
    <>
      <PageHeader title="Mis ingresos" subtitle="Mi comision y mis adelantos" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard label="Comision semana" value={fmtMoney(c.weekTotal)} icon={Wallet} tone="gold" hint={`${c.weekPairs} pares`} />
        <StatCard label="Comision total" value={fmtMoney(c.total)} icon={TrendingUp} hint={`${c.pairs} pares`} />
        <StatCard label="Adelantos" value={fmtMoney(advanceTotal)} icon={Wallet} />
      </div>

      <div className="rounded-2xl bg-card border p-4 mb-6">
        <p className="text-xs uppercase font-semibold text-muted-foreground">Politica de pago</p>
        <p className="text-sm mt-1">{settings.paymentPolicy}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Detalle de ganancias</div>
          {sales.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin ventas todavia</p>
          ) : (
            <ul className="divide-y">
              {sales.map((sale) => {
                const soldCodes = sale.lines.map((line) => line.unitCode).join(", ");
                const salePairs = sale.lines.filter((line) => line.isPair).length;
                const commission = sale.commissionTotal ?? salePairs * settings.commissionPerPair;

                return (
                  <li key={sale.id} className="px-4 py-3 flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-xs break-words">{soldCodes}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(sale.timestamp)} - {salePairs} pares con comision</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">{fmtMoney(commission)}</p>
                      <p className="text-[11px] text-muted-foreground">Comision</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Mis adelantos</div>
          {advances.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin adelantos registrados</p>
          ) : (
            <ul className="divide-y">
              {advances.map((advance) => (
                <li key={advance.id} className="px-4 py-3 flex justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{advance.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(advance.timestamp)}
                      {advance.paymentDate ? ` - Pago ${fmtDate(advance.paymentDate)}` : ""}
                    </p>
                  </div>
                  <p className="font-bold shrink-0">{fmtMoney(advance.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
