import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatUserRoles,
  getUserRoles,
  isLocationActive,
  LOCATION_TYPE_LABELS,
  normalizeUserRoles,
  PAYMENT_WEEKDAY_LABELS,
  ROLE_LABELS,
  SECONDARY_ROLE_COMBINATIONS,
  type PaymentWeekday,
  type Role,
} from "@/lib/types";
import { Plus, Power, MapPin, Phone, IdCard, Wallet, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMoney } from "@/lib/format";

const ROLES: Role[] = ["admin", "vendedor", "cajero", "almacen"];
const PAYMENT_DAYS = Object.entries(PAYMENT_WEEKDAY_LABELS) as [string, string][];

const rolesForPrimary = (role: Role, currentRoles: Role[] = [role]): Role[] =>
  normalizeUserRoles({ role, roles: currentRoles });

export default function Users() {
  const user = useCurrentUser();
  const users = useAppStore((s) => s.users);
  const locations = useAppStore((s) => s.locations);
  const activeLocations = locations.filter(isLocationActive);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const toggleActive = useAppStore((s) => s.toggleUserActive);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    dni: "",
    phone: "",
    role: "vendedor" as Role,
    roles: ["vendedor"] as Role[],
    locationId: activeLocations[0]?.id || "",
    commissionPerPair: 0,
    paymentWeekday: 5 as PaymentWeekday,
    active: true,
  });

  const isAdmin = getUserRoles(user).includes("admin");
  const isCollaboratorForm = form.roles.includes("vendedor") || form.role === "vendedor";

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Usuarios" />
        <div className="rounded-2xl bg-card border p-8 text-center text-muted-foreground">
          Solo el Administrador general puede gestionar usuarios.
        </div>
      </>
    );
  }

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: "",
      dni: "",
      phone: "",
      role: "vendedor",
      roles: rolesForPrimary("vendedor"),
      locationId: activeLocations[0]?.id || "",
      commissionPerPair: 0,
      paymentWeekday: 5,
      active: true,
    });
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    const roles = normalizeUserRoles(u);
    setEditingId(id);
    setForm({
      name: u.name,
      dni: u.dni || "",
      phone: u.phone || "",
      role: roles[0],
      roles,
      locationId: u.locationId,
      commissionPerPair: u.commissionPerPair ?? 0,
      paymentWeekday: (u.paymentWeekday ?? 5) as PaymentWeekday,
      active: u.active,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("Nombre requerido");
    if (!form.locationId) return toast.error("Selecciona una ubicacion");
    if (isCollaboratorForm && form.commissionPerPair < 0) return toast.error("La comision no puede ser negativa");

    const roles = normalizeUserRoles({ role: form.role, roles: form.roles });
    const payload = {
      ...form,
      role: roles[0],
      roles,
      commissionPerPair: roles.includes("vendedor") ? form.commissionPerPair : undefined,
      paymentWeekday: roles.includes("vendedor") ? form.paymentWeekday : undefined,
    };

    if (editingId) {
      updateUser(editingId, payload);
      toast.success("Usuario actualizado");
    } else {
      addUser(payload);
      toast.success("Usuario creado");
    }
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle={`${users.length} registrados · ${users.filter((u) => u.active).length} activos`}
        action={
          <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="size-4 mr-1" /> Nuevo
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {users.map((u) => {
          const loc = locations.find((l) => l.id === u.locationId);
          const roles = getUserRoles(u);
          const isCollaborator = roles.includes("vendedor");
          return (
            <div key={u.id} className="rounded-2xl bg-card border border-border/60 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-xl bg-foreground text-background grid place-items-center font-bold">
                  {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">{u.name}</p>
                    {u.active ? <StatusBadge kind="success">Activo</StatusBadge> : <StatusBadge kind="muted">Inactivo</StatusBadge>}
                  </div>
                  <p className="text-xs uppercase tracking-wider text-accent font-bold mt-0.5">{formatUserRoles(u)}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5"><MapPin className="size-3" />{loc?.name}</p>
                    {u.dni && <p className="flex items-center gap-1.5"><IdCard className="size-3" />DNI {u.dni}</p>}
                    {u.phone && <p className="flex items-center gap-1.5"><Phone className="size-3" />{u.phone}</p>}
                    {isCollaborator && (
                      <>
                        <p className="flex items-center gap-1.5"><Wallet className="size-3" />Comision {fmtMoney(u.commissionPerPair ?? 0)} por par</p>
                        <p className="flex items-center gap-1.5"><CalendarDays className="size-3" />Pago semanal: {u.paymentWeekday ? PAYMENT_WEEKDAY_LABELS[u.paymentWeekday] : "No definido"}</p>
                      </>
                    )}
                    <p className="text-[10px]">Desde {fmtDate(u.createdAt)}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(u.id)} className="flex-1">Editar</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(u.id)}>
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
            <DialogTitle>{editingId ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre completo</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>DNI</Label>
                <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
              </div>
              <div>
                <Label>Celular</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Rol principal</Label>
              <Select
                value={form.role}
                onValueChange={(v) => {
                  const role = v as Role;
                  const nextRoles = rolesForPrimary(role, form.roles);
                  setForm({
                    ...form,
                    role,
                    roles: nextRoles,
                    commissionPerPair: nextRoles.includes("vendedor") ? form.commissionPerPair : 0,
                  });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rol secundario</Label>
              {SECONDARY_ROLE_COMBINATIONS[form.role]?.includes("almacen") ? (
                <label className="mt-1 flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <Checkbox
                    checked={form.roles.includes("almacen")}
                    onCheckedChange={(checked) => setForm({
                      ...form,
                      roles: rolesForPrimary(
                        form.role,
                        checked ? [...form.roles, "almacen"] : form.roles.filter((role) => role !== "almacen")
                      ),
                    })}
                  />
                  <span>Almacen</span>
                </label>
              ) : (
                <div className="mt-1 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                  No aplica
                </div>
              )}
            </div>
            <div>
              <Label>Ubicacion</Label>
              <Select value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeLocations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({LOCATION_TYPE_LABELS[l.type]})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isCollaboratorForm && (
              <>
                <div>
                  <Label>Comision por par (S/)</Label>
                  <Input type="number" value={form.commissionPerPair} onChange={(e) => setForm({ ...form, commissionPerPair: +e.target.value })} />
                </div>
                <div>
                  <Label>Dia de pago semanal</Label>
                  <Select value={String(form.paymentWeekday)} onValueChange={(value) => setForm({ ...form, paymentWeekday: Number(value) as PaymentWeekday })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_DAYS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">
              {editingId ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
