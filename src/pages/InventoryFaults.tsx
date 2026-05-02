import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/AppShell";
import { InventoryCodeSummaryList } from "@/components/InventoryCodeSummaryList";
import { QRScanner } from "@/components/QRScanner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";
import {
  expandSelectionCodes,
  mergePairSelectionModes,
  normalizeInventoryOperationCode,
  pairSelectionModeFromRawCode,
  type PairSelectionMode,
  summarizeMovementUnitCodes,
  summarizeSelectionCodes,
} from "@/lib/inventory-code-summary";
import { operationalRoleFor, ROLE_LABELS } from "@/lib/types";

export default function InventoryFaults() {
  const loc = useLocation();
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);
  const movements = useAppStore((s) => s.movements).filter((movement) => movement.type === "falla");
  const markItemsAsFault = useAppStore((s) => s.markItemsAsFault);
  const user = useCurrentUser();

  const [codes, setCodes] = useState<string[]>([]);
  const [pairModes, setPairModes] = useState<Record<string, PairSelectionMode>>({});
  const [manualCode, setManualCode] = useState("");
  const [reason, setReason] = useState("");

  const selectedSummaries = useMemo(
    () => summarizeSelectionCodes(codes, inventory, products, locations, pairModes),
    [codes, inventory, products, locations, pairModes]
  );

  const movementRows = useMemo(
    () =>
      movements.map((movement) => ({
        movement,
        summaries: summarizeMovementUnitCodes(movement.unitCodes, inventory, products, locations),
      })),
    [movements, inventory, products, locations]
  );

  const selectedItems = useMemo(() => {
    try {
      return expandSelectionCodes(codes, inventory, pairModes)
        .map((unitCode) => inventory.find((item) => item.unitCode === unitCode))
        .filter(Boolean);
    } catch {
      return [];
    }
  }, [codes, inventory, pairModes]);

  useEffect(() => {
    const prefill = (loc.state as any)?.prefillUnit;
    if (prefill) addCode(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCode = (rawCode: string) => {
    try {
      const normalizedCode = normalizeInventoryOperationCode(rawCode, inventory);
      const incomingMode = pairSelectionModeFromRawCode(rawCode);
      if (!normalizedCode) return;

      if (codes.includes(normalizedCode)) {
        setPairModes((current) => ({
          ...current,
          [normalizedCode]: mergePairSelectionModes(current[normalizedCode], incomingMode),
        }));
        setManualCode("");
        return;
      }

      setCodes([...codes, normalizedCode]);
      if (normalizedCode.startsWith("A")) {
        setPairModes((current) => ({
          ...current,
          [normalizedCode]: incomingMode,
        }));
      }
      setManualCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el codigo");
    }
  };

  const submit = () => {
    if (!user) return;
    if (!codes.length) return toast.error("Agrega al menos un codigo");
    if (!reason.trim()) return toast.error("Indica el motivo de la falla");
    try {
      const unitCodes = expandSelectionCodes(codes, inventory, pairModes);
      markItemsAsFault(unitCodes, reason, user.id, user.name, operationalRoleFor(user, "almacen"));
      toast.success("Falla registrada");
      setCodes([]);
      setPairModes({});
      setReason("");
      setManualCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la falla");
    }
  };

  return (
    <>
      <PageHeader title="Fallas" subtitle="Marca productos con dano o problema fisico y deja registro" />

      <div className="grid lg:grid-cols-[1fr_420px] gap-6">
        <div className="rounded-2xl bg-card border p-5 space-y-4">
          <QRScanner onResult={addCode} allowPairCodes />

          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <Input
              placeholder="Ej: A00001, A00001-D o B00001"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") addCode(manualCode);
              }}
              className="font-mono"
            />
            <Button variant="outline" onClick={() => addCode(manualCode)}>Agregar</Button>
          </div>

          <div className="rounded-xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            Si ingresas un codigo de zapato, el sistema te muestra el par y puedes marcar con falla ambos lados o solo uno.
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Productos a marcar con falla</p>
            <InventoryCodeSummaryList
              items={selectedSummaries}
              emptyText="Escanea o ingresa codigos para marcar productos con falla"
              onRemove={(rawCode) => {
                setCodes(codes.filter((code) => code !== rawCode));
                setPairModes((current) => {
                  const next = { ...current };
                  delete next[rawCode];
                  return next;
                });
              }}
              pairModes={pairModes}
              onChangePairMode={(key, mode) => setPairModes((current) => ({ ...current, [key]: mode }))}
            />
          </div>

          {selectedItems.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 border-b text-xs uppercase font-semibold text-muted-foreground">Estado actual</div>
              <ul className="divide-y">
                {selectedItems.map((item) => {
                  if (!item) return null;
                  const product = products.find((productEntry) => productEntry.id === item.productId);
                  const location = locations.find((locationEntry) => locationEntry.id === item.locationId);
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
            <Label>Que problema tiene</Label>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>

          <Button onClick={submit} className="h-12 w-full bg-critical text-critical-foreground hover:opacity-90">
            Guardar como con falla
          </Button>
        </div>

        <div className="rounded-2xl bg-card border overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Historial de productos con falla</div>
          {movementRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Todavia no hay productos marcados con falla</p>
          ) : (
            <ul className="divide-y max-h-[650px] overflow-y-auto">
              {movementRows.map(({ movement, summaries }) => (
                <li key={movement.id} className="px-4 py-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {movement.byUserName}
                    {movement.byUserRole ? ` (${ROLE_LABELS[movement.byUserRole]})` : ""}
                    {" · "}
                    {fmtDateTime(movement.timestamp)}
                  </p>
                  <InventoryCodeSummaryList items={summaries} />
                  {movement.reason && <p className="text-xs text-critical">{movement.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
