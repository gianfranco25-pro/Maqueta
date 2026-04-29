import type {
  AppSettings,
  AttendanceRecord,
  AuthorizationRequest,
  CatalogMasters,
  Counters,
  InventoryItem,
  Location,
  Movement,
  Product,
  Sale,
  AfterSale,
  User,
} from "./types";

const now = () => new Date().toISOString();

export const initialLocations: Location[] = [
  { id: "loc-tienda-centro", name: "Tienda Centro", type: "tienda", code: "T-01", active: true, createdAt: now() },
  { id: "loc-puesto-mall", name: "Tienda Mall Plaza", type: "tienda", code: "T-02", active: true, createdAt: now() },
  { id: "loc-deposito-principal", name: "Deposito Principal", type: "deposito", code: "D-01", active: true, createdAt: now() },
  { id: "loc-almacen", name: "Almacen Central", type: "almacen", code: "A-01", active: true, createdAt: now() },
];

export const initialUsers: User[] = [
  { id: "u-admin", name: "Carla Admin", role: "admin", locationId: "loc-tienda-centro", active: true, createdAt: now(), dni: "70000001", phone: "987000001" },
  { id: "u-vend-1", name: "Luis Colaborador", role: "vendedor", locationId: "loc-tienda-centro", active: true, createdAt: now(), dni: "70000002", phone: "987000002" },
  { id: "u-vend-2", name: "Ana Colaboradora", role: "vendedor", locationId: "loc-puesto-mall", active: true, createdAt: now(), dni: "70000003", phone: "987000003" },
  { id: "u-vend-almacen", name: "Rosa Colaborador Almacén", role: "vendedor", roles: ["vendedor", "almacen"], locationId: "loc-almacen", active: true, createdAt: now(), dni: "70000007", phone: "987000007" },
  { id: "u-cajero", name: "María Caja", role: "cajero", locationId: "loc-tienda-centro", active: true, createdAt: now(), dni: "70000004", phone: "987000004" },
  { id: "u-almacen", name: "Pedro Almacén", role: "almacen", locationId: "loc-almacen", active: true, createdAt: now(), dni: "70000005", phone: "987000005" },
  { id: "u-caja-2", name: "Sofia Caja", role: "cajero", locationId: "loc-tienda-centro", active: true, createdAt: now(), dni: "70000006", phone: "987000006" },
];

export const initialCatalogMasters: CatalogMasters = {
  brands: [
    { id: "brand-bruno-magli", name: "Bruno Magli", active: true, createdAt: now() },
    { id: "brand-aldo", name: "Aldo", active: true, createdAt: now() },
    { id: "brand-renzo-costa", name: "Renzo Costa", active: true, createdAt: now() },
    { id: "brand-punto-blanco", name: "Punto Blanco", active: true, createdAt: now() },
  ],
  models: [
    { id: "model-oxford-classic", brandId: "brand-bruno-magli", name: "Oxford Classic", active: true, createdAt: now() },
    { id: "model-derby-premium", brandId: "brand-aldo", name: "Derby Premium", active: true, createdAt: now() },
    { id: "model-mocasin-italia", brandId: "brand-renzo-costa", name: "Mocasín Italia", active: true, createdAt: now() },
    { id: "model-correa-cuero-clasica", brandId: "brand-renzo-costa", name: "Correa cuero clásica", active: true, createdAt: now() },
    { id: "model-medias-vestir", brandId: "brand-punto-blanco", name: "Medias de vestir", active: true, createdAt: now() },
  ],
  colors: [
    { id: "color-negro", name: "Negro", active: true, createdAt: now() },
    { id: "color-marron", name: "Marrón", active: true, createdAt: now() },
    { id: "color-cafe", name: "Café", active: true, createdAt: now() },
  ],
  sizes: ["38", "39", "40", "41", "42", "43"].map((size) => ({
    id: `size-${size}`,
    name: size,
    active: true,
    createdAt: now(),
  })),
};

