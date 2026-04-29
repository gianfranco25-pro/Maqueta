import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/AppShell";
import { QRScanner, isPairCode } from "@/components/QRScanner";
import { StatusBadge } from "@/components/StatusBadge";
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
import { Textarea } from "@/components/ui/textarea";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { fmtDateTime } from "@/lib/format";
import { operationalRoleFor, ROLE_LABELS, type ItemStatus } from "@/lib/types";
import { toast } from "sonner";

const ADJUSTMENT_STATUSES: Array<{ value: ItemStatus; label: string }> = [
  { value: "disponible", label: "Disponible" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "con_falla", label: "Con falla" },
  { value: "bloqueado", label: "Bloqueado" },
];

export default function InventoryAdjustments() {
  const loc = useLocation();
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);
  const movements = useAppStore((s) => s.movements).filter((movement) => movement.type === "ajuste");
  const adjustInventoryItems = useAppStore((s) => s.adjustInventoryItems);
  const user = useCurrentUser();

  const [codes, setCodes] = useState<string[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState<ItemStatus>("disponible");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const prefill = (loc.state as any)?.prefillUnit;
    if (prefill) addCode(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCode = (value: string) => {
    const code = value.trim().toUpperCase();
    if (!code || codes.includes(code)) return;
    const exists = isPairCode(code)
      ? inventory.some((item) => item.unitCode === `${code}-D`) && inventory.some((item) => item.unitCode === `${code}-I`)
      : inventory.some((item) => item.unitCode === code);
    if (!exists) return toast.error("Codigo no existe");
    setCodes([...codes, code]);
    setManualCode("");
  };

  const submit = () => {
    if (!user) return;
    if (!codes.length) return toast.error("Agrega al menos un codigo");
    if (!reason.trim()) return toast.error("Indica un motivo");
    try {
      adjustInventoryItems(codes, status, reason, user.id, user.name, operationalRoleFor(user, "almacen"));
      toast.success("Ajuste registrado");
      setCodes([]);
      setReason("");
      setStatus("disponible");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el ajuste");
    }
  };

  const selectedItems = codes.flatMap((code) => {
    if (isPairCode(code)) return [`${code}-D`, `${code}-I`].map((unitCode) => inventory.find((item) => item.unitCode === unitCode)).filter(Boolean);
    return inventory.find((item) => item.unitCode === code) || [];
  });

  return (
    <>
      <PageHeader title="Ajustes de inventario" subtitle="Motivo, responsable, fecha y trazabilidad de estado" />
      <div className="grid lg:grid-cols-[1fr_420px] gap-6">
        <div className="rounded-2xl bg-card border p-5 space-y-4">
          <QRScanner onResult={addCode} allowPairCodes />

          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <Input
              placeholder="Codigo o par completo"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") addCode(manualCode);
              }}
              className="font-mono"
            />
            <Button variant="outline" onClick={() => addCode(manualCode)}>Agregar</Button>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Items a ajustar</p>
            {codes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Escanea o ingresa codigos</p>
            ) : (
              <ul className="space-y-1">
                {codes.map((code) => (
                  <li key={code} className="flex justify-between items-center bg-secondary rounded px-2 py-1 text-sm">
                    <span className="font-mono">{code}</span>
                    <button onClick={() => setCodes(codes.filter((item) => item !== code))} className="text-critical text-xs">
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedItems.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 border-b text-xs uppercase font-semibold text-muted-foreground">Estado actual</div>
              <ul className="divide-y">
                {selectedItems.map((item) => {
                  const product = products.find((productItem) => productItem.id === item?.productId);
                  const location = locations.find((locationItem) => locationItem.id === item?.locationId);
                  if (!item) return null;
                  return (
                    <li key={item.id} className="px-3 py-2 flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-xs">{item.unitCode}</p>
                        <p className="truncate">{product?.brand} - {product?.model}</p>
                        <p className="text-xs text-muted-foreground">{location?.name}</p>
                      </div>
                      <StatusBadge kind={item.status} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div>
            <Label>Nuevo estado</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as ItemStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_STATUSES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Motivo</Label>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>

          <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">
            Registrar ajuste
          </Button>
        </div>

        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Historial de ajustes</div>
          {movements.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin ajustes registrados</p>
          ) : (
            <ul className="divide-y max-h-[650px] overflow-y-auto">
              {movements.map((movement) => (
                <li key={movement.id} className="px-4 py-3 text-sm">
                  <p className="font-mono text-xs break-words">{movement.unitCodes.join(", ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {movement.byUserName}{movement.byUserRole ? ` (${ROLE_LABELS[movement.byUserRole]})` : ""} - {fmtDateTime(movement.timestamp)}
                  </p>
                  {movement.reason && <p className="text-xs mt-1">{movement.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
