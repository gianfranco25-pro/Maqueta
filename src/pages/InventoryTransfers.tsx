import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/AppShell";
import { InventoryCodeSummaryList } from "@/components/InventoryCodeSummaryList";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QRScanner } from "@/components/QRScanner";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";
import {
  expandSelectionCodes,
  mergePairSelectionModes,
  normalizeInventoryOperationCode,
  pairSelectionModeFromRawCode,
  PairSelectionMode,
  summarizeMovementUnitCodes,
  summarizeSelectionCodes,
} from "@/lib/inventory-code-summary";
import {
  isLocationActive,
  isStorageLocation,
  LOCATION_TYPE_LABELS,
  operationalRoleFor,
  ROLE_LABELS,
} from "@/lib/types";

export default function InventoryTransfers() {
  const loc = useLocation();
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const movements = useAppStore((s) => s.movements).filter(
    (movement) => movement.type === "traslado" || movement.type === "devolucion"
  );
  const locations = useAppStore((s) => s.locations);
  const transfer = useAppStore((s) => s.transferItems);
  const user = useCurrentUser();
  const activeLocations = locations.filter(isLocationActive);
  const locationLabelById = (locationId?: string) =>
    locations.find((location) => location.id === locationId)?.name || "Sin ubicacion";

  const [codes, setCodes] = useState<string[]>([]);
  const [toLoc, setToLoc] = useState(activeLocations[0]?.id || "");
  const [pairModes, setPairModes] = useState<Record<string, PairSelectionMode>>({});

  const selectedSummaries = useMemo(
    () => summarizeSelectionCodes(codes, inventory, products, locations, pairModes),
    [codes, inventory, products, locations, pairModes]
  );
  const destinationLocation = locations.find((location) => location.id === toLoc);
  const selectedResponsibleNames = useMemo(
    () =>
      Array.from(
        new Set(
          selectedSummaries.flatMap((summary) =>
            summary.pieces.map((piece) => piece.responsibleName?.trim()).filter(Boolean) as string[]
          )
        )
      ),
    [selectedSummaries]
  );
  const isReturnFlow = Boolean(
    destinationLocation && isStorageLocation(destinationLocation) && selectedResponsibleNames.length > 0
  );

  const movementRows = useMemo(
    () =>
      movements.map((movement) => ({
        movement,
        summaries: summarizeMovementUnitCodes(movement.unitCodes, inventory, products, locations),
      })),
    [movements, inventory, products, locations]
  );

  useEffect(() => {
    const prefill = (loc.state as { prefillUnit?: string } | null)?.prefillUnit;
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
        return;
      }

      setCodes([...codes, normalizedCode]);
      if (normalizedCode.startsWith("A")) {
        setPairModes((current) => ({
          ...current,
          [normalizedCode]: incomingMode,
        }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el codigo");
    }
  };

  const submit = () => {
    if (!user) return;
    if (codes.length === 0) return toast.error("Agrega al menos un codigo");
    try {
      const unitCodes = expandSelectionCodes(codes, inventory, pairModes);
      transfer(unitCodes, toLoc, user.id, user.name, operationalRoleFor(user, "almacen"));
      toast.success(isReturnFlow ? "Devolucion registrada" : "Traslado registrado");
      setCodes([]);
      setPairModes({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el traslado");
    }
  };

  return (
    <>
      <PageHeader
        title="Traslados"
        subtitle={
          isReturnFlow
            ? "Cuando vuelve a almacen, se registra como devolucion"
            : "Mueve pares completos o unidades entre ubicaciones"
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <QRScanner onResult={addCode} allowPairCodes />

          <div className="rounded-xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            Si ingresas A00001, A00001-D o A00001-I, veras el par y podras elegir ambos o solo un lado.
            {isReturnFlow && selectedResponsibleNames.length > 0
              ? ` Esta operacion quedara como devolucion de ${selectedResponsibleNames.join(", ")}.`
              : ""}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Items a trasladar
            </p>
            <InventoryCodeSummaryList
              items={selectedSummaries}
              emptyText="Escanea un par o una unidad para armar el traslado"
              onRemove={(rawCode) => {
                setCodes(codes.filter((code) => code !== rawCode));
                setPairModes((current) => {
                  const next = { ...current };
                  delete next[rawCode];
                  return next;
                });
              }}
              pairModes={pairModes}
              onChangePairMode={(key, mode) =>
                setPairModes((current) => ({ ...current, [key]: mode }))
              }
            />
          </div>

          <div>
            <Label>Ubicacion destino</Label>
            <Select value={toLoc} onValueChange={setToLoc}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name} ({LOCATION_TYPE_LABELS[location.type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isReturnFlow && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aviso: al volver a {destinationLocation?.name}, dejara de figurar a cargo del colaborador.
              </p>
            )}
          </div>

          <Button onClick={submit} className="h-12 w-full bg-foreground text-background hover:bg-foreground/90">
            {isReturnFlow ? "Registrar devolucion" : "Confirmar traslado"}
          </Button>
        </div>

        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Historial de traslados</div>
          {movementRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin movimientos</p>
          ) : (
            <ul className="divide-y max-h-[520px] overflow-y-auto">
              {movementRows.map(({ movement, summaries }) => (
                <li key={movement.id} className="px-4 py-3 space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-semibold">
                        {movement.type === "devolucion" ? "Devolucion" : "Traslado"}
                      </span>
                      <span className="text-muted-foreground">{fmtDateTime(movement.timestamp)}</span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Registrado por {movement.byUserName}
                      {movement.byUserRole ? ` (${ROLE_LABELS[movement.byUserRole]})` : ""}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-secondary/40 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Antes estaba en
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {locationLabelById(movement.fromLocationId)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-secondary/40 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {movement.type === "devolucion" ? "Volvio a" : "Se movio a"}
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {locationLabelById(movement.toLocationId)}
                        </p>
                      </div>
                    </div>

                    {movement.reason && (
                      <p className="text-xs text-muted-foreground">{movement.reason}</p>
                    )}
                  </div>

                  <InventoryCodeSummaryList items={summaries} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