export const initialProducts: Product[] = [
  { id: "p-1", type: "zapato", brand: "Bruno Magli", model: "Oxford Classic", color: "Negro", size: "41", cost: 180, basePrice: 320, wholesalePrice: 260, maxDiscountSoles: 30, priceMode: "rango_tallas", sizePrices: [
    { id: "sp-1a", label: "Tallas 38-40", minSize: 38, maxSize: 40, basePrice: 300, wholesalePrice: 245 },
    { id: "sp-1b", label: "Tallas 41-43", minSize: 41, maxSize: 43, basePrice: 320, wholesalePrice: 260 },
  ], active: true, createdAt: now() },
  { id: "p-2", type: "zapato", brand: "Aldo", model: "Derby Premium", color: "Marrón", size: "42", cost: 150, basePrice: 280, wholesalePrice: 230, maxDiscountSoles: 25, priceMode: "talla_exacta", sizePrices: [
    { id: "sp-2a", label: "Talla 41", size: "41", basePrice: 270, wholesalePrice: 220 },
    { id: "sp-2b", label: "Talla 42", size: "42", basePrice: 280, wholesalePrice: 230 },
  ], active: true, createdAt: now() },
  { id: "p-3", type: "zapato", brand: "Renzo Costa", model: "Mocasín Italia", color: "Café", size: "40", cost: 210, basePrice: 350, wholesalePrice: 290, maxDiscountSoles: 35, priceMode: "base", active: true, createdAt: now() },
  { id: "p-4", type: "accesorio", brand: "Renzo Costa", model: "Correa cuero clásica", color: "Negro", cost: 42, basePrice: 90, wholesalePrice: 65, maxDiscountSoles: 10, active: true, createdAt: now() },
  { id: "p-5", type: "accesorio", brand: "Punto Blanco", model: "Medias de vestir", color: "Negro", cost: 11, basePrice: 25, wholesalePrice: 18, maxDiscountSoles: 5, active: true, createdAt: now() },
];

// Genera códigos: zapatos A00001 + sufijo D/I, accesorios B00001
function pad(n: number, len = 5) {
  return String(n).padStart(len, "0");
}

export function buildInitialInventory(): { items: InventoryItem[]; counters: Counters } {
  const items: InventoryItem[] = [];
  let pairSeq = 1;
  let accSeq = 1;

  // 4 pares por modelo de zapato, 6 unidades por accesorio
  const shoeProducts = initialProducts.filter((p) => p.type === "zapato");
  const accProducts = initialProducts.filter((p) => p.type === "accesorio");

  shoeProducts.forEach((p) => {
    for (let i = 0; i < 4; i++) {
      const code = `A${pad(pairSeq++)}`;
      const loc = i < 1 ? "loc-tienda-centro" : i < 2 ? "loc-puesto-mall" : "loc-almacen";
      items.push({
        id: `inv-${code}-D`,
        productId: p.id,
        pairCode: code,
        side: "D",
        unitCode: `${code}-D`,
        status: "disponible",
        locationId: loc,
        createdAt: now(),
      });
      items.push({
        id: `inv-${code}-I`,
        productId: p.id,
        pairCode: code,
        side: "I",
        unitCode: `${code}-I`,
        status: "disponible",
        locationId: loc,
        createdAt: now(),
      });
    }
  });

  accProducts.forEach((p) => {
    for (let i = 0; i < 6; i++) {
      const code = `B${pad(accSeq++)}`;
      const loc = i < 2 ? "loc-tienda-centro" : i < 4 ? "loc-puesto-mall" : "loc-almacen";
      items.push({
        id: `inv-${code}`,
        productId: p.id,
        unitCode: code,
        status: "disponible",
        locationId: loc,
        createdAt: now(),
      });
    }
  });

  return { items, counters: { pairSeq, accSeq, saleSeq: 1 } };
}

export const initialSettings: AppSettings = {
  maxDiscountSoles: 30,
  cardSurchargePct: 5,
  commissionPerPair: 2,
  lowStockThreshold: 3,
  paymentPolicy: "Liquidacion semanal: se descuentan todos los adelantos registrados; si superan la comision, el pago queda en S/ 0 y el saldo se descuenta luego.",
};

export const initialMovements: Movement[] = [];
export const initialSales: Sale[] = [];
export const initialAfterSales: AfterSale[] = [];
export const initialAttendance: AttendanceRecord[] = [];
export const initialAuthorizations: AuthorizationRequest[] = [];

export { pad };
