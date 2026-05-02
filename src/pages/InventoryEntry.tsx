import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ClipboardPaste,
  Package,
  ScanLine,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { QRScanner } from "@/components/QRScanner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  isLocationActive,
  isStorageLocation,
  operationalRoleFor,
  type Product,
  type ProductType,
} from "@/lib/types";

type EntryMode = "storage" | "store";

type InventoryReference = {
  key: string;
  type: ProductType;
  brand: string;
  model: string;
  representative: Product;
};

type LocationOption = {
  id: string;
  name: string;
};

type ScannedCodeEntry = {
  referenceKey: string;
  productType: ProductType;
  brand: string;
  model: string;
  color: string;
  unitCode: string;
  size?: string;
  locationId?: string;
};

type BatchPiecePreview = {
  referenceKey: string;
  productType: ProductType;
  brand: string;
  model: string;
  color: string;
  unitCode: string;
  side?: "D" | "I";
  size?: string;
  locationId?: string;
  alreadyRegistered: boolean;
};

type PairPreview = {
  type: "pair";
  referenceKey: string;
  productType: ProductType;
  brand: string;
  model: string;
  color: string;
  pairCode: string;
  size: string;
  right?: BatchPiecePreview;
  left?: BatchPiecePreview;
  complete: boolean;
  alreadyRegisteredCount: number;
};

type UnitPreview = {
  type: "unit";
  referenceKey: string;
  productType: ProductType;
  brand: string;
  model: string;
  color: string;
  unitCode: string;
  locationId?: string;
  alreadyRegistered: boolean;
};

type BatchPreview = PairPreview | UnitPreview;

type SizeSection = {
  size: string;
  pairs: PairPreview[];
  pairCount: number;
  loosePieces: number;
};

type EntryStats = {
  scannedCodes: number;
  readyPairs: number;
  incompletePairs: number;
  loosePieces: number;
  units: number;
  alreadyRegistered: number;
};

const resolveInventoryModelType = (
  model: { brandId?: string; type?: ProductType; name: string },
  brands: Array<{ id: string; name: string }>,
  products: Product[]
): ProductType => {
  if (model.type) return model.type;
  const brandName = model.brandId ? brands.find((brand) => brand.id === model.brandId)?.name : undefined;
  const matchedProduct = products.find(
    (product) => product.model === model.name && (!brandName || product.brand === brandName)
  );
  return matchedProduct?.type || "zapato";
};

type ReferenceSection = {
  key: string;
  referenceKey: string;
  productType: ProductType;
  brand: string;
  model: string;
  color: string;
  sizeSections: SizeSection[];
  units: UnitPreview[];
  stats: EntryStats;
};

const BASE_INVENTORY_CODE_PATTERN = /^[A-Z]\d{5}$/;
const SHOE_PAIR_CODE_PATTERN = BASE_INVENTORY_CODE_PATTERN;
const SHOE_UNIT_CODE_PATTERN = /^([A-Z]\d{5})-(D|I)$/;
const ACCESSORY_UNIT_CODE_PATTERN = /^[A-Z]\d{5}-(D|I)$/;

