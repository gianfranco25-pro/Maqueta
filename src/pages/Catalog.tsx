import { useMemo, useState } from "react";
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
import type { CatalogMasterKind, CatalogMasters, PriceMode, Product, ProductType, SizePriceRule } from "@/lib/types";
import { useCan } from "@/components/Can";
import { Plus, Pencil, Settings2, Trash2, Power } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { getProductPrices } from "@/lib/pricing";

const emptyRule = (
  mode: PriceMode,
  defaults: { size?: string; basePrice?: number; wholesalePrice?: number } = {}
): SizePriceRule => ({
  id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: mode === "talla_exacta"
    ? `Talla ${defaults.size || ""}`.trim()
    : "Rango de tallas",
  size: mode === "talla_exacta" ? defaults.size || "" : "",
  minSize: undefined,
  maxSize: undefined,
  basePrice: defaults.basePrice ?? 0,
  wholesalePrice: defaults.wholesalePrice ?? 0,
});

const isPositiveNumber = (value: number) => Number.isFinite(value) && value > 0;
const isValidMoney = (value: number) => Number.isFinite(value) && value >= 0;
const toMoneyNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const toOptionalNumber = (value: string) => value.trim() === "" ? undefined : toMoneyNumber(value);

const rangesOverlap = (a: SizePriceRule, b: SizePriceRule) => {
  const aMin = a.minSize ?? 0;
  const aMax = a.maxSize ?? 0;
  const bMin = b.minSize ?? 0;
  const bMax = b.maxSize ?? 0;
  return aMin <= bMax && bMin <= aMax;
};

const MASTER_LABELS: Record<CatalogMasterKind, string> = {
  brands: "Marcas",
  models: "Modelos",
  colors: "Colores",
  sizes: "Tallas",
};

const MASTER_SINGULAR: Record<CatalogMasterKind, string> = {
  brands: "Marca",
  models: "Modelo",
  colors: "Color",
  sizes: "Talla",
};

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  zapato: "Calzado",
  accesorio: "Accesorio",
};

const PRICE_MODE_LABELS: Record<PriceMode, string> = {
  base: "Precio base unico",
  talla_exacta: "Precio por talla exacta",
  rango_tallas: "Precio por rango",
};

