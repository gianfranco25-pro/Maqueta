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
import type { CatalogMasterKind, CatalogMasters, ModelMaster, PriceMode, Product, ProductType, SizePriceRule } from "@/lib/types";
import { useCan } from "@/components/Can";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";

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
  base: "Precio de venta general",
  talla_exacta: "Precio por talla exacta",
  rango_tallas: "Precio por rango",
};

const uniqueSorted = (values: (string | undefined)[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const mergeNames = (...lists: string[][]) => uniqueSorted(lists.flat());

const activeNames = (items: { name: string; active: boolean }[]) =>
  uniqueSorted(items.filter((item) => item.active).map((item) => item.name));

const accessoryTypeOptionsFrom = (masters: CatalogMasters, products: Product[]) =>
  mergeNames(
    uniqueSorted(
      masters.models
        .filter((model) => resolveMasterModelType(model, masters, products) === "accesorio" && model.active)
        .map((model) => model.name)
    ),
    uniqueSorted(products.filter((product) => product.type === "accesorio").map((product) => product.model))
  );

type CatalogReference = {
  key: string;
  type: ProductType;
  brand: string;
  model: string;
  representative?: Product;
  configured: boolean;
};

const resolveMasterModelType = (
  model: ModelMaster,
  masters: CatalogMasters,
  products: Product[]
): ProductType => {
  if (model.type) return model.type;
  const brandName = model.brandId ? masters.brands.find((brand) => brand.id === model.brandId)?.name : undefined;
  const matchedProduct = products.find(
    (product) => product.model === model.name && (!brandName || product.brand === brandName)
  );
  return matchedProduct?.type || "zapato";
};

export default function Catalog() {
  const canEdit = useCan("catalog.edit");
  const canEditPrices = useCan("catalog.prices.edit");
  const catalogMasters = useAppStore((s) => s.catalogMasters);
  const products = useAppStore((s) => s.products);
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

  const references = useMemo(() => {
    const map = new Map<string, CatalogReference>();
    catalogMasters.models.forEach((model) => {
      const brand = catalogMasters.brands.find((item) => item.id === model.brandId);
      const modelType = resolveMasterModelType(model, catalogMasters, products);
      if (modelType === "zapato" && !brand) return;
      const representative = products.find(
        (product) =>
          product.model === model.name &&
          product.type === modelType &&
          (modelType === "accesorio" || product.brand === brand?.name)
      );
      const type = modelType;
      const key = `${modelType}|${brand?.name || ""}|${model.name}`;
      map.set(key, {
        key,
        type,
        brand: brand?.name || "",
        model: model.name,
        representative,
        configured: Boolean(representative),
      });
    });
    products.forEach((product) => {
      const key = `${product.type}|${product.brand}|${product.model}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          type: product.type,
          brand: product.brand,
          model: product.model,
          representative: product,
          configured: true,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
  }, [catalogMasters.brands, catalogMasters.models, products]);

  const filtered = references.filter((reference) => {
    if (typeFilter !== "todos" && reference.type !== typeFilter) return false;
    if (!search) return true;
    const t = `${reference.brand} ${reference.model}`.toLowerCase();
    return t.includes(search.toLowerCase());
  });
  const minimumPricePreview = Math.max(0, form.basePrice - form.maxDiscountSoles);

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

  const modelsForBrand = (brandName: string, type: ProductType) => {
    if (type === "accesorio") {
      return accessoryTypeOptionsFrom(catalogMasters, products);
    }

    const selectedBrand = catalogMasters.brands.find((brand) => brand.name === brandName);
    const structuredModels = catalogMasters.models
      .filter((model) => {
        if (!model.active) return false;
        const modelType = resolveMasterModelType(model, catalogMasters, products);
        if (modelType === "accesorio") return false;
        return Boolean(selectedBrand && model.brandId === selectedBrand.id);
      })
      .map((model) => model.name);
    const legacyModels = products
      .filter((product) => product.type === "zapato" && (!brandName || product.brand === brandName))
      .map((product) => product.model);
    return mergeNames(structuredModels, uniqueSorted(legacyModels));
  };

  const modelOptions = useMemo(
    () => modelsForBrand(form.brand, form.type),
    [catalogMasters, form.brand, form.type, products]
  );

  const modelMasterFor = (brandName: string, modelName: string) => {
    const selectedBrand = catalogMasters.brands.find((brand) => brand.name === brandName);
    return (
      catalogMasters.models.find(
        (item) => item.name === modelName && selectedBrand && item.brandId === selectedBrand.id
      ) ||
      catalogMasters.models.find(
        (item) =>
          item.name === modelName &&
          resolveMasterModelType(item, catalogMasters, products) === "accesorio" &&
          !item.brandId
      )
    );
  };

  const pricingTemplateFor = (brand: string, model: string) => {
    const modelMaster = modelMasterFor(brand, model);
    const template = products.find(
      (product) =>
        product.brand === brand &&
        product.model === model &&
        (!modelMaster || product.type === modelMaster.type)
    );
    if (!template) {
      return {
        cost: 0,
        basePrice: 0,
        wholesalePrice: 0,
        maxDiscountSoles: settings.maxDiscountSoles,
        priceMode: "base" as PriceMode,
        sizePrices: [] as SizePriceRule[],
      };
    }
    return {
      cost: template.cost ?? 0,
      basePrice: template.basePrice,
      wholesalePrice: template.wholesalePrice,
      maxDiscountSoles: template.maxDiscountSoles ?? settings.maxDiscountSoles,
      priceMode: template.priceMode || "base" as PriceMode,
      sizePrices: (template.sizePrices || []).map((rule) => ({
        ...rule,
        id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      })),
    };
  };

  const openNew = () => {
    const brand = masterOptions.brands[0] || "";
    const model = modelsForBrand(brand, "zapato")[0] || "";
    const modelMaster = modelMasterFor(brand, model);
    const template = pricingTemplateFor(brand, model);
    setEditingId(null);
    setForm({ type: modelMaster?.type || "zapato", brand, model, color: "", size: "", ...template, active: true });
    setOpen(true);
  };

  const openEdit = (reference: CatalogReference) => {
    const p = reference.representative;
    const template = pricingTemplateFor(reference.brand, reference.model);
    setEditingId(p?.id || `ref:${reference.key}`);
    setForm({
      type: reference.type,
      brand: reference.brand,
      model: reference.model,
      color: "",
      size: "",
      active: p?.active ?? true,
      ...template,
    });
    setOpen(true);
  };

  const updateRule = (id: string, patch: Partial<SizePriceRule>) => {
    setForm({ ...form, sizePrices: form.sizePrices.map((rule) => rule.id === id ? { ...rule, ...patch } : rule) });
  };

  const validateForm = () => {
    if (form.type === "zapato") {
      if (!form.brand.trim() || !form.model.trim()) return "Marca y modelo son obligatorios";
      if (!masterOptions.brands.includes(form.brand)) return "La marca debe estar registrada en maestros";
      if (!modelOptions.includes(form.model)) return "El modelo debe estar registrado para la marca seleccionada";
    } else {
      if (!form.model.trim()) return "El tipo de accesorio es obligatorio";
      if (!modelOptions.includes(form.model)) return "El tipo de accesorio debe estar registrado en maestros";
    }
    if (!isValidMoney(form.cost)) return "Costo de compra no puede ser negativo";
    if (!isPositiveNumber(form.basePrice)) return "Precio de venta debe ser mayor a 0";
    if (form.cost > 0 && form.basePrice <= form.cost) return "Precio de venta debe ser mayor al costo de compra";
    if (!isPositiveNumber(form.wholesalePrice)) return "Precio por mayor debe ser mayor a 0";
    if (form.wholesalePrice >= form.basePrice) return "Precio por mayor debe ser menor al precio de venta";
    if (form.cost > 0 && form.wholesalePrice < form.cost) return "Precio por mayor no debe ser menor al costo de compra";
    if (!isValidMoney(form.maxDiscountSoles)) return "Precio minimo de venta no puede superar el precio de venta";

    const priceMode = form.type === "zapato" ? form.priceMode : "base";
    if (priceMode === "base") {
      if (form.maxDiscountSoles > form.basePrice) return "Precio minimo de venta no puede ser negativo";
      return null;
    }
    if (!canEditPrices) return "No tienes permiso para editar precios por talla";
    if (form.sizePrices.length === 0) return "Agrega al menos una regla de precio";

    for (const rule of form.sizePrices) {
      if (!isPositiveNumber(rule.basePrice)) return "Cada regla debe tener precio de venta positivo";
      if (form.cost > 0 && rule.basePrice <= form.cost) return "El precio de venta de una regla debe ser mayor al costo de compra";
      if (!isPositiveNumber(rule.wholesalePrice)) return "El precio por mayor de cada regla debe ser mayor a 0";
      if (rule.wholesalePrice >= rule.basePrice) return "El precio por mayor de una regla debe ser menor al precio de venta";
      if (form.cost > 0 && rule.wholesalePrice < form.cost) return "El precio por mayor de una regla no debe ser menor al costo";
      if (form.maxDiscountSoles > rule.basePrice) return "Precio minimo de venta no puede quedar negativo en una regla";
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
      color: form.color || "",
      size: undefined,
      priceMode,
      sizePrices: priceMode === "base" ? [] : form.sizePrices.map((rule) => ({
        ...rule,
        label: priceMode === "talla_exacta"
          ? `Talla ${String(rule.size || "").trim()}`
          : `Tallas ${rule.minSize}-${rule.maxSize}`,
      })),
    };
    if (editingId) {
      const editingProduct = editingId.startsWith("ref:") ? undefined : products.find((product) => product.id === editingId);
      const variants = editingProduct
        ? products.filter((product) =>
            product.type === editingProduct.type &&
            product.brand === editingProduct.brand &&
            product.model === editingProduct.model
          )
        : products.filter((product) =>
            product.type === form.type &&
            product.brand === form.brand &&
            product.model === form.model
          );
      variants.forEach((variant) => updateProduct(variant.id, { ...payload, color: variant.color, size: variant.size }));
      if (variants.length === 0) addProduct(payload);
      toast.success(variants.length === 0 ? "Referencia configurada" : "Referencia actualizada");
    } else {
      addProduct(payload);
      toast.success("Referencia creada");
    }
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Catálogo"
        subtitle={`${references.length} referencias comerciales`}
      />

      <div className="flex gap-2 mb-4">
        <Input placeholder="Buscar marca o modelo" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="zapato">Calzado</SelectItem>
            <SelectItem value="accesorio">Accesorios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="productos" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="maestros">Maestros</TabsTrigger>
          <TabsTrigger value="productos">Referencias</TabsTrigger>
        </TabsList>

        <TabsContent value="maestros">
          <CatalogMastersPanelV2
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
            {filtered.map((reference) => {
              const p = reference.representative;
              const basePrice = p?.basePrice ?? 0;
              const wholesalePrice = p?.wholesalePrice ?? 0;
              const discountLimit = p?.maxDiscountSoles ?? settings.maxDiscountSoles;
              const minimumAllowedPrice = Math.max(0, basePrice - discountLimit);
              const priceMode = p?.priceMode || "base";
              return (
                <div key={reference.key} className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-border/60">
                    <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent font-bold">
                          {PRODUCT_TYPE_LABELS[reference.type]}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {p ? p.active ? "Activo" : "Inactivo" : "Sin configurar"}
                        </span>
                      </div>
                      {reference.type === "zapato" ? (
                        <>
                          <p className="font-display font-bold text-lg truncate mt-2">{reference.brand}</p>
                          <p className="text-sm font-medium truncate">{reference.model}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-display font-bold text-lg truncate mt-2">{reference.model}</p>
                          <p className="text-sm text-muted-foreground">Tipo de accesorio</p>
                        </>
                      )}
                    </div>
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => openEdit(reference)} aria-label="Editar referencia">
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Precio de venta</p>
                        <p className="font-display font-extrabold text-2xl mt-1">{p ? fmtMoney(basePrice) : "Pendiente"}</p>
                        <p className="text-xs text-muted-foreground">
                          {PRICE_MODE_LABELS[priceMode]}
                        </p>
                      </div>
                      <div className="rounded-xl bg-secondary px-3 py-2 text-center min-w-28">
                        <p className="text-xs text-muted-foreground">Precio minimo de venta</p>
                        <p className="font-display font-bold text-xl">{p ? fmtMoney(minimumAllowedPrice) : "Pendiente"}</p>
                        <p className="text-[11px] text-muted-foreground">Se puede bajar {p ? fmtMoney(discountLimit) : "pendiente"}</p>
                      </div>
                    </div>

                    {canEditPrices && (
                      <>
                        <div className="grid gap-2">
                          <div className="rounded-xl border border-border bg-background/50 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Precio por mayor</p>
                            <p className="font-display font-bold mt-1">{p ? fmtMoney(wholesalePrice) : "Pendiente"}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">No es descuento</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">Sin resultados</p>}
          </div>
        </TabsContent>

      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar referencia" : "Nueva referencia"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-3 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Datos de la referencia</p>
                <p className="text-xs text-muted-foreground">Aqui solo defines categoria, marca, modelo y precios. Color, talla, cantidad, ubicacion y estado se manejan en Inventario.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label>Categoria</Label>
                  <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm font-medium">
                    {PRODUCT_TYPE_LABELS[form.type]}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Se define en Maestros / Modelos.</p>
                </div>
                {form.type === "zapato" ? (
                  <>
                    <div>
                      <Label>Marca</Label>
                      <Select value={form.brand} onValueChange={(value) => {
                        const model = modelsForBrand(value, "zapato")[0] || "";
                        const modelMaster = modelMasterFor(value, model);
                        setForm({ ...form, brand: value, model, type: modelMaster?.type || form.type, ...pricingTemplateFor(value, model) });
                      }} disabled={Boolean(editingId)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona marca" /></SelectTrigger>
                        <SelectContent>
                          {masterOptions.brands.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Modelo</Label>
                      <Select value={form.model} onValueChange={(value) => {
                        const modelMaster = modelMasterFor(form.brand, value);
                        setForm({ ...form, model: value, type: modelMaster?.type || form.type, ...pricingTemplateFor(form.brand, value) });
                      }} disabled={Boolean(editingId) || !form.brand || modelOptions.length === 0}>
                        <SelectTrigger><SelectValue placeholder={!form.brand ? "Primero marca" : modelOptions.length === 0 ? "Marca sin modelos" : "Selecciona modelo"} /></SelectTrigger>
                        <SelectContent>
                          {modelOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          {modelOptions.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Crea un modelo de calzado en Maestros</div>}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Tipo de accesorio</Label>
                      <Select
                        value={form.model}
                        onValueChange={(value) => {
                          const modelMaster = modelMasterFor("", value);
                          setForm({ ...form, brand: "", model: value, type: modelMaster?.type || "accesorio", ...pricingTemplateFor("", value) });
                        }}
                        disabled={Boolean(editingId) || modelOptions.length === 0}
                      >
                        <SelectTrigger><SelectValue placeholder={modelOptions.length === 0 ? "Sin tipos de accesorio" : "Selecciona tipo"} /></SelectTrigger>
                        <SelectContent>
                          {modelOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          {modelOptions.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Crea un tipo de accesorio en Maestros</div>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm font-medium">
                      Se toma automatico desde Maestros
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Precios de este modelo</p>
                <p className="text-xs text-muted-foreground">Aqui defines cuanto costo, cuanto se vende, el precio por mayor y el precio mas bajo permitido.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label>Costo de compra</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: toMoneyNumber(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Precio de venta</Label>
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
                  <Label>Precio minimo de venta</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minimumPricePreview}
                    onChange={(e) => {
                      const minimumPrice = toMoneyNumber(e.target.value);
                      setForm({ ...form, maxDiscountSoles: Math.max(0, form.basePrice - minimumPrice) });
                    }}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
                <p>No vender por menos de: {fmtMoney(minimumPricePreview)}</p>
                <p>Se puede bajar hasta: {fmtMoney(form.maxDiscountSoles)}</p>
              </div>
            </div>

            {canEditPrices && form.type === "zapato" && (
              <div className="rounded-xl border border-border p-3 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Precios por talla</p>
                  <p className="text-xs text-muted-foreground mb-2">El sistema usara automaticamente el precio correcto segun la talla.</p>
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
                      <SelectItem value="base">Un solo precio de venta</SelectItem>
                      <SelectItem value="rango_tallas">Precio por rango de tallas</SelectItem>
                      <SelectItem value="talla_exacta">Precio por talla exacta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.priceMode !== "base" && (
                  <div className="space-y-2">
                    {form.sizePrices.map((rule) => {
                      const ruleMinimumPrice = Math.max(0, rule.basePrice - form.maxDiscountSoles);
                      return (
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
                            <Label className="text-[10px] uppercase">Precio de venta</Label>
                            <Input type="number" min="0" step="0.01" placeholder="Base" value={rule.basePrice} onChange={(e) => updateRule(rule.id, { basePrice: toMoneyNumber(e.target.value) })} />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase">Precio por mayor</Label>
                            <Input type="number" min="0" step="0.01" placeholder="Por mayor" value={rule.wholesalePrice} onChange={(e) => updateRule(rule.id, { wholesalePrice: toMoneyNumber(e.target.value) })} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>Precio minimo de venta: {fmtMoney(ruleMinimumPrice)}</span>
                          <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, sizePrices: form.sizePrices.filter((r) => r.id !== rule.id) })}><Trash2 className="size-4" /></Button>
                        </div>
                      </div>
                      );
                    })}
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
  addMaster: (kind: CatalogMasterKind, payload: { name: string; brandId?: string; type?: ProductType }) => void;
  updateMaster: (kind: CatalogMasterKind, id: string, patch: { name?: string; brandId?: string; type?: ProductType }) => void;
  toggleMaster: (kind: CatalogMasterKind, id: string) => void;
}) {
  const [kind, setKind] = useState<CatalogMasterKind>("brands");
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState(masters.brands.find((brand) => brand.active)?.id || "");
  const [modelType, setModelType] = useState<ProductType>("zapato");
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
      addMaster(kind, {
        name,
        brandId: kind === "models" ? brandId : undefined,
        type: kind === "models" ? modelType : undefined,
      });
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Marca del modelo</Label>
              <Select value={brandId} onValueChange={setBrandId} disabled={!canEdit || activeBrands.length === 0}>
                <SelectTrigger><SelectValue placeholder="Selecciona marca" /></SelectTrigger>
                <SelectContent>
                  {activeBrands.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo del modelo</Label>
              <Select value={modelType} onValueChange={(value) => setModelType(value as ProductType)} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zapato">Calzado</SelectItem>
                  <SelectItem value="accesorio">Accesorio</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                          {modelBrand ? `${modelBrand} · ` : ""}{usage} referencias
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

function CatalogMastersPanelV2({
  canEdit,
  masters,
  products,
  addMaster,
  toggleMaster,
}: {
  canEdit: boolean;
  masters: CatalogMasters;
  products: Product[];
  addMaster: (kind: CatalogMasterKind, payload: { name: string; brandId?: string; type?: ProductType }) => void;
  updateMaster: (kind: CatalogMasterKind, id: string, patch: { name?: string; brandId?: string; type?: ProductType }) => void;
  toggleMaster: (kind: CatalogMasterKind, id: string) => void;
}) {
  type MasterCreationKind = CatalogMasterKind | "models_zapato" | "models_accesorio";

  const [kind, setKind] = useState<MasterCreationKind>("models_zapato");
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState(masters.brands.find((brand) => brand.active)?.id || "");
  const activeBrands = masters.brands.filter((brand) => brand.active);
  const isModelKind = kind === "models_zapato" || kind === "models_accesorio";
  const modelType: ProductType = kind === "models_accesorio" ? "accesorio" : "zapato";
  const submitKind: CatalogMasterKind = isModelKind ? "models" : kind;

  const countReferences = (kind: CatalogMasterKind, item: { name: string; brandId?: string }) => {
    if (kind === "brands") return products.filter((product) => product.brand === item.name).length;
    if (kind === "models") {
      const brandName = masters.brands.find((brand) => brand.id === item.brandId)?.name;
      const itemType = "type" in item ? (item as { type?: ProductType }).type : undefined;
      return products.filter(
        (product) =>
          product.model === item.name &&
          (!brandName || product.brand === brandName) &&
          (!itemType || product.type === itemType)
      ).length;
    }
    if (kind === "colors") return products.filter((product) => product.color === item.name).length;
    return products.filter((product) => product.size === item.name).length;
  };

  const submit = () => {
    try {
      addMaster(submitKind, {
        name,
        brandId: isModelKind ? brandId : undefined,
        type: isModelKind ? modelType : undefined,
      });
      toast.success(`${isModelKind ? "Modelo" : MASTER_SINGULAR[submitKind]} creado`);
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el maestro");
    }
  };

  const onKindChange = (value: string) => {
    const nextKind = value as MasterCreationKind;
    setKind(nextKind);
    if ((nextKind === "models_zapato" || nextKind === "models_accesorio") && !brandId) {
      setBrandId(activeBrands[0]?.id || "");
    }
  };

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-4">
      <div className="rounded-2xl bg-card border border-border/60 p-4 space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Maestros comerciales</p>
          <h3 className="font-display font-bold mt-1">Nuevo maestro</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Aqui defines si crearas una marca, un modelo de calzado, un tipo de accesorio, un color o una talla.
          </p>
        </div>

        <div>
          <Label>Tipo de maestro</Label>
          <Select value={kind} onValueChange={onKindChange} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="brands">Marca</SelectItem>
              <SelectItem value="models_zapato">Modelo de calzado</SelectItem>
              <SelectItem value="models_accesorio">Tipo de accesorio</SelectItem>
              <SelectItem value="colors">Color</SelectItem>
              <SelectItem value="sizes">Talla</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {kind === "models_zapato" && (
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
          <Label>
            {kind === "models_accesorio"
              ? "Tipo de accesorio"
              : kind === "models_zapato"
                ? "Modelo"
                : MASTER_SINGULAR[submitKind]}
          </Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} />
        </div>

        {canEdit && (
          <Button onClick={submit} className="w-full bg-foreground text-background hover:bg-foreground/90">
            <Plus className="size-4 mr-1" /> Crear
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <MasterCount label="Marcas" value={masters.brands.length} />
          <MasterCount
            label="Modelos"
            value={masters.models.filter((model) => resolveMasterModelType(model, masters, products) === "zapato").length}
          />
          <MasterCount
            label="Accesorios"
            value={masters.models.filter((model) => resolveMasterModelType(model, masters, products) === "accesorio").length}
          />
          <MasterCount label="Colores" value={masters.colors.length} />
          <MasterCount label="Tallas" value={masters.sizes.length} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Relacion principal</p>
            <h3 className="font-display font-bold">Marcas y modelos</h3>
          </div>
          <div className="grid xl:grid-cols-2 gap-3 p-3">
            {masters.brands.map((brand) => {
              const models = masters.models.filter(
                (model) => resolveMasterModelType(model, masters, products) === "zapato" && model.brandId === brand.id
              );
              return (
                <div key={brand.id} className="rounded-xl border border-border bg-background/50 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold truncate">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">{models.length} modelos · {countReferences("brands", brand)} referencias</p>
                    </div>
                    <MasterState active={brand.active} />
                  </div>

                  <div className="space-y-2">
                    {models.length === 0 && (
                      <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">Sin modelos asociados</p>
                    )}
                    {models.map((model) => (
                      <div key={model.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{model.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {countReferences("models", model)} referencias
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <MasterState active={model.active} compact />
                          {canEdit && (
                            <Button size="icon" variant="ghost" onClick={() => toggleMaster("models", model.id)} aria-label={model.active ? "Desactivar modelo" : "Activar modelo"}>
                              <Power className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => toggleMaster("brands", brand.id)}>
                      <Power className="size-3.5 mr-1" />
                      {brand.active ? "Desactivar marca" : "Activar marca"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Maestro independiente</p>
            <h3 className="font-display font-bold">Tipos de accesorio</h3>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {masters.models.filter((model) => model.type === "accesorio").length === 0 && (
              <p className="w-full py-6 text-sm text-muted-foreground text-center">Sin tipos de accesorio</p>
            )}
            {masters.models
              .filter((model) => resolveMasterModelType(model, masters, products) === "accesorio")
              .map((model) => (
                <div key={model.id} className="rounded-xl border border-border bg-background/50 px-3 py-2 min-w-[168px] flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{model.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {countReferences("models", model)} referencias
                      </p>
                    </div>
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => toggleMaster("models", model.id)} aria-label={model.active ? "Desactivar tipo de accesorio" : "Activar tipo de accesorio"}>
                        <Power className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  <MasterState active={model.active} compact />
                </div>
              ))}
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-4">
          {(["colors", "sizes"] as CatalogMasterKind[]).map((masterKind) => (
            <div key={masterKind} className="rounded-2xl bg-card border border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Auxiliar de inventario</p>
                <h3 className="font-display font-bold">{MASTER_LABELS[masterKind]}</h3>
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {masters[masterKind].length === 0 && (
                  <p className="w-full py-6 text-sm text-muted-foreground text-center">Sin datos</p>
                )}
                {masters[masterKind].map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-background/50 px-3 py-2 min-w-[128px] flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">{countReferences(masterKind, item as { name: string; brandId?: string })} referencias</p>
                      </div>
                      {canEdit && (
                        <Button size="icon" variant="ghost" onClick={() => toggleMaster(masterKind, item.id)} aria-label={item.active ? "Desactivar" : "Activar"}>
                          <Power className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <MasterState active={item.active} compact />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MasterCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="font-display font-bold text-xl">{value}</p>
    </div>
  );
}

function MasterState({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${compact ? "mt-0" : ""} ${active ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"}`}>
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
