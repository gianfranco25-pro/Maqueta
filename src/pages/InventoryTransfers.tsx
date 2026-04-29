import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/AppShell";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isPairCode, QRScanner } from "@/components/QRScanner";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";
import { isLocationActive, LOCATION_TYPE_LABELS, operationalRoleFor, ROLE_LABELS } from "@/lib/types";

export default function InventoryTransfers() {
  const loc = useLocation();
  const inventory = useAppStore((s) => s.inventory);
  const movements = useAppStore((s) => s.movements).filter((m) => m.type === "traslado");
  const locations = useAppStore((s) => s.locations);
  const transfer = useAppStore((s) => s.transferItems);
  const user = useCurrentUser();
  const activeLocations = locations.filter(isLocationActive);

  const [codes, setCodes] = useState<string[]>([]);
  const [toLoc, setToLoc] = useState(activeLocations[0]?.id || "");
  const [received, setReceived] = useState("");

  useEffect(() => {
    const prefill = (loc.state as any)?.prefillUnit;
    if (prefill) addCode(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (codes.length === 0) return toast.error("Agrega al menos un código");
    try {
      transfer(codes, toLoc, user.id, user.name, operationalRoleFor(user, "almacen"), received || undefined);
      toast.success("Traslado registrado");
      setCodes([]);
      setReceived("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el traslado");
    }
  };

  return (
    <>
      <PageHeader title="Traslados" subtitle="Mueve ítems entre ubicaciones" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border p-5 space-y-4">
          <QRScanner onResult={(c) => addCode(c)} allowPairCodes />
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Items a trasladar</p>
            {codes.length === 0 ? <p className="text-sm text-muted-foreground">Escanea o ingresa códigos</p> :
              <ul className="space-y-1">
                {codes.map((c) => (
                  <li key={c} className="flex justify-between items-center bg-secondary rounded px-2 py-1 text-sm">
                    <span className="font-mono">{c}</span>
                    <button onClick={() => setCodes(codes.filter((x) => x !== c))} className="text-critical text-xs">Quitar</button>
                  </li>
                ))}
              </ul>
            }
          </div>
          <div>
            <Label>Destino</Label>
            <Select value={toLoc} onValueChange={setToLoc}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {activeLocations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({LOCATION_TYPE_LABELS[l.type]})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Recibe (opcional, otros)</Label>
            <Input value={received} onChange={(e) => setReceived(e.target.value)} placeholder="Nombre" />
          </div>
          <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">Confirmar traslado</Button>
        </div>

        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Historial de traslados</div>
          {movements.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Sin traslados</p> :
            <ul className="divide-y max-h-96 overflow-y-auto">
              {movements.map((mv) => (
                <li key={mv.id} className="px-4 py-3 text-sm">
                  <p className="font-mono text-xs">{mv.unitCodes.join(", ")}</p>
                  <p className="text-xs text-muted-foreground">{mv.byUserName}{mv.byUserRole ? ` (${ROLE_LABELS[mv.byUserRole]})` : ""}{mv.receivedBy ? ` → ${mv.receivedBy}` : ""} · {fmtDateTime(mv.timestamp)}</p>
                </li>
              ))}
            </ul>
          }
        </div>
      </div>
    </>
  );
}
