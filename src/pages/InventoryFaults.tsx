import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/QRScanner";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { operationalRoleFor } from "@/lib/types";

export default function InventoryFaults() {
  const loc = useLocation();
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const markFault = useAppStore((s) => s.markAsFault);
  const user = useCurrentUser();

  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const prefill = (loc.state as any)?.prefillUnit;
    if (prefill) setCode(prefill);
  }, [loc.state]);

  const faulty = inventory.filter((i) => i.status === "con_falla");

  const submit = () => {
    if (!user) return;
    if (!code || !reason) return toast.error("Indica código y motivo");
    if (!inventory.find((i) => i.unitCode === code.toUpperCase())) return toast.error("Código no existe");
    markFault(code.toUpperCase(), reason, user.id, user.name, operationalRoleFor(user, "almacen"));
    toast.success("Marcado con falla");
    setCode(""); setReason("");
  };

  return (
    <>
      <PageHeader title="Fallas" subtitle="Marca productos defectuosos" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border p-5 space-y-4">
          <QRScanner onResult={(c) => setCode(c)} />
          <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
          <Input placeholder="Motivo de la falla" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={submit} className="w-full bg-critical text-critical-foreground hover:opacity-90">Marcar con falla</Button>
        </div>
        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Productos con falla ({faulty.length})</div>
          {faulty.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Sin fallas</p> :
            <ul className="divide-y max-h-96 overflow-y-auto">
              {faulty.map((i) => {
                const p = products.find((x) => x.id === i.productId);
                return (
                  <li key={i.id} className="px-4 py-3 flex justify-between items-start gap-2">
                    <div>
                      <p className="font-mono text-xs">{i.unitCode}</p>
                      <p className="text-sm">{p?.brand} · {p?.model}</p>
                      {i.notes && <p className="text-xs text-critical">{i.notes}</p>}
                    </div>
                    <StatusBadge kind="con_falla" />
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
