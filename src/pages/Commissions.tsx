import { PageHeader } from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { StatCard } from "@/components/StatCard";
import { fmtMoney } from "@/lib/format";
import { Wallet, Package, TrendingUp } from "lucide-react";

export default function Commissions() {
  const sales = useAppStore((s) => s.sales);
  const users = useAppStore((s) => s.users);
  const settings = useAppStore((s) => s.settings);

  const sellers = users.filter((u) => u.role === "vendedor");

  const rows = sellers.map((u) => {
    const mine = sales.filter((s) => s.sellerId === u.id && s.status === "confirmada");
    const pairs = mine.reduce((a, s) => a + s.lines.filter((l) => l.isPair).length, 0);
    const totalSold = mine.reduce((a, s) => a + s.total, 0);
    return { user: u, pairs, commission: pairs * settings.commissionPerPair, totalSold, count: mine.length };
  });

  const totalCommission = rows.reduce((a, r) => a + r.commission, 0);
  const totalPairs = rows.reduce((a, r) => a + r.pairs, 0);

  return (
    <>
      <PageHeader title="Comisiones y liquidaciones" subtitle={`S/ ${settings.commissionPerPair} por par vendido`} />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total comisiones" value={fmtMoney(totalCommission)} icon={Wallet} tone="gold" />
        <StatCard label="Pares vendidos" value={totalPairs} icon={Package} />
        <StatCard label="Vendedores" value={sellers.length} icon={TrendingUp} />
      </div>

      <div className="rounded-2xl bg-card border overflow-hidden">
        <div className="px-4 py-3 border-b font-display font-bold">Liquidación por vendedor</div>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.user.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-foreground text-background grid place-items-center font-bold text-sm">
                  {r.user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.user.name}</p>
                  <p className="text-xs text-muted-foreground">{r.count} ventas · {r.pairs} pares · vendido {fmtMoney(r.totalSold)}</p>
                </div>
              </div>
              <p className="font-display font-extrabold text-xl text-accent">{fmtMoney(r.commission)}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
