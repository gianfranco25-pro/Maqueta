import type {
  AppSettings,
  AttendanceRecord,
  AuthorizationRequest,
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
  { id: "loc-tienda-centro", name: "Tienda Centro", type: "tienda" },
  { id: "loc-puesto-mall", name: "Puesto Mall Plaza", type: "puesto" },
  { id: "loc-almacen", name: "Almacén Principal", type: "almacen" },
];

export const initialUsers: User[] = [
  { id: "u-admin", name: "Carla Admin", role: "admin", locationId: "loc-tienda-centro", active: true, createdAt: now(), dni: "70000001", phone: "987000001" },
  { id: "u-vend-1", name: "Luis Vendedor", role: "vendedor", locationId: "loc-tienda-centro", active: true, createdAt: now(), dni: "70000002", phone: "987000002" },
  { id: "u-vend-2", name: "Ana Vendedora", role: "vendedor", locationId: "loc-puesto-mall", active: true, createdAt: now(), dni: "70000003", phone: "987000003" },
  { id: "u-cajero", name: "María Cajera", role: "cajero", locationId: "loc-tienda-centro", active: true, createdAt: now(), dni: "70000004", phone: "987000004" },
  { id: "u-almacen", name: "Pedro Almacén", role: "almacen", locationId: "loc-almacen", active: true, createdAt: now(), dni: "70000005", phone: "987000005" },
  { id: "u-adm", name: "Sofía Administrativo", role: "administrativo", locationId: "loc-tienda-centro", active: true, createdAt: now(), dni: "70000006", phone: "987000006" },
];

export const initialProducts: Product[] = [
  { id: "p-1", type: "zapato", brand: "Bruno Magli", model: "Oxford Classic", color: "Negro", size: "41", basePrice: 320, wholesalePrice: 260, active: true, createdAt: now() },
  { id: "p-2", type: "zapato", brand: "Aldo", model: "Derby Premium", color: "Marrón", size: "42", basePrice: 280, wholesalePrice: 230, active: true, createdAt: now() },
  { id: "p-3", type: "zapato", brand: "Renzo Costa", model: "Mocasín Italia", color: "Café", size: "40", basePrice: 350, wholesalePrice: 290, active: true, createdAt: now() },
  { id: "p-4", type: "accesorio", brand: "Renzo Costa", model: "Correa cuero clásica", color: "Negro", basePrice: 90, wholesalePrice: 65, active: true, createdAt: now() },
  { id: "p-5", type: "accesorio", brand: "Punto Blanco", model: "Medias de vestir", color: "Negro", basePrice: 25, wholesalePrice: 18, active: true, createdAt: now() },
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
};

export const initialMovements: Movement[] = [];
export const initialSales: Sale[] = [];
export const initialAfterSales: AfterSale[] = [];
export const initialAttendance: AttendanceRecord[] = [];
export const initialAuthorizations: AuthorizationRequest[] = [];

export { pad };
