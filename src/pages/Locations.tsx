import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAppStore } from "@/lib/store";
import {
  isLocationActive,
  isOperationalLocation,
  isStorageLocation,
  LOCATION_TYPE_LABELS,
  type LocationType,
} from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Building2, MapPin, Plus, Power, Store } from "lucide-react";
import { toast } from "sonner";

const LOCATION_TYPES: LocationType[] = ["tienda", "deposito", "almacen", "otro"];

type LocationForm = {
  name: string;
  type: LocationType;
  code: string;
  address: string;
  notes: string;
  active: boolean;
};

const emptyForm: LocationForm = {
  name: "",
  type: "tienda",
  code: "",
  address: "",
  notes: "",
  active: true,
};

export default function Locations() {
  const locations = useAppStore((s) => s.locations);
  const inventory = useAppStore((s) => s.inventory);
  const users = useAppStore((s) => s.users);
  const addLocation = useAppStore((s) => s.addLocation);
  const updateLocation = useAppStore((s) => s.updateLocation);
  const toggleLocationActive = useAppStore((s) => s.toggleLocationActive);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);

  const stats = useMemo(() => {
    const active = locations.filter(isLocationActive).length;
    const operational = locations.filter((location) => isLocationActive(location) && isOperationalLocation(location)).length;
    const storage = locations.filter((location) => isLocationActive(location) && isStorageLocation(location)).length;
    return { active, operational, storage };
  }, [locations]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const location = locations.find((item) => item.id === id);
    if (!location) return;
    setEditingId(id);
    setForm({
      name: location.name,
      type: location.type,
      code: location.code || "",
      address: location.address || "",
      notes: location.notes || "",
      active: isLocationActive(location),
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("Nombre requerido");

    const payload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      updateLocation(editingId, payload);
      toast.success("Ubicacion actualizada");
    } else {
      addLocation(payload);
      toast.success("Ubicacion creada");
    }
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        subtitle="Tiendas, depositos, almacenes y otras ubicaciones operativas"
        action={
          <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="size-4 mr-1" /> Nueva
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Activas" value={stats.active} icon={MapPin} />
        <StatCard label="Venta" value={stats.operational} icon={Store} tone="gold" />
        <StatCard label="Deposito/almacen" value={stats.storage} icon={Building2} />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {locations.map((location) => {
          const stockCount = inventory.filter((item) => item.locationId === location.id).length;
          const assignedUsers = users.filter((user) => user.locationId === location.id && user.active).length;
          return (
            <div key={location.id} className="rounded-2xl bg-card border border-border/60 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold truncate">{location.name}</p>
                  <p className="text-xs uppercase tracking-wider text-accent font-bold mt-0.5">
                    {LOCATION_TYPE_LABELS[location.type]}
                    {location.code ? ` - ${location.code}` : ""}
                  </p>
                </div>
                <StatusBadge kind={isLocationActive(location) ? "success" : "muted"}>
                  {isLocationActive(location) ? "Activa" : "Inactiva"}
                </StatusBadge>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {location.address && <p>{location.address}</p>}
                {location.notes && <p>{location.notes}</p>}
                <p>{stockCount} unidades en stock</p>
                <p>{assignedUsers} usuarios asignados</p>
                {location.createdAt && <p>Creada {fmtDate(location.createdAt)}</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(location.id)} className="flex-1">
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleLocationActive(location.id)}>
                  <Power className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar ubicacion" : "Nueva ubicacion"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as LocationType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{LOCATION_TYPE_LABELS[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Codigo</Label>
                <Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
              </div>
            </div>
            <div>
              <Label>Direccion</Label>
              <Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <Checkbox checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked === true })} />
              <span>Activa</span>
            </label>
            <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">
              {editingId ? "Guardar cambios" : "Crear ubicacion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
