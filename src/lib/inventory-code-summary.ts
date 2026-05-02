import type { InventoryItem, ItemStatus, Location, Product } from "./types";

export type PairSelectionMode = "both" | "D" | "I";

export type CodePiece = {
  label: string;
  unitCode: string;
  available: boolean;
  exists: boolean;
  selected?: boolean;
  locationName?: string;
  responsibleName?: string;
  status?: ItemStatus;
};

export type CodeSummary = {
  key: string;
  rawCode: string;
  mainCode: string;
  title: string;
  pieces: CodePiece[];
  productLabel?: string;
  locationName?: string;
  responsibleName?: string;
};

const PAIR_CODE_PATTERN = /^[A-Z]\d{5}$/;
const SHOE_UNIT_CODE_PATTERN = /^[A-Z]\d{5}-(D|I)$/;

const isPairCode = (value: string) => PAIR_CODE_PATTERN.test(value.trim().toUpperCase());
const isShoeUnitCode = (value: string) => SHOE_UNIT_CODE_PATTERN.test(value.trim().toUpperCase());

const productLabelFor = (product?: Product) => {
  if (!product) return undefined;
  const parts = [product.brand, product.model];
  if (product.color) parts.push(product.color);
  if (product.size) parts.push(`Talla ${product.size}`);
  return parts.join(" · ");
};

const locationNameFor = (locationId: string | undefined, locations: Location[]) =>
  locations.find((location) => location.id === locationId)?.name;

const sharedResponsibleNameFor = (items: Array<InventoryItem | undefined>) => {
  const presentItems = items.filter(Boolean) as InventoryItem[];
  if (presentItems.length === 0) return undefined;
  const firstResponsible = presentItems[0]?.responsibleName?.trim();
  if (!firstResponsible) return undefined;
  return presentItems.every((item) => item.responsibleName?.trim() === firstResponsible)
    ? firstResponsible
    : undefined;
};

const sideLabelFor = (side: InventoryItem["side"]) =>
  side === "D" ? "Derecha" : side === "I" ? "Izquierda" : "Unidad";

const isOperableStatus = (status: InventoryItem["status"] | undefined) =>
  status === "disponible" || status === "con_falla";

const buildCodePiece = (
  label: string,
  unitCode: string,
  item: InventoryItem | undefined,
  locations: Location[],
  selected = false
): CodePiece => ({
  label,
  unitCode,
  available: isOperableStatus(item?.status),
  exists: Boolean(item),
  selected,
  locationName: item ? locationNameFor(item.locationId, locations) : undefined,
  responsibleName: item?.responsibleName,
  status: item?.status,
});

const buildUnitSummary = (
  rawCode: string,
  item: InventoryItem | undefined,
  product: Product | undefined,
  locations: Location[]
): CodeSummary => {
  if (!item) {
    return {
      key: rawCode,
      rawCode,
      mainCode: rawCode,
      title: "Codigo",
      pieces: [{ label: "Codigo", unitCode: rawCode, available: false, exists: false }],
    };
  }

  if (item.pairCode) {
    return {
      key: item.unitCode,
      rawCode,
      mainCode: item.pairCode,
      title: `Pieza ${sideLabelFor(item.side).toLowerCase()}`,
      pieces: [buildCodePiece(sideLabelFor(item.side), item.unitCode, item, locations, true)],
      productLabel: productLabelFor(product),
      locationName: locationNameFor(item.locationId, locations),
      responsibleName: item.responsibleName,
    };
  }

  return {
    key: item.unitCode,
    rawCode,
    mainCode: item.unitCode,
    title: "Unidad",
    pieces: [buildCodePiece("Unidad", item.unitCode, item, locations, true)],
    productLabel: productLabelFor(product),
    locationName: locationNameFor(item.locationId, locations),
    responsibleName: item.responsibleName,
  };
};

export const summarizeSelectionCodes = (
  codes: string[],
  inventory: InventoryItem[],
  products: Product[],
  locations: Location[],
  pairModes: Record<string, PairSelectionMode> = {}
): CodeSummary[] =>
  codes.map((raw) => {
    const code = raw.trim().toUpperCase();

    if (isPairCode(code) && inventory.some((item) => item.pairCode === code)) {
      const right = inventory.find((item) => item.unitCode === `${code}-D`);
      const left = inventory.find((item) => item.unitCode === `${code}-I`);
      const sample = right || left;
      const product = sample ? products.find((entry) => entry.id === sample.productId) : undefined;
      const mode = pairModes[code] || "both";

      return {
        key: code,
        rawCode: code,
        mainCode: code,
        title: "Par",
        pieces: [
          buildCodePiece("Derecha", `${code}-D`, right, locations, isOperableStatus(right?.status) && (mode === "both" || mode === "D")),
          buildCodePiece("Izquierda", `${code}-I`, left, locations, isOperableStatus(left?.status) && (mode === "both" || mode === "I")),
        ],
        productLabel: productLabelFor(product),
        locationName:
          right?.locationId && left?.locationId && right.locationId === left.locationId
            ? locationNameFor(right.locationId, locations)
            : locationNameFor(sample?.locationId, locations),
        responsibleName: sharedResponsibleNameFor([right, left]),
      };
    }

    const item = inventory.find((entry) => entry.unitCode === code);
    const product = item ? products.find((entry) => entry.id === item.productId) : undefined;
    return buildUnitSummary(code, item, product, locations);
  });

