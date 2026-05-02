import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/AppShell";
import { InventoryCodeSummaryList } from "@/components/InventoryCodeSummaryList";
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
import { isLocationActive, LOCATION_TYPE_LABELS, operationalRoleFor, ROLE_LABELS } from "@/lib/types";

export default function InventoryDeliveries() {
  const loc = useLocation();
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const locations = useAppStore((s) => s.locations);
  const users = useAppStore((s) => s.users);
  const movements = useAppStore((s) => s.movements).filter((movement) => movement.type === "entrega");
  const deliver = useAppStore((s) => s.deliverFromWarehouse);
  const user = useCurrentUser();
  const activeLocations = locations.filter(isLocationActive);
  const activeUsers = useMemo(
    () => users.filter((entry) => entry.active).sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );
  const locationLabelById = (locationId?: string) =>
    locations.find((location) => location.id === locationId)?.name || "Sin ubicacion";

  const [codes, setCodes] = useState<string[]>([]);
  const [receiverId, setReceiverId] = useState("");
  const [otherReceiverName, setOtherReceiverName] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [pairModes, setPairModes] = useState<Record<string, PairSelectionMode>>({});

  const selectedReceiver = activeUsers.find((entry) => entry.id === receiverId);
  const selectedReceiverLocation = selectedReceiver
    ? locations.find((location) => location.id === selectedReceiver.locationId)
    : undefined;
  const isOtherReceiver = receiverId === "__other__";

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
    const receiverName = isOtherReceiver ? otherReceiverName.trim() : selectedReceiver?.name || "";
    if (codes.length === 0) return toast.error("Indica los codigos");
    if (!receiverId) return toast.error("Selecciona quien recibe");
    if (!receiverName) return toast.error("Indica quien recibe");
    if (isOtherReceiver && !toLocationId) return toast.error("Selecciona ubicacion destino para Otros");
    try {
      const unitCodes = expandSelectionCodes(codes, inventory, pairModes);
      deliver(
        unitCodes,
        user.id,
        user.name,
        operationalRoleFor(user, "almacen"),
        receiverName,
        isOtherReceiver ? toLocationId || undefined : undefined
      );
      toast.success("Entrega registrada");
      setCodes([]);
      setReceiverId("");
      setOtherReceiverName("");
      setToLocationId("");
      setPairModes({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la entrega");
    }
  };

  return (
    <>
      <PageHeader
        title="Entregas desde almacen"
        subtitle="Entrega pares completos o unidades con responsable y destino"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <QRScanner onResult={addCode} allowPairCodes />

          <div className="rounded-xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            Si ingresas A00001, A00001-D o A00001-I, veras el par y podras entregar ambos o solo un lado.
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Items a entregar
            </p>
            <InventoryCodeSummaryList
              items={selectedSummaries}
              emptyText="Escanea un par o una unidad para preparar la entrega"
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
            <Label>Quien recibe</Label>
            <Select value={receiverId} onValueChange={setReceiverId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona usuario u Otros" />
              </SelectTrigger>
              <SelectContent>
                {activeUsers.map((entry) => {
                  const location = locations.find((item) => item.id === entry.locationId);
                  return (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name} ({ROLE_LABELS[entry.role]})
                      {location ? ` - ${location.name}` : ""}
                    </SelectItem>
                  );
                })}
                <SelectItem value="__other__">Otros</SelectItem>
              </SelectContent>
            </Select>
            {selectedReceiver && (
              <p className="mt-1 text-xs text-muted-foreground">
                Destino automatico: {selectedReceiverLocation?.name || "Ubicacion asignada"}
              </p>
            )}
          </div>

          {isOtherReceiver && (
            <div>
              <Label>Nombre de quien recibe</Label>
              <Input
                placeholder="Nombre exacto"
                value={otherReceiverName}
                onChange={(e) => setOtherReceiverName(e.target.value)}
              />
            </div>
          )}

          {isOtherReceiver && (
            <div>
              <Label>Ubicacion destino</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona ubicacion" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({LOCATION_TYPE_LABELS[location.type]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Usa esta opcion cuando quien recibe no esta creado como usuario del sistema.
              </p>
            </div>
          )}

          <Button onClick={submit} className="h-12 w-full bg-foreground text-background hover:bg-foreground/90">
            Registrar entrega
          </Button>
        </div>

        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b font-display font-bold">Historial de entregas</div>
          {movementRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin entregas</p>
          ) : (
            <ul className="divide-y max-h-[520px] overflow-y-auto">
              {movementRows.map(({ movement, summaries }) => (
                <li key={movement.id} className="px-4 py-3 space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-semibold">Entrega</span>
                      <span className="text-muted-foreground">{fmtDateTime(movement.timestamp)}</span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Registrado por {movement.byUserName}
                      {movement.byUserRole ? ` (${ROLE_LABELS[movement.byUserRole]})` : ""}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-secondary/40 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Se entrego a
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {movement.receivedBy || "Sin receptor"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-secondary/40 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Quedo ubicado en
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {locationLabelById(movement.toLocationId)}
                        </p>
                      </div>
                    </div>
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
