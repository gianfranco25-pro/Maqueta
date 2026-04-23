import { PageHeader } from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function InventorySamples() {
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const setSample = useAppStore((s) => s.markAsSample);
  const setStatus = useAppStore((s) => s.updateItemStatus);

  const samples = inventory.filter((i) => i.status === "muestra");
  const available = inventory.filter((i) => i.status === "disponible").slice(0, 30);

  return (
    <>
      <PageHeader title="Muestras" subtitle="Marca ítems como muestra" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Disponibles</div>
          <ul className="divide-y max-h-[500px] overflow-y-auto">
            {available.map((i) => {
              const p = products.find((x) => x.id === i.productId);
              return (
                <li key={i.id} className="px-3 py-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-mono text-xs">{i.unitCode}</p>
                    <p>{p?.brand} · {p?.model}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setSample(i.unitCode); toast.success("Marcado como muestra"); }}>Marcar muestra</Button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Muestras ({samples.length})</div>
          {samples.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Sin muestras</p> :
            <ul className="divide-y">
              {samples.map((i) => {
                const p = products.find((x) => x.id === i.productId);
                return (
                  <li key={i.id} className="px-3 py-2 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-mono text-xs">{i.unitCode}</p>
                      <p>{p?.brand} · {p?.model}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge kind="muestra" />
                      <Button size="sm" variant="ghost" onClick={() => { setStatus(i.unitCode, "disponible"); toast.success("Devuelto a disponible"); }}>Liberar</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          }
        </div>
      </div>
    </>
  );
}