export const summarizeMovementUnitCodes = (
  unitCodes: string[],
  inventory: InventoryItem[],
  products: Product[],
  locations: Location[]
): CodeSummary[] => {
  const pairGroups = new Map<string, { order: number; items: InventoryItem[] }>();
  const looseUnits: Array<{ order: number; summary: CodeSummary }> = [];

  unitCodes.forEach((unitCode, index) => {
    const code = unitCode.trim().toUpperCase();
    const item = inventory.find((entry) => entry.unitCode === code);
    const product = item ? products.find((entry) => entry.id === item.productId) : undefined;

    if (!item || !item.pairCode) {
      looseUnits.push({
        order: index,
        summary: buildUnitSummary(code, item, product, locations),
      });
      return;
    }

    const group = pairGroups.get(item.pairCode) || { order: index, items: [] };
    group.items.push(item);
    pairGroups.set(item.pairCode, group);
  });

  const pairSummaries = Array.from(pairGroups.entries()).map(([pairCode, group]) => {
    const right = group.items.find((item) => item.side === "D");
    const left = group.items.find((item) => item.side === "I");
    const presentItems = [right, left].filter(Boolean) as InventoryItem[];
    const product = presentItems[0] ? products.find((entry) => entry.id === presentItems[0].productId) : undefined;

    return {
      order: group.order,
        summary: {
          key: pairCode,
          rawCode: pairCode,
          mainCode: pairCode,
          title: presentItems.length === 2 ? "Par completo" : `Pieza ${sideLabelFor(presentItems[0]?.side).toLowerCase()}`,
          pieces: presentItems.map((item) => buildCodePiece(sideLabelFor(item.side), item.unitCode, item, locations, true)),
          productLabel: productLabelFor(product),
          locationName:
            presentItems.length > 0 && presentItems.every((item) => item.locationId === presentItems[0]?.locationId)
              ? locationNameFor(presentItems[0]?.locationId, locations)
              : locationNameFor(presentItems[0]?.locationId, locations),
          responsibleName: sharedResponsibleNameFor(presentItems),
        },
      };
  });

  return [...pairSummaries, ...looseUnits]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.summary);
};

export const normalizeInventoryOperationCode = (
  rawCode: string,
  inventory: InventoryItem[]
): string => {
  const code = rawCode.trim().toUpperCase();

  if (isPairCode(code)) {
    if (inventory.some((item) => item.pairCode === code)) return code;
    const unitItem = inventory.find((item) => item.unitCode === code);
    if (unitItem) {
      if (!isOperableStatus(unitItem.status)) throw new Error("La unidad no esta disponible para esta operacion.");
      return code;
    }
    throw new Error("Codigo no existe");
  }

  if (isShoeUnitCode(code)) {
    const item = inventory.find((entry) => entry.unitCode === code);
    if (!item) throw new Error("Codigo no existe");
    if (!item.pairCode) {
      if (!isOperableStatus(item.status)) throw new Error("La unidad no esta disponible para esta operacion.");
      return code;
    }
    return normalizeInventoryOperationCode(item.pairCode, inventory);
  }

  const item = inventory.find((entry) => entry.unitCode === code);
  if (!item) throw new Error("Codigo no existe");
  if (!isOperableStatus(item.status)) throw new Error("La unidad no esta disponible para esta operacion.");
  return code;
};

export const pairSelectionModeFromRawCode = (rawCode: string): PairSelectionMode => {
  const code = rawCode.trim().toUpperCase();
  if (code.endsWith("-D")) return "D";
  if (code.endsWith("-I")) return "I";
  return "both";
};

export const mergePairSelectionModes = (
  currentMode: PairSelectionMode | undefined,
  incomingMode: PairSelectionMode
): PairSelectionMode => {
  if (!currentMode) return incomingMode;
  if (currentMode === incomingMode) return currentMode;
  return "both";
};

export const expandSelectionCodes = (
  codes: string[],
  inventory: InventoryItem[],
  pairModes: Record<string, PairSelectionMode> = {}
): string[] =>
  codes.flatMap((rawCode) => {
    const code = rawCode.trim().toUpperCase();

    if (!isPairCode(code) || !inventory.some((item) => item.pairCode === code)) return [code];

    const right = inventory.find((item) => item.unitCode === `${code}-D`);
    const left = inventory.find((item) => item.unitCode === `${code}-I`);
    const mode = pairModes[code] || "both";

    if (mode === "both") {
      if (!right || !left) throw new Error("Para mover ambos lados, el par debe tener derecha e izquierda.");
      return [right.unitCode, left.unitCode];
    }

    if (mode === "D") {
      if (!right) throw new Error("No existe la pieza derecha de este par.");
      return [right.unitCode];
    }

    if (!left) throw new Error("No existe la pieza izquierda de este par.");
    return [left.unitCode];
  });
