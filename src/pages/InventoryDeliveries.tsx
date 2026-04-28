import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPairCode, QRScanner } from "@/components/QRScanner";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";
import { operationalRoleFor } from "@/lib/types";

export default function InventoryDeliveries() {
  const inventory = useAppStore((s) => s.inventory);
  const movements = useAppStore((s) => s.movements).filter((m) => m.type === "entrega");
  const deliver = useAppStore((s) => s.deliverFromWarehouse);
  const user = useCurrentUser();

  const [codes, setCodes] = useState<string[]>([]);
  const [received, setReceived] = useState("");

  const addCode = (c: string) => {
    const code = c.toUpperCase();
    if (codes.includes(code)) return;
    const exists = isPairCode(code)
      ? inventory.some((i) => i.unitCode === `${code}-D`) && inventory.some((i) => i.unitCode === `${code}-I`)
      : inventory.some((i) => i.unitCode === code);
    if (!exists) return toast.error("Código no existe");
    setCodes([...codes, code]);
  };

  const submit = () => {
    if (!user) return;
    if (codes.length === 0 || !received) return toast.error("Indica códigos y quién recibe");
    try {
      deliver(codes, user.id, user.name, operationalRoleFor(user, "almacen"), received);
      toast.success("Entrega registrada");
      setCodes([]);
      setReceived("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la entrega");
    }
  };

  return (
    <>
      <PageHeader title="Entregas desde depósito" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border p-5 space-y-4">
          <QRScanner onResult={addCode} allowPairCodes />
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Items a entregar</p>
            {codes.length === 0 ? <p className="text-sm text-muted-foreground">Escanea códigos o pares completos</p> :
              <ul className="space-y-1">
                {codes.map((c) => (
                  <li key={c} className="flex justify-between bg-secondary rounded px-2 py-1 text-sm">
                    <span className="font-mono">{c}</span>
                    <button onClick={() => setCodes(codes.filter((x) => x !== c))} className="text-critical text-xs">Quitar</button>
                  </li>
                ))}
              </ul>
            }
          </div>
          <Input placeholder="Vendedor que recibe (nombre exacto)" value={received} onChange={(e) => setReceived(e.target.value)} />
          <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">Registrar entrega</Button>
        </div>
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Historial de entregas</div>
          {movements.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Sin entregas</p> :
            <ul className="divide-y max-h-96 overflow-y-auto">
              {movements.map((mv) => (
                <li key={mv.id} className="px-4 py-3 text-sm">
                  <p className="font-mono text-xs">{mv.unitCodes.join(", ")}</p>
                  <p className="text-xs text-muted-foreground">{mv.byUserName}{mv.byUserRole ? ` (${mv.byUserRole})` : ""} → {mv.receivedBy} · {fmtDateTime(mv.timestamp)}</p>
                </li>
              ))}
            </ul>
          }
        </div>
      </div>
    </>
  );
}