const uniqueSorted = (values: (string | undefined)[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const mergeNames = (...lists: string[][]) => uniqueSorted(lists.flat());

const activeNames = (items: { name: string; active: boolean }[]) =>
  uniqueSorted(items.filter((item) => item.active).map((item) => item.name));

export default function Catalog() {
  const canEdit = useCan("catalog.edit");
  const canEditPrices = useCan("catalog.prices.edit");
  const catalogMasters = useAppStore((s) => s.catalogMasters);
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const settings = useAppStore((s) => s.settings);
  const addCatalogMaster = useAppStore((s) => s.addCatalogMaster);
  const updateCatalogMaster = useAppStore((s) => s.updateCatalogMaster);
  const toggleCatalogMasterActive = useAppStore((s) => s.toggleCatalogMasterActive);
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
    cost: 0,
    basePrice: 0,
    wholesalePrice: 0,
    maxDiscountSoles: 0,
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
  const utilityPreview = form.basePrice - form.cost;

  const productMasters = useMemo(() => ({
    brands: uniqueSorted(products.map((p) => p.brand)),
    models: uniqueSorted(products.map((p) => p.model)),
    colors: uniqueSorted(products.map((p) => p.color)),
    sizes: uniqueSorted(products.map((p) => p.size)),
  }), [products]);

  const masterOptions = useMemo(() => ({
    brands: mergeNames(activeNames(catalogMasters.brands), productMasters.brands),
    colors: mergeNames(activeNames(catalogMasters.colors), productMasters.colors),
    sizes: mergeNames(activeNames(catalogMasters.sizes), productMasters.sizes),
  }), [catalogMasters.brands, catalogMasters.colors, catalogMasters.sizes, productMasters]);

  const modelOptions = useMemo(() => {
    const selectedBrand = catalogMasters.brands.find((brand) => brand.name === form.brand);
    const structuredModels = catalogMasters.models
      .filter((model) => model.active && (!selectedBrand || model.brandId === selectedBrand.id))
      .map((model) => model.name);
    const legacyModels = products
      .filter((product) => !form.brand || product.brand === form.brand)
      .map((product) => product.model);
    return mergeNames(structuredModels, uniqueSorted(legacyModels));
  }, [catalogMasters.brands, catalogMasters.models, form.brand, products]);

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
    setForm({ type: "zapato", brand: "", model: "", color: "", size: "", cost: 0, basePrice: 0, wholesalePrice: 0, maxDiscountSoles: settings.maxDiscountSoles, priceMode: "base", sizePrices: [], active: true });
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setForm({ ...p, size: p.size || "", cost: p.cost ?? 0, maxDiscountSoles: p.maxDiscountSoles ?? settings.maxDiscountSoles, priceMode: p.priceMode || "base", sizePrices: p.sizePrices || [] });
    setOpen(true);
  };

  const updateRule = (id: string, patch: Partial<SizePriceRule>) => {
    setForm({ ...form, sizePrices: form.sizePrices.map((rule) => rule.id === id ? { ...rule, ...patch } : rule) });
  };

  const validateForm = () => {
    if (!form.brand.trim() || !form.model.trim()) return "Marca y modelo son obligatorios";
    if (!form.color.trim()) return "Color es obligatorio";
    if (form.type === "zapato" && !form.size.trim()) return "Talla es obligatoria";
    if (!masterOptions.brands.includes(form.brand)) return "La marca debe estar registrada en maestros";
    if (!modelOptions.includes(form.model)) return "El modelo debe estar registrado para la marca seleccionada";
    if (!masterOptions.colors.includes(form.color)) return "El color debe estar registrado en maestros";
    if (form.type === "zapato" && !masterOptions.sizes.includes(form.size)) return "La talla debe estar registrada en maestros";
    if (!isValidMoney(form.cost)) return "Costo no puede ser negativo";
    if (!isPositiveNumber(form.basePrice)) return "Precio base debe ser mayor a 0";
    if (!isValidMoney(form.wholesalePrice)) return "Precio por mayor no puede ser negativo";
    if (form.wholesalePrice > form.basePrice) return "Precio por mayor no puede superar el precio base";
    if (!isValidMoney(form.maxDiscountSoles)) return "Descuento maximo no puede ser negativo";

    const priceMode = form.type === "zapato" ? form.priceMode : "base";
    if (priceMode === "base") {
      if (form.maxDiscountSoles > form.basePrice) return "Descuento maximo no puede superar el precio base";
      return null;
    }
    if (!canEditPrices) return "No tienes permiso para editar precios por talla";
    if (form.sizePrices.length === 0) return "Agrega al menos una regla de precio";

    for (const rule of form.sizePrices) {
      if (!isPositiveNumber(rule.basePrice)) return "Cada regla debe tener precio base positivo";
      if (!isValidMoney(rule.wholesalePrice)) return "El precio por mayor de cada regla no puede ser negativo";
      if (rule.wholesalePrice > rule.basePrice) return "El precio por mayor de una regla no puede superar su precio base";
      if (form.maxDiscountSoles > rule.basePrice) return "Descuento maximo no puede superar el menor precio base configurado";
    }

    if (priceMode === "talla_exacta") {
      const sizes = form.sizePrices.map((rule) => String(rule.size || "").trim()).filter(Boolean);
      if (sizes.length !== form.sizePrices.length) return "Cada regla debe tener una talla";
      if (new Set(sizes).size !== sizes.length) return "Hay tallas repetidas en las reglas";
    }

    if (priceMode === "rango_tallas") {
      for (const rule of form.sizePrices) {
        if (!Number.isFinite(rule.minSize) || !Number.isFinite(rule.maxSize)) return "Cada regla debe tener talla desde y hasta";
        if ((rule.minSize ?? 0) > (rule.maxSize ?? 0)) return "La talla desde no puede ser mayor que la talla hasta";
      }
      for (let i = 0; i < form.sizePrices.length; i++) {
        for (let j = i + 1; j < form.sizePrices.length; j++) {
          if (rangesOverlap(form.sizePrices[i], form.sizePrices[j])) return "Hay rangos de talla cruzados";
        }
      }
    }

    return null;
  };

  const submit = () => {
    if (!canEdit) return toast.error("No tienes permiso para editar catálogo");
    const validationError = validateForm();
    if (validationError) return toast.error(validationError);
    const priceMode = form.type === "zapato" ? form.priceMode : "base";
    const payload = {
      ...form,
      size: form.type === "zapato" ? form.size : undefined,
      priceMode,
      sizePrices: priceMode === "base" ? [] : form.sizePrices.map((rule) => ({
        ...rule,
        label: priceMode === "talla_exacta"
          ? `Talla ${String(rule.size || "").trim()}`
          : `Tallas ${rule.minSize}-${rule.maxSize}`,
      })),
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
          <CatalogMastersPanel
            canEdit={canEdit}
            masters={catalogMasters}
            products={products}
            addMaster={addCatalogMaster}
            updateMaster={updateCatalogMaster}
            toggleMaster={toggleCatalogMasterActive}
          />
        </TabsContent>

        <TabsContent value="productos">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const stock = stockOf(p.id);
              const prices = getProductPrices(p);
              const discountLimit = p.maxDiscountSoles ?? settings.maxDiscountSoles;
              const minimumAllowedPrice = Math.max(0, prices.basePrice - discountLimit);
              const utility = prices.basePrice - prices.cost;
              return (
                <div key={p.id} className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-border/60">
                    <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent font-bold">
                          {PRODUCT_TYPE_LABELS[p.type]}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {p.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="font-display font-bold text-lg truncate mt-2">{p.brand}</p>
                      <p className="text-sm font-medium truncate">{p.model}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.color}{p.size ? ` · Talla ${p.size}` : ""}
                      </p>
                    </div>
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p.id)} aria-label="Editar producto">
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Precio base aplicado</p>
                        <p className="font-display font-extrabold text-2xl mt-1">{fmtMoney(prices.basePrice)}</p>
                        <p className="text-xs text-muted-foreground">
                          {PRICE_MODE_LABELS[p.priceMode || "base"]}{prices.ruleLabel ? ` · ${prices.ruleLabel}` : ""}
                        </p>
                      </div>
                      <div className="rounded-xl bg-secondary px-3 py-2 text-center min-w-20">
                        <p className="text-xs text-muted-foreground">Disponible</p>
                        <p className="font-display font-bold text-xl">{stock}</p>
                      </div>
                    </div>

                    {canEditPrices && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-border bg-background/50 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Precio por mayor</p>
                            <p className="font-display font-bold mt-1">{fmtMoney(prices.wholesalePrice)}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Lista separada</p>
                          </div>
                          <div className="rounded-xl border border-border bg-background/50 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Descuento max.</p>
                            <p className="font-display font-bold mt-1">{fmtMoney(discountLimit)}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Min. {fmtMoney(minimumAllowedPrice)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-border bg-background/50 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Costo</p>
                            <p className="font-display font-bold mt-1">{fmtMoney(prices.cost)}</p>
                          </div>
                          <div className="rounded-xl border border-border bg-background/50 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Utilidad base</p>
                            <p className={`font-display font-bold mt-1 ${utility < 0 ? "text-critical" : ""}`}>{fmtMoney(utility)}</p>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="hidden">
                      <p className="font-display font-extrabold text-xl">{fmtMoney(prices.basePrice)}</p>
                      <p className="text-xs text-muted-foreground">Precio por mayor: {fmtMoney(prices.wholesalePrice)}</p>
                      <p className="text-xs text-muted-foreground">Descuento max: {fmtMoney(p.maxDiscountSoles ?? settings.maxDiscountSoles)}</p>
                      <p className="text-xs text-muted-foreground">Costo: {fmtMoney(prices.cost)} · Utilidad base: {fmtMoney(prices.basePrice - prices.cost)}</p>
                    </div>
                    <div className="hidden">
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
                      <p className="text-xs text-muted-foreground">Modo por {p.priceMode === "talla_exacta" ? "talla exacta" : p.priceMode === "rango_tallas" ? "rango" : "precio base"}</p>
                      <p className="text-xs text-muted-foreground">Precio por mayor {fmtMoney(prices.wholesalePrice)}</p>
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
              <div>
                <Label>Marca</Label>
                <Select value={form.brand} onValueChange={(value) => setForm({ ...form, brand: value, model: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona marca" /></SelectTrigger>
                  <SelectContent>
                    {masterOptions.brands.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modelo</Label>
                <Select value={form.model} onValueChange={(value) => setForm({ ...form, model: value })} disabled={!form.brand}>
                  <SelectTrigger><SelectValue placeholder={form.brand ? "Selecciona modelo" : "Primero marca"} /></SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <Label>Color</Label>
                <Select value={form.color} onValueChange={(value) => setForm({ ...form, color: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona color" /></SelectTrigger>
                  <SelectContent>
                    {masterOptions.colors.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.type === "zapato" && (
                <div>
                  <Label>Talla</Label>
                  <Select value={form.size} onValueChange={(value) => setForm({ ...form, size: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona talla" /></SelectTrigger>
                    <SelectContent>
                      {masterOptions.sizes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Estado</Label><Input value={form.active ? "Activo" : "Inactivo"} disabled /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label>Costo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: toMoneyNumber(e.target.value) })}
                />
              </div>
              <div>
                <Label>Precio base</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: toMoneyNumber(e.target.value) })}
                />
              </div>
              <div>
                <Label>Precio por mayor</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.wholesalePrice}
                  onChange={(e) => setForm({ ...form, wholesalePrice: toMoneyNumber(e.target.value) })}
                />
              </div>
              <div>
                <Label>Descuento maximo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maxDiscountSoles}
                  onChange={(e) => setForm({ ...form, maxDiscountSoles: toMoneyNumber(e.target.value) })}
                />
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p>El precio por mayor es una lista de precio separada. El descuento permitido siempre parte del precio base.</p>
              <p>Precio minimo con descuento permitido: {fmtMoney(Math.max(0, form.basePrice - form.maxDiscountSoles))}</p>
              <p className={utilityPreview < 0 ? "text-critical font-semibold" : "text-foreground font-semibold"}>
                Utilidad base estimada: {fmtMoney(utilityPreview)}
              </p>
            </div>

            {canEditPrices && form.type === "zapato" && (
              <div className="rounded-xl border border-border p-3 space-y-3">
                <div>
                  <Label>Modo de precio</Label>
                  <Select value={form.priceMode} onValueChange={(v) => {
                    const priceMode = v as PriceMode;
                    const reuseRules = priceMode === form.priceMode && form.sizePrices.length > 0;
                    setForm({
                      ...form,
                      priceMode,
                      sizePrices: priceMode === "base"
                        ? []
                        : reuseRules
                          ? form.sizePrices
                          : [emptyRule(priceMode, form)],
                    });
                  }}>
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
                      <div key={rule.id} className="rounded-lg bg-secondary/40 p-3 space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {form.priceMode === "talla_exacta" ? (
                          <div>
                            <Label className="text-[10px] uppercase">Talla exacta</Label>
                            <Select value={rule.size || ""} onValueChange={(value) => updateRule(rule.id, { size: value, label: `Talla ${value}` })}>
                              <SelectTrigger><SelectValue placeholder="Talla" /></SelectTrigger>
                              <SelectContent>
                                {masterOptions.sizes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <>
                            <div>
                              <Label className="text-[10px] uppercase">Talla desde</Label>
                              <Input type="number" placeholder="Desde" value={rule.minSize ?? ""} onChange={(e) => updateRule(rule.id, { minSize: toOptionalNumber(e.target.value), label: `Tallas ${e.target.value}-${rule.maxSize ?? ""}` })} />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase">Talla hasta</Label>
                              <Input type="number" placeholder="Hasta" value={rule.maxSize ?? ""} onChange={(e) => updateRule(rule.id, { maxSize: toOptionalNumber(e.target.value), label: `Tallas ${rule.minSize ?? ""}-${e.target.value}` })} />
                            </div>
                          </>
                        )}
                          <div>
                            <Label className="text-[10px] uppercase">Precio base regla</Label>
                            <Input type="number" min="0" step="0.01" placeholder="Base" value={rule.basePrice} onChange={(e) => updateRule(rule.id, { basePrice: toMoneyNumber(e.target.value) })} />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase">Precio por mayor regla</Label>
                            <Input type="number" min="0" step="0.01" placeholder="Por mayor" value={rule.wholesalePrice} onChange={(e) => updateRule(rule.id, { wholesalePrice: toMoneyNumber(e.target.value) })} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>Utilidad con precio base de regla: {fmtMoney(rule.basePrice - form.cost)}</span>
                          <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, sizePrices: form.sizePrices.filter((r) => r.id !== rule.id) })}><Trash2 className="size-4" /></Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => setForm({ ...form, sizePrices: [...form.sizePrices, emptyRule(form.priceMode, form)] })}>
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

function CatalogMastersPanel({
  canEdit,
  masters,
  products,
  addMaster,
  toggleMaster,
}: {
  canEdit: boolean;
  masters: CatalogMasters;
  products: Product[];
  addMaster: (kind: CatalogMasterKind, payload: { name: string; brandId?: string }) => void;
  updateMaster: (kind: CatalogMasterKind, id: string, patch: { name?: string; brandId?: string }) => void;
  toggleMaster: (kind: CatalogMasterKind, id: string) => void;
}) {
  const [kind, setKind] = useState<CatalogMasterKind>("brands");
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState(masters.brands.find((brand) => brand.active)?.id || "");
  const activeBrands = masters.brands.filter((brand) => brand.active);

  const countProducts = (kind: CatalogMasterKind, item: { name: string; brandId?: string }) => {
    if (kind === "brands") return products.filter((product) => product.brand === item.name).length;
    if (kind === "models") {
      const brandName = masters.brands.find((brand) => brand.id === item.brandId)?.name;
      return products.filter((product) => product.model === item.name && (!brandName || product.brand === brandName)).length;
    }
    if (kind === "colors") return products.filter((product) => product.color === item.name).length;
    return products.filter((product) => product.size === item.name).length;
  };

  const submit = () => {
    try {
      addMaster(kind, { name, brandId: kind === "models" ? brandId : undefined });
      toast.success(`${MASTER_SINGULAR[kind]} creado`);
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el maestro");
    }
  };

  const onKindChange = (value: string) => {
    const nextKind = value as CatalogMasterKind;
    setKind(nextKind);
    if (nextKind === "models" && !brandId) setBrandId(activeBrands[0]?.id || "");
  };

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-4">
      <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Maestros comerciales</p>
          <h3 className="font-display font-bold mt-1">Nuevo maestro</h3>
        </div>
        <div>
          <Label>Tipo de maestro</Label>
          <Select value={kind} onValueChange={onKindChange} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(MASTER_LABELS) as CatalogMasterKind[]).map((item) => (
                <SelectItem key={item} value={item}>{MASTER_SINGULAR[item]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {kind === "models" && (
          <div>
            <Label>Marca del modelo</Label>
            <Select value={brandId} onValueChange={setBrandId} disabled={!canEdit || activeBrands.length === 0}>
              <SelectTrigger><SelectValue placeholder="Selecciona marca" /></SelectTrigger>
              <SelectContent>
                {activeBrands.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>{MASTER_SINGULAR[kind]}</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} />
        </div>
        {canEdit && (
          <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">
            <Plus className="size-4 mr-1" /> Crear
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {(Object.keys(MASTER_LABELS) as CatalogMasterKind[]).map((masterKind) => (
          <div key={masterKind} className="rounded-2xl bg-card border border-border/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Maestro</p>
              <h3 className="font-display font-bold">{MASTER_LABELS[masterKind]}</h3>
            </div>
            <ul className="divide-y divide-border/60 max-h-[380px] overflow-y-auto">
              {masters[masterKind].length === 0 && (
                <li className="px-4 py-5 text-sm text-muted-foreground text-center">Sin datos</li>
              )}
              {masters[masterKind].map((item) => {
                const modelBrand = masterKind === "models"
                  ? masters.brands.find((brand) => brand.id === (item as { brandId?: string }).brandId)?.name
                  : undefined;
                const usage = countProducts(masterKind, item as { name: string; brandId?: string });
                return (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {modelBrand ? `${modelBrand} · ` : ""}{usage} productos
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.active ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"}`}>
                        {item.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => toggleMaster(masterKind, item.id)}
                      >
                        <Power className="size-3.5 mr-1" />
                        {item.active ? "Desactivar" : "Activar"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
