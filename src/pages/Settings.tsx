import { PageHeader } from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    if (form.maxDiscountSoles < 0) return toast.error("La rebaja maxima por defecto no puede ser negativa");
    if (form.cardSurchargePct < 0) return toast.error("El recargo no puede ser negativo");
    if (form.lowStockThreshold < 0) return toast.error("El umbral de stock no puede ser negativo");
    update(form);
    toast.success("Configuracion actualizada");
  };

  return (
    <>
      <PageHeader title="Configuracion" subtitle="Solo reglas globales del sistema" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border p-5 space-y-3">
          <h3 className="font-display font-bold">Reglas de venta</h3>
          <div>
            <Label>Rebaja maxima por defecto para nueva referencia (S/)</Label>
            <Input type="number" value={form.maxDiscountSoles} onChange={(event) => setForm({ ...form, maxDiscountSoles: +event.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">
              Solo se usa como valor inicial. Cada referencia mantiene su propio precio minimo de venta.
            </p>
          </div>
          <div>
            <Label>Recargo tarjeta (%)</Label>
            <Input type="number" value={form.cardSurchargePct} onChange={(event) => setForm({ ...form, cardSurchargePct: +event.target.value })} />
          </div>
          <div>
            <Label>Umbral global de stock bajo</Label>
            <Input type="number" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: +event.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">
              Se aplica a inventario y reportes, no al alta de referencias del catalogo.
            </p>
          </div>
          <Button className="w-full bg-foreground text-background hover:bg-foreground/90" onClick={submit}>
            Guardar reglas
          </Button>
        </div>
      </div>
    </>
  );
}
