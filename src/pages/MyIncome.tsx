import { PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useMyCommission } from "@/lib/metrics";
import { fmtMoney, fmtDateTime } from "@/lib/format";
import { Wallet, Package, TrendingUp } from "lucide-react";
import { useAppStore, useCurrentUser } from "@/lib/store";

export default function MyIncome() {
  const c = useMyCommission();
  const user = useCurrentUser();
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
        <div className="px-4 py-3 border-b font-display font-bold">Mis ventas</div>
        {sales.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Sin ventas todavía</p>
        ) : (
          <ul className="divide-y">
            {sales.map((s) => (
              <li key={s.id} className="px-4 py-3 flex justify-between">
                <div>
                  <p className="font-mono text-xs">{s.code}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(s.timestamp)} · {s.lines.length} ítems</p>
                </div>
                <p className="font-bold">{fmtMoney(s.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
