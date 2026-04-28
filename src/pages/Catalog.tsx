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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import type { PriceMode, ProductType, SizePriceRule } from "@/lib/types";
import { useCan } from "@/components/Can";
import { Plus, Pencil, Settings2, Trash2 } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { getProductPrices } from "@/lib/pricing";

const emptyRule = (mode: PriceMode): SizePriceRule => ({
  id: `sp-${Date.now()}`,
  label: mode === "talla_exacta" ? "Talla exacta" : "Rango de tallas",
  size: "",
  minSize: undefined,
  maxSize: undefined,
  basePrice: 0,
  wholesalePrice: 0,
});

export default function Catalog() {
  const canEdit = useCan("catalog.edit");
  const canEditPrices = useCan("catalog.prices.edit");
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
    priceMode: "base" as PriceMode,
    sizePrices: [] as SizePriceRule[],
    active: true,
  });

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
    setForm({ type: "zapato", brand: "", model: "", color: "", size: "", basePrice: 0, wholesalePrice: 0, priceMode: "base", sizePrices: [], active: true });
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setForm({ ...p, size: p.size || "", priceMode: p.priceMode || "base", sizePrices: p.sizePrices || [] });
    setOpen(true);
  };

  const updateRule = (id: string, patch: Partial<SizePriceRule>) => {
    setForm({ ...form, sizePrices: form.sizePrices.map((rule) => rule.id === id ? { ...rule, ...patch } : rule) });
  };

  const submit = () => {
    if (!canEdit) return toast.error("No tienes permiso para editar catálogo");
    if (!form.brand || !form.model) return toast.error("Marca y modelo son obligatorios");
    const priceMode = form.type === "zapato" ? form.priceMode : "base";
    const payload = {
      ...form,
      size: form.type === "zapato" ? form.size : undefined,
      priceMode,
      sizePrices: priceMode === "base" ? [] : form.sizePrices,
    };
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
        action={canEdit ? (
          <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="size-4 mr-1" /> Nuevo producto
          </Button>
        ) : null}
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

      <Tabs defaultValue="productos" className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="maestros">Maestros</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
        </TabsList>

        <TabsContent value="maestros">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["Marca", "Modelo", "Color"].map((label) => (
              <div key={label} className="rounded-2xl bg-card border border-border/60 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Maestro</p>
                <h3 className="font-display font-bold mt-1">{label}</h3>
                <p className="text-sm text-muted-foreground mt-2">Se administra desde producto para mantener consistencia operativa.</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="productos">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const stock = stockOf(p.id);
              const prices = getProductPrices(p);
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
                      <p className="font-display font-extrabold text-xl">{fmtMoney(prices.basePrice)}</p>
                      <p className="text-xs text-muted-foreground">Mayor: {fmtMoney(prices.wholesalePrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p className="font-display font-bold text-lg">{stock}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">Sin resultados</p>}
          </div>
        </TabsContent>

        <TabsContent value="precios">
          <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Settings2 className="size-4 text-accent" />
              <h3 className="font-display font-bold">Reglas de precios por talla</h3>
            </div>
            <ul className="divide-y divide-border/60">
              {filtered.filter((p) => p.type === "zapato").map((p) => {
                const prices = getProductPrices(p);
                return (
                  <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{p.brand} · {p.model} · T{p.size}</p>
                      <p className="text-xs text-muted-foreground">Modo: {p.priceMode === "talla_exacta" ? "talla exacta" : p.priceMode === "rango_tallas" ? "rango de tallas" : "precio base"}{prices.ruleLabel ? ` · ${prices.ruleLabel}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{fmtMoney(prices.basePrice)}</p>
                      <p className="text-xs text-muted-foreground">Mayor {fmtMoney(prices.wholesalePrice)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ProductType, priceMode: v === "zapato" ? form.priceMode : "base" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zapato">Zapato</SelectItem>
                    <SelectItem value="accesorio">Accesorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div><Label>Modelo</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div><Label>Color</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
              {form.type === "zapato" && <div><Label>Talla</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></div>}
              <div><Label>Estado</Label><Input value={form.active ? "Activo" : "Inactivo"} disabled /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Precio base</Label><Input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: +e.target.value })} /></div>
              <div><Label>Precio mayor</Label><Input type="number" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: +e.target.value })} /></div>
            </div>

            {canEditPrices && form.type === "zapato" && (
              <div className="rounded-xl border border-border p-3 space-y-3">
                <div>
                  <Label>Modo de precio</Label>
                  <Select value={form.priceMode} onValueChange={(v) => setForm({ ...form, priceMode: v as PriceMode, sizePrices: v === "base" ? [] : form.sizePrices })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Precio base único</SelectItem>
                      <SelectItem value="rango_tallas">Precio por rango de tallas</SelectItem>
                      <SelectItem value="talla_exacta">Precio por talla exacta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.priceMode !== "base" && (
                  <div className="space-y-2">
                    {form.sizePrices.map((rule) => (
                      <div key={rule.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 rounded-lg bg-secondary/40 p-2">
                        {form.priceMode === "talla_exacta" ? (
                          <Input placeholder="Talla" value={rule.size || ""} onChange={(e) => updateRule(rule.id, { size: e.target.value, label: `Talla ${e.target.value}` })} />
                        ) : (
                          <>
                            <Input type="number" placeholder="Desde" value={rule.minSize ?? ""} onChange={(e) => updateRule(rule.id, { minSize: +e.target.value, label: `Tallas ${e.target.value}-${rule.maxSize ?? ""}` })} />
                            <Input type="number" placeholder="Hasta" value={rule.maxSize ?? ""} onChange={(e) => updateRule(rule.id, { maxSize: +e.target.value, label: `Tallas ${rule.minSize ?? ""}-${e.target.value}` })} />
                          </>
                        )}
                        <Input type="number" placeholder="Precio" value={rule.basePrice} onChange={(e) => updateRule(rule.id, { basePrice: +e.target.value })} />
                        <Input type="number" placeholder="Mayor" value={rule.wholesalePrice} onChange={(e) => updateRule(rule.id, { wholesalePrice: +e.target.value })} />
                        <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, sizePrices: form.sizePrices.filter((r) => r.id !== rule.id) })}><Trash2 className="size-4" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => setForm({ ...form, sizePrices: [...form.sizePrices, emptyRule(form.priceMode)] })}>
                      <Plus className="size-4 mr-1" /> Agregar regla
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">
              {editingId ? "Guardar" : "Crear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
