import { PageHeader } from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { useCan } from "@/components/Can";

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const canManageSettings = useCan("settings.system");
  const [form, setForm] = useState(settings);

  if (!canManageSettings) {
    return (
      <>
        <PageHeader title="Configuracion" />
        <div className="rounded-2xl bg-card border p-8 text-center text-muted-foreground">Solo Administrador general</div>
      </>
    );
  }

  const submit = () => {
    if (form.maxDiscountSoles < 0) return toast.error("El descuento maximo no puede ser negativo");
    if (form.cardSurchargePct < 0) return toast.error("El recargo no puede ser negativo");
    if (form.commissionPerPair < 0) return toast.error("La comision no puede ser negativa");
    if (form.lowStockThreshold < 0) return toast.error("El umbral de stock no puede ser negativo");
    if (!form.paymentPolicy.trim()) return toast.error("Define la politica de pago");
    update(form);
    toast.success("Configuracion actualizada");
  };

  return (
    <>
      <PageHeader title="Configuracion" subtitle="Reglas comerciales y operativas" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border p-5 space-y-3">
          <h3 className="font-display font-bold">Reglas de venta</h3>
          <div>
            <Label>Descuento maximo para colaborador (S/)</Label>
            <Input type="number" value={form.maxDiscountSoles} onChange={(event) => setForm({ ...form, maxDiscountSoles: +event.target.value })} />
          </div>
          <div>
            <Label>Recargo tarjeta (%)</Label>
            <Input type="number" value={form.cardSurchargePct} onChange={(event) => setForm({ ...form, cardSurchargePct: +event.target.value })} />
          </div>
          <div>
            <Label>Umbral stock bajo</Label>
            <Input type="number" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: +event.target.value })} />
          </div>
        </div>

        <div className="rounded-2xl bg-card border p-5 space-y-3">
          <h3 className="font-display font-bold">Liquidacion y pagos</h3>
          <div>
            <Label>Comision por par vendido valido (S/)</Label>
            <Input type="number" value={form.commissionPerPair} onChange={(event) => setForm({ ...form, commissionPerPair: +event.target.value })} />
          </div>
          <div>
            <Label>Politica de pago</Label>
            <Textarea
              value={form.paymentPolicy}
              onChange={(event) => setForm({ ...form, paymentPolicy: event.target.value })}
              rows={5}
            />
          </div>
          <Button className="w-full bg-foreground text-background hover:bg-foreground/90" onClick={submit}>
            Guardar reglas
          </Button>
        </div>
      </div>
    </>
  );
}
