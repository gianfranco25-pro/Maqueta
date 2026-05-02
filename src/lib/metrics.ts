import { useMemo } from "react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export function useDashboardMetrics() {
  const sales = useAppStore((s) => s.sales);
  const inventory = useAppStore((s) => s.inventory);
  const attendance = useAppStore((s) => s.attendance);
  const settings = useAppStore((s) => s.settings);
  const authorizations = useAppStore((s) => s.authorizations);

  return useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const todaySales = sales.filter((s) => {
      const d = new Date(s.timestamp);
      return s.status === "confirmada" && isWithinInterval(d, { start: todayStart, end: todayEnd });
    });
    const weekSales = sales.filter((s) => {
      const d = new Date(s.timestamp);
      return s.status === "confirmada" && isWithinInterval(d, { start: weekStart, end: weekEnd });
    });

    const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
    const weekRevenue = weekSales.reduce((acc, s) => acc + s.total, 0);
    const pairsToday = todaySales.reduce((acc, s) => acc + s.lines.filter((l) => l.isPair).length, 0);
    const pairsWeek = weekSales.reduce((acc, s) => acc + s.lines.filter((l) => l.isPair).length, 0);

    const availableShoes = inventory.filter((i) => i.status === "disponible" && i.side).length / 2;
    const availableAcc = inventory.filter((i) => i.status === "disponible" && !i.side).length;
    const faulty = inventory.filter((i) => i.status === "con_falla").length;

    const attendanceToday = attendance.filter((a) =>
      isWithinInterval(new Date(a.timestamp), { start: todayStart, end: todayEnd })
    );

    const pendingAuth = authorizations.filter((a) => a.status === "pendiente").length;

    return {
      todayRevenue,
      weekRevenue,
      pairsToday,
      pairsWeek,
      availableShoes: Math.floor(availableShoes),
      availableAcc,
      faulty,
      attendanceToday: attendanceToday.length,
      pendingAuth,
      lowStockThreshold: settings.lowStockThreshold,
    };
  }, [sales, inventory, attendance, settings, authorizations]);
}

export function useMyCommission() {
  const user = useCurrentUser();
  const sales = useAppStore((s) => s.sales);
  const settings = useAppStore((s) => s.settings);

  return useMemo(() => {
    if (!user) return { pairs: 0, total: 0, weekPairs: 0, weekTotal: 0, sales: [] };
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const mine = sales.filter((s) => s.sellerId === user.id && s.status === "confirmada");
    const pairs = mine.reduce((a, s) => a + s.lines.filter((l) => l.isPair).length, 0);
    const total = mine.reduce((a, s) => a + (s.commissionTotal ?? s.lines.filter((l) => l.isPair).length * settings.commissionPerPair), 0);
    const weekMine = mine.filter((s) =>
      isWithinInterval(new Date(s.timestamp), { start: weekStart, end: weekEnd })
    );
    const weekPairs = weekMine.reduce((a, s) => a + s.lines.filter((l) => l.isPair).length, 0);
    const weekTotal = weekMine.reduce((a, s) => a + (s.commissionTotal ?? s.lines.filter((l) => l.isPair).length * settings.commissionPerPair), 0);
    return {
      pairs,
      total,
      weekPairs,
      weekTotal,
      sales: mine,
      weekSales: weekMine,
    };
  }, [user, sales, settings]);
}
