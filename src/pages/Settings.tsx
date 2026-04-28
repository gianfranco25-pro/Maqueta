import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { useCan } from "@/components/Can";

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const reset = useAppStore((s) => s.resetData);
  useCurrentUser();
  const canManageSettings = useCan("settings.system");
  const [form, setForm] = useState(settings);

  if (!canManageSettings) {
    return (
      <>
        <PageHeader title="Configuración" />
        <div className="rounded-2xl bg-card border p-8 text-center text-muted-foreground">Solo admin</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Configuración" subtitle="Precios, descuentos y comisiones" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border p-5 space-y-3">
          <h3 className="font-display font-bold">Reglas de venta</h3>
          <div>
            <Label>Descuento máx para vendedor (S/)</Label>
            <Input type="number" value={form.maxDiscountSoles} onChange={(e) => setForm({ ...form, maxDiscountSoles: +e.target.value })} />
          </div>
          <div>
            <Label>Recargo tarjeta (%)</Label>
            <Input type="number" value={form.cardSurchargePct} onChange={(e) => setForm({ ...form, cardSurchargePct: +e.target.value })} />
          </div>
          <div>
            <Label>Comisión por par vendido (S/)</Label>
            <Input type="number" value={form.commissionPerPair} onChange={(e) => setForm({ ...form, commissionPerPair: +e.target.value })} />
          </div>
          <div>
            <Label>Umbral stock bajo</Label>
            <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: +e.target.value })} />
          </div>
          <Button className="w-full bg-foreground text-background hover:bg-foreground/90" onClick={() => { update(form); toast.success("Configuración actualizada"); }}>Guardar</Button>
        </div>

        <div className="rounded-2xl bg-card border p-5 space-y-3">
          <h3 className="font-display font-bold">Datos del prototipo</h3>
          <p className="text-sm text-muted-foreground">Toda la información se guarda en tu navegador (localStorage). Puedes resetearla cuando quieras.</p>
          <Button variant="destructive" onClick={() => { reset(); toast.success("Datos restablecidos"); }}>Resetear datos</Button>
        </div>
      </div>
    </>
  );
}
