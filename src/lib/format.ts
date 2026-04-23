export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(n || 0);

export const fmtNumber = (n: number) =>
  new Intl.NumberFormat("es-PE").format(n || 0);

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
};
