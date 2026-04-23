import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusKind =
  | "disponible"
  | "vendido"
  | "muestra"
  | "con_falla"
  | "trasladado"
  | "reservado"
  | "pendiente"
  | "pendiente_cobro"
  | "aprobada"
  | "rechazada"
  | "confirmada"
  | "anulada"
  | "corregida"
  | "info"
  | "success"
  | "warning"
  | "critical"
  | "muted";

const styles: Record<StatusKind, string> = {
  disponible: "bg-success-soft text-success border-success/30",
  vendido: "bg-muted text-muted-foreground border-border",
  muestra: "bg-gold-soft text-gold border-gold/30",
  con_falla: "bg-critical-soft text-critical border-critical/30",
  trasladado: "bg-blue-100 text-blue-800 border-blue-300",
  reservado: "bg-amber-100 text-amber-800 border-amber-300",
  pendiente: "bg-gold-soft text-gold border-gold/30",
  pendiente_cobro: "bg-gold-soft text-gold border-gold/30",
  aprobada: "bg-success-soft text-success border-success/30",
  rechazada: "bg-critical-soft text-critical border-critical/30",
  confirmada: "bg-success-soft text-success border-success/30",
  anulada: "bg-critical-soft text-critical border-critical/30",
  corregida: "bg-blue-100 text-blue-800 border-blue-300",
  info: "bg-secondary text-foreground border-border",
  success: "bg-success-soft text-success border-success/30",
  warning: "bg-gold-soft text-gold border-gold/30",
  critical: "bg-critical-soft text-critical border-critical/30",
  muted: "bg-muted text-muted-foreground border-border",
};

const labels: Partial<Record<StatusKind, string>> = {
  disponible: "Disponible",
  vendido: "Vendido",
  muestra: "Muestra",
  con_falla: "Con falla",
  trasladado: "Trasladado",
  reservado: "Reservado",
  pendiente: "Pendiente",
  pendiente_cobro: "Por cobrar",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  confirmada: "Confirmada",
  anulada: "Anulada",
  corregida: "Corregida",
};

export function StatusBadge({ kind, children, className }: { kind: StatusKind; children?: ReactNode; className?: string }) {
  return (
    <span className={cn("badge-soft border", styles[kind], className)}>
      {children ?? labels[kind] ?? kind}
    </span>
  );
}
