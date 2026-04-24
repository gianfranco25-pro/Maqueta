import { PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useMyCommission } from "@/lib/metrics";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { Wallet, Package, TrendingUp } from "lucide-react";
import { useAppStore, useCurrentUser } from "@/lib/store";

export default function MyIncome() {
  const c = useMyCommission();
  const user = useCurrentUser();
  const settings = useAppStore((s) => s.settings);
  const sales = useAppStore((s) => s.sales).filter((s) => s.sellerId === user?.id && s.status === "confirmada");

  return (
    <>
      <PageHeader title="Mis ingresos" subtitle="Comisión por par vendido" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Comisión semana" value={fmtMoney(c.weekTotal)} icon={Wallet} tone="gold" hint={`${c.weekPairs} pares`} />
        <StatCard label="Comisión total" value={fmtMoney(c.total)} icon={TrendingUp} hint={`${c.pairs} pares`} />
        <StatCard label="Pares semana" value={c.weekPairs} icon={Package} />
        <StatCard label="Pares total" value={c.pairs} icon={Package} />
      </div>

      <div className="rounded-2xl bg-card border overflow-hidden">
        <div className="px-4 py-3 border-b font-display font-bold">Detalle de ganancias</div>
        {sales.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Sin ventas todavía</p>
        ) : (
          <ul className="divide-y">
            {sales.map((s) => {
              const soldCodes = s.lines.map((line) => line.unitCode).join(", ");
              const salePairs = s.lines.filter((line) => line.isPair).length;
              const commission = salePairs * settings.commissionPerPair;

              return (
                <li key={s.id} className="px-4 py-3 flex justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs break-words">{soldCodes}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(s.timestamp)} · {salePairs} pares con comisión</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{fmtMoney(commission)}</p>
                    <p className="text-[11px] text-muted-foreground">Comisión</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
