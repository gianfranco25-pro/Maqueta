import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore, useCurrentUser } from "@/lib/store";
import type { ProductType } from "@/lib/types";
import { Plus, Pencil, Settings2 } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Catalog() {
  const user = useCurrentUser();
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | ProductType>("todos");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "zapato" as ProductType,
    brand: "",
    model: "",
    color: "",
    size: "",
    basePrice: 0,
    wholesalePrice: 0,
    active: true,
  });

  const canEdit = user?.role === "admin";

  const filtered = products.filter((p) => {
    if (typeFilter !== "todos" && p.type !== typeFilter) return false;
    if (!search) return true;
    const t = `${p.brand} ${p.model} ${p.color}`.toLowerCase();
    return t.includes(search.toLowerCase());
  });

  const stockOf = (productId: string) => {
    const items = inventory.filter((i) => i.productId === productId && i.status === "disponible");
    const product = products.find((p) => p.id === productId);
    if (product?.type === "zapato") {
      // pares completos = mín(D,I) por par
      const byPair: Record<string, { d: boolean; i: boolean }> = {};
      items.forEach((it) => {
        if (!it.pairCode) return;
        byPair[it.pairCode] ||= { d: false, i: false };
        if (it.side === "D") byPair[it.pairCode].d = true;
        if (it.side === "I") byPair[it.pairCode].i = true;
      });
      return Object.values(byPair).filter((p) => p.d && p.i).length;
    }
    return items.length;
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ type: "zapato", brand: "", model: "", color: "", size: "", basePrice: 0, wholesalePrice: 0, active: true });
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setForm({ ...p, size: p.size || "" } as any);
    setOpen(true);
  };

  const submit = () => {
    if (!form.brand || !form.model) {
      toast.error("Marca y modelo son obligatorios");
      return;
    }
    const payload = { ...form, size: form.type === "zapato" ? form.size : undefined };
    if (editingId) {
      updateProduct(editingId, payload);
      toast.success("Producto actualizado");
    } else {
      addProduct(payload);
      toast.success("Producto creado");
    }
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Catálogo"
        subtitle={`${products.length} productos`}
        action={
          <div className="flex gap-2">
            {canEdit && (
              <>
                <Link to="/configuracion">
                  <Button variant="outline"><Settings2 className="size-4 mr-1" /> Precios</Button>
                </Link>
                <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90">
                  <Plus className="size-4 mr-1" /> Nuevo
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        <Input placeholder="Buscar por marca, modelo o color" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="zapato">Zapatos</SelectItem>
            <SelectItem value="accesorio">Accesorios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((p) => {
          const stock = stockOf(p.id);
          return (
            <div key={p.id} className="rounded-2xl bg-card border border-border/60 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-accent font-bold">{p.type}</p>
                  <p className="font-display font-bold text-base truncate">{p.brand}</p>
                  <p className="text-sm truncate">{p.model}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.color}{p.size ? ` · Talla ${p.size}` : ""}
                  </p>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p.id)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="font-display font-extrabold text-xl">{fmtMoney(p.basePrice)}</p>
                  <p className="text-xs text-muted-foreground">Mayor: {fmtMoney(p.wholesalePrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className="font-display font-bold text-lg">{stock}</p>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-10">Sin resultados</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ProductType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zapato">Zapato</SelectItem>
                  <SelectItem value="accesorio">Accesorio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Color</Label>
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              {form.type === "zapato" && (
                <div>
                  <Label>Talla</Label>
                  <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Precio base</Label>
                <Input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: +e.target.value })} />
              </div>
              <div>
                <Label>Precio mayor</Label>
                <Input type="number" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: +e.target.value })} />
              </div>
            </div>
            <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">
              {editingId ? "Guardar" : "Crear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