const uniqueSorted = (values: (string | undefined)[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const normalizeCodesFromText = (value: string) =>
  value
    .split(/[\s,;]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

const sortSizes = (sizes: string[]) =>
  sizes.slice().sort((a, b) => {
    const aNumber = Number(a);
    const bNumber = Number(b);
    if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) return aNumber - bNumber;
    return a.localeCompare(b);
  });

const expandShoeInputToPair = (code: string) => {
  if (SHOE_PAIR_CODE_PATTERN.test(code)) {
    return [`${code}-D`, `${code}-I`];
  }
  const match = code.match(SHOE_UNIT_CODE_PATTERN);
  if (!match) return [code];
  return [`${match[1]}-D`, `${match[1]}-I`];
};

const buildPreview = (entries: ScannedCodeEntry[], existingUnitCodes: Set<string>): BatchPreview[] => {
  const units: UnitPreview[] = [];
  const pairs = new Map<
    string,
    {
      referenceKey: string;
      productType: ProductType;
      brand: string;
      model: string;
      color: string;
      pairCode: string;
      size: string;
      right?: BatchPiecePreview;
      left?: BatchPiecePreview;
    }
  >();

  entries.forEach((entry) => {
    if (entry.productType === "accesorio") {
      units.push({
        type: "unit",
        referenceKey: entry.referenceKey,
        productType: entry.productType,
        brand: entry.brand,
        model: entry.model,
        color: entry.color,
        unitCode: entry.unitCode,
        locationId: entry.locationId,
        alreadyRegistered: existingUnitCodes.has(entry.unitCode),
      });
      return;
    }

    const match = entry.unitCode.match(SHOE_UNIT_CODE_PATTERN);
    if (!match) return;

    const pairCode = match[1];
    const size = entry.size || "Sin talla";
    const pairKey = `${entry.referenceKey}::${entry.color}::${pairCode}`;
    const current = pairs.get(pairKey) || {
      referenceKey: entry.referenceKey,
      productType: entry.productType,
      brand: entry.brand,
      model: entry.model,
      color: entry.color,
      pairCode,
      size,
    };
    const piece: BatchPiecePreview = {
      referenceKey: entry.referenceKey,
      productType: entry.productType,
      brand: entry.brand,
      model: entry.model,
      color: entry.color,
      unitCode: entry.unitCode,
      side: match[2] as "D" | "I",
      size,
      locationId: entry.locationId,
      alreadyRegistered: existingUnitCodes.has(entry.unitCode),
    };

    current.size = current.size || size;
    if (piece.side === "D") current.right = piece;
    if (piece.side === "I") current.left = piece;
    pairs.set(pairKey, current);
  });

  const pairPreview: PairPreview[] = Array.from(pairs.values())
    .sort((a, b) => `${a.brand} ${a.model} ${a.color} ${a.pairCode}`.localeCompare(`${b.brand} ${b.model} ${b.color} ${b.pairCode}`))
    .map((pair) => ({
      type: "pair",
      referenceKey: pair.referenceKey,
      productType: pair.productType,
      brand: pair.brand,
      model: pair.model,
      color: pair.color,
      pairCode: pair.pairCode,
      size: pair.size,
      right: pair.right,
      left: pair.left,
      complete: Boolean(pair.right && pair.left),
      alreadyRegisteredCount: [pair.right, pair.left].filter((piece) => piece?.alreadyRegistered).length,
    }));

  return [...pairPreview, ...units.sort((a, b) => `${a.brand} ${a.model} ${a.color} ${a.unitCode}`.localeCompare(`${b.brand} ${b.model} ${b.color} ${b.unitCode}`))];
};

const buildStats = (preview: BatchPreview[]): EntryStats => {
  return preview.reduce<EntryStats>(
    (summary, item) => {
      if (item.type === "unit") {
        summary.scannedCodes += 1;
        summary.units += 1;
        summary.alreadyRegistered += item.alreadyRegistered ? 1 : 0;
        return summary;
      }

      const pieceCount = (item.right ? 1 : 0) + (item.left ? 1 : 0);
      summary.scannedCodes += pieceCount;
      summary.alreadyRegistered += item.alreadyRegisteredCount;
      if (item.complete) {
        summary.readyPairs += 1;
      } else {
        summary.incompletePairs += 1;
        summary.loosePieces += pieceCount;
      }
      return summary;
    },
    {
      scannedCodes: 0,
      readyPairs: 0,
      incompletePairs: 0,
      loosePieces: 0,
      units: 0,
      alreadyRegistered: 0,
    }
  );
};

const buildSizeSections = (preview: BatchPreview[]): SizeSection[] => {
  const pairs = preview.filter((item): item is PairPreview => item.type === "pair");
  const grouped = new Map<string, PairPreview[]>();

  pairs.forEach((pair) => {
    const current = grouped.get(pair.size) || [];
    current.push(pair);
    grouped.set(pair.size, current);
  });

  return sortSizes(Array.from(grouped.keys())).map((size) => {
    const sizePairs = grouped.get(size) || [];
    return {
      size,
      pairs: sizePairs,
      pairCount: sizePairs.filter((pair) => pair.complete).length,
      loosePieces: sizePairs
        .filter((pair) => !pair.complete)
        .reduce((total, pair) => total + (pair.right ? 1 : 0) + (pair.left ? 1 : 0), 0),
    };
  });
};

const describeScannedSize = (size: string, section?: SizeSection) => {
  if (!section) return "Sin pares cargados";
  if (section.loosePieces > 0) return `${section.pairCount} pares y ${section.loosePieces} piezas`;
  return `${section.pairCount} pares`;
};

const buildReferenceSections = (preview: BatchPreview[]): ReferenceSection[] => {
  const grouped = new Map<string, BatchPreview[]>();

  preview.forEach((item) => {
    const key = `${item.referenceKey}::${item.color}`;
    const current = grouped.get(key) || [];
    current.push(item);
    grouped.set(key, current);
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const first = items[0];
      const pairs = items.filter((item): item is PairPreview => item.type === "pair");
      const units = items.filter((item): item is UnitPreview => item.type === "unit");
      return {
        key,
        referenceKey: first.referenceKey,
        productType: first.productType,
        brand: first.brand,
        model: first.model,
        color: first.color,
        sizeSections: buildSizeSections(pairs),
        units: units.sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
        stats: buildStats(items),
      };
    })
    .sort((a, b) => `${a.brand} ${a.model} ${a.color}`.localeCompare(`${b.brand} ${b.model} ${b.color}`));
};

const buildSubmitLabel = (mode: EntryMode, stats: EntryStats) => {
  const parts: string[] = [];

  if (stats.readyPairs > 0) parts.push(`${stats.readyPairs} par(es)`);
  if (mode === "store" && stats.loosePieces > 0) parts.push(`${stats.loosePieces} pieza(s)`);
  if (stats.units > 0) parts.push(`${stats.units} unidad(es)`);

  const summary = parts.length > 0 ? parts.join(" y ") : `${stats.scannedCodes} codigo(s)`;
  return mode === "storage" ? `Registrar ${summary} en almacen` : `Registrar ${summary}`;
};

export default function InventoryEntry() {
  const products = useAppStore((state) => state.products);
  const catalogMasters = useAppStore((state) => state.catalogMasters);
  const locations = useAppStore((state) => state.locations);
  const inventory = useAppStore((state) => state.inventory);
  const addProduct = useAppStore((state) => state.addProduct);
  const registerInventoryCodes = useAppStore((state) => state.registerInventoryCodes);
  const user = useCurrentUser();

  const activeLocations = useMemo(() => locations.filter(isLocationActive), [locations]);
  const storageLocations = useMemo(() => activeLocations.filter(isStorageLocation), [activeLocations]);
  const storeLocations = useMemo(() => activeLocations.filter((location) => !isStorageLocation(location)), [activeLocations]);

  const references = useMemo<InventoryReference[]>(() => {
    const map = new Map<string, InventoryReference>();

    catalogMasters.models.forEach((model) => {
      const brand = catalogMasters.brands.find((item) => item.id === model.brandId);
      const modelType = resolveInventoryModelType(model, catalogMasters.brands, products);
      if (modelType === "zapato" && (!brand || !brand.active)) return;
      if (!model.active) return;

      const representative = products.find(
        (product) =>
          product.active !== false &&
          (modelType === "accesorio" || product.brand === brand?.name) &&
          product.model === model.name &&
          product.type === modelType
      );
      if (!representative) return;

      const key = `${modelType}|${brand?.name || ""}|${model.name}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          type: modelType,
          brand: modelType === "accesorio" ? representative.brand : brand?.name || "",
          model: model.name,
          representative,
        });
      }
    });

    products.forEach((product) => {
      if (product.active === false) return;
      const key = `${product.type}|${product.brand}|${product.model}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          type: product.type,
          brand: product.brand,
          model: product.model,
          representative: product,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
  }, [catalogMasters.brands, catalogMasters.models, products]);

  const [mode, setMode] = useState<EntryMode>("storage");
  const shoeReferences = useMemo(() => references.filter((reference) => reference.type === "zapato"), [references]);
  const accessoryReferences = useMemo(() => references.filter((reference) => reference.type === "accesorio"), [references]);
  const [referenceType, setReferenceType] = useState<ProductType>(shoeReferences.length > 0 ? "zapato" : "accesorio");
  const brandOptions = useMemo(() => uniqueSorted(shoeReferences.map((reference) => reference.brand)), [shoeReferences]);
  const [brand, setBrand] = useState(brandOptions[0] || "");
  const shoeModelOptions = useMemo(
    () => uniqueSorted(shoeReferences.filter((reference) => reference.brand === brand).map((reference) => reference.model)),
    [brand, shoeReferences]
  );
  const accessoryTypeOptions = useMemo(
    () => uniqueSorted(accessoryReferences.map((reference) => reference.model)),
    [accessoryReferences]
  );
  const modelOptions = referenceType === "zapato" ? shoeModelOptions : accessoryTypeOptions;
  const [model, setModel] = useState(modelOptions[0] || "");

  const selectedReference = useMemo(() => {
    if (referenceType === "accesorio") {
      return accessoryReferences.find((reference) => reference.model === model) || accessoryReferences[0] || shoeReferences[0];
    }
    return shoeReferences.find((reference) => reference.brand === brand && reference.model === model) || shoeReferences[0] || accessoryReferences[0];
  }, [accessoryReferences, brand, model, referenceType, shoeReferences]);

  const colorOptions = useMemo(
    () =>
      uniqueSorted([
        ...catalogMasters.colors.filter((item) => item.active).map((item) => item.name),
        ...products
          .filter(
            (product) =>
              product.active !== false &&
              product.brand === selectedReference?.brand &&
              product.model === selectedReference?.model
          )
          .map((product) => product.color),
      ]),
    [catalogMasters.colors, products, selectedReference]
  );

  const sizeOptions = useMemo(
    () =>
      sortSizes(
        uniqueSorted([
          ...catalogMasters.sizes.filter((item) => item.active).map((item) => item.name),
          ...products
            .filter(
              (product) =>
                product.active !== false &&
                product.brand === selectedReference?.brand &&
                product.model === selectedReference?.model
            )
            .map((product) => product.size),
        ])
      ),
    [catalogMasters.sizes, products, selectedReference]
  );

  const [color, setColor] = useState(colorOptions[0] || "");
  const [activeSize, setActiveSize] = useState(sizeOptions[0] || "");
  const [entries, setEntries] = useState<ScannedCodeEntry[]>([]);
  const [bulkCodes, setBulkCodes] = useState("");

  const preferredStorageLocationId = useMemo(() => {
    if (user && storageLocations.some((location) => location.id === user.locationId)) {
      return user.locationId;
    }
    return storageLocations[0]?.id || "";
  }, [storageLocations, user]);

  const preferredStoreLocationId = useMemo(() => {
    if (user && activeLocations.some((location) => location.id === user.locationId)) {
      return user.locationId;
    }
    return activeLocations[0]?.id || "";
  }, [activeLocations, user]);

  const [storageLocationId, setStorageLocationId] = useState(preferredStorageLocationId);
  const [storeLocationId, setStoreLocationId] = useState(preferredStoreLocationId);

  useEffect(() => {
    if (referenceType !== "zapato") {
      setBrand("");
      return;
    }
    if (!brandOptions.length) {
      setBrand("");
      return;
    }
    if (!brandOptions.includes(brand)) setBrand(brandOptions[0]);
  }, [brand, brandOptions, referenceType]);

  useEffect(() => {
    if (!modelOptions.length) {
      setModel("");
      return;
    }
    if (!modelOptions.includes(model)) setModel(modelOptions[0]);
  }, [model, modelOptions]);

  useEffect(() => {
    if (referenceType === "zapato" && shoeReferences.length === 0 && accessoryReferences.length > 0) {
      setReferenceType("accesorio");
      return;
    }
    if (referenceType === "accesorio" && accessoryReferences.length === 0 && shoeReferences.length > 0) {
      setReferenceType("zapato");
    }
  }, [accessoryReferences.length, referenceType, shoeReferences.length]);

  useEffect(() => {
    if (!colorOptions.length) {
      setColor("");
      return;
    }
    if (!colorOptions.includes(color)) setColor(colorOptions[0]);
  }, [color, colorOptions]);

  useEffect(() => {
    if (!sizeOptions.length) {
      setActiveSize("");
      return;
    }
    if (!sizeOptions.includes(activeSize)) setActiveSize(sizeOptions[0]);
  }, [activeSize, sizeOptions]);

  useEffect(() => {
    if (!storageLocations.some((location) => location.id === storageLocationId)) {
      setStorageLocationId(preferredStorageLocationId);
    }
  }, [preferredStorageLocationId, storageLocationId, storageLocations]);

  useEffect(() => {
    if (!activeLocations.some((location) => location.id === storeLocationId)) {
      setStoreLocationId(preferredStoreLocationId);
    }
  }, [activeLocations, preferredStoreLocationId, storeLocationId]);

  const existingUnitCodes = useMemo(
    () => new Set(inventory.map((item) => item.unitCode.toUpperCase())),
    [inventory]
  );

  const preview = useMemo(
    () => buildPreview(entries, existingUnitCodes),
    [entries, existingUnitCodes]
  );
  const stats = useMemo(() => buildStats(preview), [preview]);
  const referenceSections = useMemo(() => buildReferenceSections(preview), [preview]);

  const currentReferenceEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.referenceKey === selectedReference?.key &&
          entry.color === color &&
          entry.productType === selectedReference?.type
      ),
    [color, entries, selectedReference]
  );
  const currentReferencePreview = useMemo(
    () => buildPreview(currentReferenceEntries, existingUnitCodes),
    [currentReferenceEntries, existingUnitCodes]
  );
  const currentSizeSections = useMemo(() => buildSizeSections(currentReferencePreview), [currentReferencePreview]);
  const currentSizeSectionMap = useMemo(
    () => new Map(currentSizeSections.map((section) => [section.size, section])),
    [currentSizeSections]
  );

  const currentLocationId = mode === "storage" ? storageLocationId : storeLocationId;
  const locationOptions = mode === "storage" ? storageLocations : activeLocations;
  const pieceLocationOptions = useMemo<LocationOption[]>(
    () => activeLocations.map((location) => ({ id: location.id, name: location.name })),
    [activeLocations]
  );
  const isShoe = selectedReference?.type === "zapato";

  const validateIncomingCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!selectedReference) throw new Error("Primero selecciona marca y modelo.");
    if (!color) throw new Error("Primero selecciona color.");
    if (selectedReference.type === "zapato") {
      if (!SHOE_PAIR_CODE_PATTERN.test(code) && !SHOE_UNIT_CODE_PATTERN.test(code)) {
        throw new Error(`Codigo invalido para calzado: ${code}`);
      }
      return code;
    }
    if (!ACCESSORY_UNIT_CODE_PATTERN.test(code)) {
      throw new Error(`Codigo invalido para accesorio: ${code}. Usa siempre el codigo completo, por ejemplo A00001-D o A00001-I.`);
    }
    return code;
  };

  const addShoeCodes = (rawCode: string, currentEntries: ScannedCodeEntry[]) => {
    if (!activeSize) throw new Error("Selecciona la talla activa antes de escanear.");
    if (!selectedReference || !color) throw new Error("Selecciona la referencia antes de escanear.");

    const expandedCodes = expandShoeInputToPair(rawCode);
    const pairCode = expandedCodes[0].slice(0, 6);
    const pairEntries = currentEntries.filter((entry) => entry.unitCode.startsWith(`${pairCode}-`));
    const existingSize = pairEntries[0]?.size;
    const pairReference = pairEntries[0];

    if (existingSize && existingSize !== activeSize) {
      toast.error(`Ese par ya esta cargado en talla ${existingSize}.`);
    }

    const effectiveSize = existingSize || activeSize;
    const existingCodes = new Set(currentEntries.map((entry) => entry.unitCode));
    const missingCodes = expandedCodes.filter((code) => !existingCodes.has(code));

    if (missingCodes.length === 0) {
      toast.error(`Ese codigo ya esta en la lista: ${rawCode}`);
      return currentEntries;
    }

    return [
      ...currentEntries,
      ...missingCodes.map((code) => ({
        referenceKey: pairReference?.referenceKey || selectedReference.key,
        productType: pairReference?.productType || selectedReference.type,
        brand: pairReference?.brand || selectedReference.brand,
        model: pairReference?.model || selectedReference.model,
        color: pairReference?.color || color,
        unitCode: code,
        size: effectiveSize,
        locationId: mode === "storage" ? storageLocationId : storeLocationId,
      })),
    ];
  };

  const addAccessoryCode = (rawCode: string, currentEntries: ScannedCodeEntry[]) => {
    if (!selectedReference || !color) throw new Error("Selecciona la referencia antes de escanear.");
    if (currentEntries.some((entry) => entry.unitCode === rawCode)) {
      toast.error(`Ese codigo ya esta en la lista: ${rawCode}`);
      return currentEntries;
    }
    return [
      ...currentEntries,
      {
        referenceKey: selectedReference.key,
        productType: selectedReference.type,
        brand: selectedReference.brand,
        model: selectedReference.model,
        color,
        unitCode: rawCode,
        locationId: mode === "storage" ? storageLocationId : storeLocationId,
      },
    ];
  };

  const addCode = (rawCode: string) => {
    try {
      const code = validateIncomingCode(rawCode);
      setEntries((current) =>
        selectedReference?.type === "zapato" ? addShoeCodes(code, current) : addAccessoryCode(code, current)
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar el codigo.");
    }
  };

  const addBulkCodes = () => {
    const incoming = normalizeCodesFromText(bulkCodes);
    if (incoming.length === 0) {
      toast.error("Pega al menos un codigo.");
      return;
    }

    const invalid: string[] = [];
    const duplicates: string[] = [];
    let added = 0;

    setEntries((current) => {
      let next = [...current];
      incoming.forEach((rawCode) => {
        try {
          const code = validateIncomingCode(rawCode);
          const before = next.length;
          next = selectedReference?.type === "zapato" ? addShoeCodes(code, next) : addAccessoryCode(code, next);
          if (next.length === before) duplicates.push(code);
          else added += next.length - before;
        } catch {
          invalid.push(rawCode.toUpperCase());
        }
      });
      return next;
    });

    setBulkCodes("");

    if (added > 0) toast.success(`${added} codigo(s) agregados.`);
    if (invalid.length > 0) {
      toast.error(`Invalidos: ${invalid.slice(0, 6).join(", ")}${invalid.length > 6 ? "..." : ""}`);
    }
    if (duplicates.length > 0 && added === 0) {
      toast.error("Todos esos codigos ya estaban en la lista.");
    }
  };

  const removeCode = (unitCode: string) => {
    setEntries((current) => current.filter((entry) => entry.unitCode !== unitCode));
  };

  const removePair = (pairCode: string) => {
    setEntries((current) => current.filter((entry) => !entry.unitCode.startsWith(`${pairCode}-`)));
  };

  const updateCodeLocation = (unitCode: string, locationId: string) => {
    setEntries((current) =>
      current.map((entry) => (entry.unitCode === unitCode ? { ...entry, locationId } : entry))
    );
  };

  const clearRegisteredCodes = () => {
    const cleaned = entries.filter((entry) => !existingUnitCodes.has(entry.unitCode));
    if (cleaned.length === entries.length) {
      toast.error("No hay codigos ya registrados en la lista.");
      return;
    }
    setEntries(cleaned);
    toast.success("Se quitaron los codigos ya registrados.");
  };

  const clearAll = () => {
    setEntries([]);
    setBulkCodes("");
  };

  const validationMessage = useMemo(() => {
    if (!user) return "No hay usuario activo.";
    if (entries.length === 0) return "Escanea o pega al menos un codigo.";
    if (
      entries.some(
        (entry) =>
          !entry.referenceKey ||
          !entry.model ||
          !entry.color ||
          (entry.productType === "zapato" && !entry.brand)
      )
    ) {
      return "Hay codigos sin referencia completa.";
    }
    if (entries.some((entry) => entry.productType === "zapato" && !entry.size)) {
      return "Falta definir la talla para uno o mas pares.";
    }
    if (entries.some((entry) => !entry.locationId)) return "Falta definir destino para una o mas piezas.";
    if (stats.alreadyRegistered > 0) return "Quita los codigos que ya existen en inventario.";
    if (mode === "storage" && stats.incompletePairs > 0) {
      return "En almacen el calzado solo se registra como par completo.";
    }
    return null;
  }, [entries, mode, stats.alreadyRegistered, stats.incompletePairs, user]);

  const submit = () => {
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      let createdCount = 0;
      const productCache = new Map<string, Product>();
      const grouped = new Map<string, { productId: string; locationId: string; codes: string[] }>();

      const ensureProduct = (entry: ScannedCodeEntry) => {
        const cacheKey = `${entry.referenceKey}::${entry.color}::${entry.size || ""}`;
        const cached = productCache.get(cacheKey);
        if (cached) return cached;

        const existing = products.find(
          (product) =>
            product.active !== false &&
            product.type === entry.productType &&
            product.brand === entry.brand &&
            product.model === entry.model &&
            product.color === entry.color &&
            (entry.productType !== "zapato" || product.size === entry.size)
        );
        if (existing) {
          productCache.set(cacheKey, existing);
          return existing;
        }

        const reference = references.find((item) => item.key === entry.referenceKey);
        if (!reference) {
          throw new Error(`No se encontro la referencia para ${entry.brand} ${entry.model}.`);
        }

        const created = addProduct({
          ...reference.representative,
          color: entry.color,
          size: entry.productType === "zapato" ? entry.size : undefined,
          active: true,
        });
        productCache.set(cacheKey, created);
        return created;
      };

      entries.forEach((entry) => {
        if (!entry.locationId) throw new Error(`Falta destino para ${entry.unitCode}`);
        if (entry.productType === "zapato" && !entry.size) throw new Error(`Falta talla para ${entry.unitCode}`);
        const product = ensureProduct(entry);
        const key = `${product.id}::${entry.locationId}`;
        const current = grouped.get(key) || { productId: product.id, locationId: entry.locationId, codes: [] };
        current.codes.push(entry.unitCode);
        grouped.set(key, current);
      });

      for (const group of grouped.values()) {
        const created = registerInventoryCodes({
          productId: group.productId,
          locationId: group.locationId,
          codes: group.codes,
          byUserId: user!.id,
          byUserName: user!.name,
          byUserRole: operationalRoleFor(user, "almacen"),
        });
        createdCount += created.length;
      }

      const descriptionParts: string[] = [];
      if (stats.readyPairs > 0) descriptionParts.push(`${stats.readyPairs} par(es)`);
      if (mode === "store" && stats.loosePieces > 0) descriptionParts.push(`${stats.loosePieces} pieza(s)`);
      if (stats.units > 0) descriptionParts.push(`${stats.units} unidad(es)`);

      toast.success(mode === "storage" ? "Ingreso registrado en almacen." : "Ingreso registrado en ubicaciones.", {
        description: descriptionParts.join(" y ") || `${createdCount} codigo(s) registrados`,
      });

      clearAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el ingreso.");
    }
  };

  return (
    <>
      <PageHeader
        title="Ingreso de inventario"
        subtitle="Registra codigos ya impresos y arma el lote por talla dentro de la misma referencia."
      />

      <Tabs value={mode} onValueChange={(value) => setMode(value as EntryMode)} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="storage">Almacen</TabsTrigger>
          <TabsTrigger value="store">Tienda</TabsTrigger>
        </TabsList>

        <TabsContent value="storage" className="space-y-4">
          <EntryScreen
            mode="storage"
            referenceType={referenceType}
            setReferenceType={setReferenceType}
            selectedReference={selectedReference}
            brand={brand}
            setBrand={setBrand}
            brandOptions={brandOptions}
            model={model}
            setModel={setModel}
            modelOptions={modelOptions}
            color={color}
            setColor={setColor}
            colorOptions={colorOptions}
            activeSize={activeSize}
            setActiveSize={setActiveSize}
            sizeOptions={sizeOptions}
            locationId={storageLocationId}
            setLocationId={setStorageLocationId}
            locationOptions={storageLocations.map((location) => ({ id: location.id, name: location.name }))}
            pieceLocationOptions={pieceLocationOptions}
            bulkCodes={bulkCodes}
            setBulkCodes={setBulkCodes}
            addCode={addCode}
            addBulkCodes={addBulkCodes}
            removeCode={removeCode}
            removePair={removePair}
            updateCodeLocation={updateCodeLocation}
            clearRegisteredCodes={clearRegisteredCodes}
            clearAll={clearAll}
            referenceSections={referenceSections}
            stats={stats}
            currentSizeSectionMap={currentSizeSectionMap}
            validationMessage={validationMessage}
            submit={submit}
          />
        </TabsContent>

        <TabsContent value="store" className="space-y-4">
          <EntryScreen
            mode="store"
            referenceType={referenceType}
            setReferenceType={setReferenceType}
            selectedReference={selectedReference}
            brand={brand}
            setBrand={setBrand}
            brandOptions={brandOptions}
            model={model}
            setModel={setModel}
            modelOptions={modelOptions}
            color={color}
            setColor={setColor}
            colorOptions={colorOptions}
            activeSize={activeSize}
            setActiveSize={setActiveSize}
            sizeOptions={sizeOptions}
            locationId={storeLocationId}
            setLocationId={setStoreLocationId}
            locationOptions={activeLocations.map((location) => ({ id: location.id, name: location.name }))}
            pieceLocationOptions={pieceLocationOptions}
            bulkCodes={bulkCodes}
            setBulkCodes={setBulkCodes}
            addCode={addCode}
            addBulkCodes={addBulkCodes}
            removeCode={removeCode}
            removePair={removePair}
            updateCodeLocation={updateCodeLocation}
            clearRegisteredCodes={clearRegisteredCodes}
            clearAll={clearAll}
            referenceSections={referenceSections}
            stats={stats}
            currentSizeSectionMap={currentSizeSectionMap}
            validationMessage={validationMessage}
            submit={submit}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function EntryScreen({
  mode,
  referenceType,
  setReferenceType,
  selectedReference,
  brand,
  setBrand,
  brandOptions,
  model,
  setModel,
  modelOptions,
  color,
  setColor,
  colorOptions,
  activeSize,
  setActiveSize,
  sizeOptions,
  locationId,
  setLocationId,
  locationOptions,
  pieceLocationOptions,
  bulkCodes,
  setBulkCodes,
  addCode,
  addBulkCodes,
  removeCode,
  removePair,
  updateCodeLocation,
  clearRegisteredCodes,
  clearAll,
  referenceSections,
  stats,
  currentSizeSectionMap,
  validationMessage,
  submit,
}: {
  mode: EntryMode;
  referenceType: ProductType;
  setReferenceType: (value: ProductType) => void;
  selectedReference?: InventoryReference;
  brand: string;
  setBrand: (value: string) => void;
  brandOptions: string[];
  model: string;
  setModel: (value: string) => void;
  modelOptions: string[];
  color: string;
  setColor: (value: string) => void;
  colorOptions: string[];
  activeSize: string;
  setActiveSize: (value: string) => void;
  sizeOptions: string[];
  locationId: string;
  setLocationId: (value: string) => void;
  locationOptions: LocationOption[];
  pieceLocationOptions: LocationOption[];
  bulkCodes: string;
  setBulkCodes: (value: string) => void;
  addCode: (value: string) => void;
  addBulkCodes: () => void;
  removeCode: (code: string) => void;
  removePair: (pairCode: string) => void;
  updateCodeLocation: (unitCode: string, locationId: string) => void;
  clearRegisteredCodes: () => void;
  clearAll: () => void;
  referenceSections: ReferenceSection[];
  stats: EntryStats;
  currentSizeSectionMap: Map<string, SizeSection>;
  validationMessage: string | null;
  submit: () => void;
}) {
  const isStoreMode = mode === "store";
  const isShoe = selectedReference?.type === "zapato";
  const locationLabel = isStoreMode ? "Destino por defecto" : "Almacen destino";
  const hasEntries = referenceSections.length > 0;
  const hasShoeEntries = stats.readyPairs > 0 || stats.incompletePairs > 0 || stats.loosePieces > 0;
  const hasUnitEntries = stats.units > 0;
  const summaryParts = [
    hasShoeEntries ? `${stats.readyPairs} par(es) listos${stats.loosePieces > 0 ? ` y ${stats.loosePieces} pieza(s)` : ""}` : "",
    hasUnitEntries ? `${stats.units} unidad(es) listas` : "",
  ].filter(Boolean);

  return (
    <div className="space-y-4 xl:grid xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:gap-4 xl:space-y-0">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              {isStoreMode ? <Store className="size-3.5" /> : <ArrowDownToLine className="size-3.5" />}
              {isStoreMode ? "Registro en tienda" : "Alta masiva en almacen"}
            </div>
            <h2 className="font-display text-xl font-bold leading-tight">
              {isStoreMode ? "Puedes seguir cargando otros modelos en la misma sesion" : "Puedes armar varios lotes dentro de la misma sesion"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isStoreMode
                ? "Cada codigo conserva la marca, modelo, color y talla que tenia activa cuando lo agregaste."
                : "En almacen puedes cargar varios modelos. Cada codigo queda asociado a su referencia al momento de escanear."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label="Tipo de referencia"
              value={referenceType}
              onValueChange={(value) => setReferenceType(value as ProductType)}
              placeholder="Selecciona tipo"
              options={["zapato", "accesorio"]}
              labels={{ zapato: "Calzado", accesorio: "Accesorio" }}
            />
            {isShoe ? (
              <FieldSelect
                label="Marca"
                value={brand}
                onValueChange={setBrand}
                placeholder="Selecciona marca"
                options={brandOptions}
              />
            ) : (
              <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-3 text-sm font-medium">
                Tipo de accesorio definido desde Maestros
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSelect
              label={isShoe ? "Modelo" : "Tipo de accesorio"}
              value={model}
              onValueChange={setModel}
              placeholder={isShoe ? "Selecciona modelo" : "Selecciona tipo de accesorio"}
              options={modelOptions}
            />
            <FieldSelect
              label="Color"
              value={color}
              onValueChange={setColor}
              placeholder="Selecciona color"
              options={colorOptions}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{locationLabel}</Label>
              {locationOptions.length <= 1 ? (
                <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-3 text-sm font-medium">
                  {locationOptions[0]?.name || "No hay ubicaciones activas"}
                </div>
              ) : (
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {!isShoe && (
              <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-3 text-sm font-medium">
                El tipo de accesorio aparece automaticamente porque ya viene desde Maestros.
              </div>
            )}
          </div>

          <div className="rounded-xl bg-secondary/40 px-3 py-3 text-sm">
            <p className="font-medium">{isShoe ? "Calzado" : "Accesorio"}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Marca y modelo siguen conectados. Lo que cambies ahora solo afecta a los siguientes codigos que agregues.
            </p>
          </div>

          {isStoreMode && isShoe && (
            <div className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Aqui puedes dejar una ubicacion por defecto y luego cambiar el destino de izquierda y derecha por separado en cada par.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              <ScanLine className="size-3.5" />
              Carga del lote
            </div>
            <h2 className="font-display text-xl font-bold leading-tight">
              {isShoe ? `Talla activa: ${activeSize || "Sin elegir"}` : "Escanea unidades"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isShoe
                ? "Todo lo que escanees ahora entra con esa talla. Si lees A00001 o un solo lado, el sistema completa el par."
                : "Cada codigo se registra como una unidad independiente. En accesorio no se acepta el codigo corto: siempre debe venir completo, por ejemplo A00001-D o A00001-I."}
            </p>
          </div>

          {isShoe && (
            <div className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                El codigo corto del par, por ejemplo <span className="font-mono">A00001</span>, solo sirve para agrupar.
                El sistema guarda unicamente <span className="font-mono">A00001-D</span> y <span className="font-mono">A00001-I</span>.
              </p>
            </div>
          )}

          {isShoe && (
            <div className="space-y-2">
              <Label>Tallas del lote</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {sizeOptions.map((sizeOption) => {
                  const section = currentSizeSectionMap.get(sizeOption);
                  return (
                    <Button
                      key={sizeOption}
                      type="button"
                      variant={activeSize === sizeOption ? "default" : "outline"}
                      className="h-auto flex-col items-start gap-1 px-3 py-3 text-left"
                      onClick={() => setActiveSize(sizeOption)}
                    >
                      <span className="text-base font-semibold">{sizeOption}</span>
                      <span className="text-xs opacity-80">{describeScannedSize(sizeOption, section)}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <QRScanner
            onResult={addCode}
            allowPairCodes={isShoe}
            expectedHint={
              isShoe
                ? `Estas cargando talla ${activeSize || "-"}. Si escaneas izquierda o derecha, el sistema arma el par.`
                : "Escanea cada unidad ya etiquetada con su codigo completo, por ejemplo A00001-D."
            }
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Pegar varios codigos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addBulkCodes}>
                <ClipboardPaste className="mr-1 size-4" />
                Agregar lista
              </Button>
            </div>
            <Textarea
              value={bulkCodes}
              onChange={(event) => setBulkCodes(event.target.value)}
              placeholder={isShoe ? "A00001\nA00002-D\nC00003-I" : "A00001-D\nA00001-I\nC00003-I"}
              className="min-h-[112px]"
            />
            <p className="text-sm text-muted-foreground">Puedes separar por salto de linea, coma o espacio.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Package className="size-3.5" />
            Resumen antes de guardar
          </div>
          <h2 className="font-display text-xl font-bold leading-tight">Lote actual</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summaryParts.length > 0 ? `${summaryParts.join(" y ")} para guardar.` : "Aun no hay codigos listos para guardar."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SummaryStat label="Codigos leidos" value={String(stats.scannedCodes)} />
          {hasShoeEntries ? (
            <>
              <SummaryStat label="Pares listos" value={String(stats.readyPairs)} />
              <SummaryStat
                label={mode === "storage" ? "Pares incompletos" : "Piezas sueltas"}
                value={String(mode === "storage" ? stats.incompletePairs : stats.loosePieces)}
              />
            </>
          ) : null}
          {hasUnitEntries ? (
            <SummaryStat label="Unidades listas" value={String(stats.units)} />
          ) : null}
          <SummaryStat label="Ya registrados" value={String(stats.alreadyRegistered)} />
        </div>

        {stats.alreadyRegistered > 0 && (
          <Notice kind="critical" title="Hay codigos ya registrados">
            Quita esos codigos antes de guardar para no duplicar inventario.
          </Notice>
        )}

        {mode === "storage" && hasShoeEntries && stats.incompletePairs > 0 && (
          <Notice kind="warning" title="Todavia hay pares incompletos">
            En almacen solo se guarda el par completo. Completa o quita esos pares antes de continuar.
          </Notice>
        )}

        {mode === "store" && hasShoeEntries && stats.loosePieces > 0 && (
          <Notice kind="warning" title="Hay piezas sueltas">
            Puedes guardarlas asi o completar el par despues. Cada lado puede ir a otra tienda o a almacen.
          </Notice>
        )}

        {validationMessage && hasEntries && (
          <Notice kind="warning" title="Todavia no se puede guardar">
            {validationMessage}
          </Notice>
        )}

        <div className="flex flex-wrap gap-2">
          {stats.alreadyRegistered > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={clearRegisteredCodes}>
              Quitar ya registrados
            </Button>
          )}
          {hasEntries && (
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              Limpiar lote
            </Button>
          )}
        </div>

        {referenceSections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Aun no hay codigos en la lista.
          </div>
        ) : (
          <div className="space-y-4">
            {referenceSections.map((referenceSection) => (
              <div key={referenceSection.key} className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {referenceSection.productType === "zapato" ? "Calzado" : "Accesorio"}
                    </p>
                    <p className="mt-1 text-base font-medium">
                      {referenceSection.brand} · {referenceSection.model}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{referenceSection.color}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {referenceSection.productType === "zapato" ? (
                      <p>
                        {referenceSection.stats.readyPairs} par(es)
                        {referenceSection.stats.loosePieces > 0 ? ` y ${referenceSection.stats.loosePieces} pieza(s)` : ""}
                      </p>
                    ) : (
                      <p>{referenceSection.stats.units} unidad(es)</p>
                    )}
                  </div>
                </div>

                {referenceSection.productType === "zapato" ? (
                  <div className="space-y-3">
                    {referenceSection.sizeSections.map((section) => (
                      <div key={`${referenceSection.key}-${section.size}`} className="space-y-3 rounded-xl border border-border/60 bg-card/70 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Talla {section.size}</p>
                            <p className="mt-1 text-base font-medium">
                              {section.pairCount} par(es){section.loosePieces > 0 ? ` y ${section.loosePieces} pieza(s)` : ""}
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => setActiveSize(section.size)}>
                            Usar esta talla
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {section.pairs.map((pair) => (
                            <PairPreviewCard
                              key={`${referenceSection.key}-${pair.pairCode}`}
                              pair={pair}
                              allowLocationEdit={isStoreMode}
                              locationOptions={pieceLocationOptions}
                              onUpdateCodeLocation={updateCodeLocation}
                              onRemoveCode={removeCode}
                              onRemovePair={removePair}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referenceSection.units.map((item) => (
                      <UnitPreviewCard key={`${referenceSection.key}-${item.unitCode}`} item={item} onRemoveCode={removeCode} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={submit}
          disabled={Boolean(validationMessage)}
          className="h-12 w-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60"
        >
          {validationMessage ? <AlertTriangle className="mr-2 size-4" /> : <CheckCircle2 className="mr-2 size-4" />}
          {buildSubmitLabel(mode, stats)}
        </Button>
      </div>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onValueChange,
  placeholder,
  options,
  labels,
  disabled = false,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: string[];
  labels?: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels?.[option] || option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-medium">{value}</p>
    </div>
  );
}

function Notice({
  kind,
  title,
  children,
}: {
  kind: "warning" | "critical";
  title: string;
  children: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-3">
      <div className="flex items-start gap-3">
        <StatusBadge kind={kind}>{kind === "critical" ? "Atencion" : "Revisar"}</StatusBadge>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
        </div>
      </div>
    </div>
  );
}

function PairPreviewCard({
  pair,
  allowLocationEdit,
  locationOptions,
  onUpdateCodeLocation,
  onRemoveCode,
  onRemovePair,
}: {
  pair: PairPreview;
  allowLocationEdit: boolean;
  locationOptions: LocationOption[];
  onUpdateCodeLocation: (unitCode: string, locationId: string) => void;
  onRemoveCode: (code: string) => void;
  onRemovePair: (pairCode: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Par {pair.pairCode}</p>
          <p className="mt-1 text-base font-medium">Talla {pair.size}</p>
          <p className="mt-1 text-xs text-muted-foreground">Este codigo solo agrupa el par.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusBadge kind={pair.complete ? "success" : "warning"}>
            {pair.complete ? "Completo" : "Incompleto"}
          </StatusBadge>
          {pair.alreadyRegisteredCount > 0 && <StatusBadge kind="critical">Ya existe</StatusBadge>}
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemovePair(pair.pairCode)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <PieceCell
          label="Pie derecha"
          piece={pair.right}
          allowLocationEdit={allowLocationEdit}
          locationOptions={locationOptions}
          onUpdateCodeLocation={onUpdateCodeLocation}
          onRemoveCode={onRemoveCode}
        />
        <PieceCell
          label="Pie izquierda"
          piece={pair.left}
          allowLocationEdit={allowLocationEdit}
          locationOptions={locationOptions}
          onUpdateCodeLocation={onUpdateCodeLocation}
          onRemoveCode={onRemoveCode}
        />
      </div>
    </div>
  );
}

function PieceCell({
  label,
  piece,
  allowLocationEdit,
  locationOptions,
  onUpdateCodeLocation,
  onRemoveCode,
}: {
  label: string;
  piece?: BatchPiecePreview;
  allowLocationEdit: boolean;
  locationOptions: LocationOption[];
  onUpdateCodeLocation: (unitCode: string, locationId: string) => void;
  onRemoveCode: (code: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 break-all font-mono text-sm">{piece?.unitCode || `Falta ${label.toLowerCase()}`}</p>
        </div>
        {piece ? (
          <div className="flex items-center gap-2">
            <StatusBadge kind={piece.alreadyRegistered ? "critical" : "success"}>
              {piece.alreadyRegistered ? "Ya existe" : "Lista"}
            </StatusBadge>
            <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveCode(piece.unitCode)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : (
          <StatusBadge kind="warning">Falta</StatusBadge>
        )}
      </div>

      {piece && allowLocationEdit && (
        <div className="mt-3 space-y-2">
          <Label>Destino</Label>
          <Select value={piece.locationId || ""} onValueChange={(value) => onUpdateCodeLocation(piece.unitCode, value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona destino" />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function UnitPreviewCard({
  item,
  onRemoveCode,
}: {
  item: UnitPreview;
  onRemoveCode: (code: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unidad</p>
          <p className="mt-1 break-all font-mono text-base">{item.unitCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge kind={item.alreadyRegistered ? "critical" : "success"}>
            {item.alreadyRegistered ? "Ya existe" : "Lista"}
          </StatusBadge>
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveCode(item.unitCode)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
