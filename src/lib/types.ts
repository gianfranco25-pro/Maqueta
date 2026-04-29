// Tipos de dominio para KABUTT (prototipo frontend)

export type Role =
  | "admin"
  | "vendedor"
  | "cajero"
  | "almacen";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador general",
  vendedor: "Colaborador",
  cajero: "Caja",
  almacen: "Almacén",
};

const LEGACY_REMOVED_ROLE = ["admin", "istrativo"].join("");
const LEGACY_ROLE_ALIASES: Record<string, Role> = {
  [LEGACY_REMOVED_ROLE]: "cajero",
};

export const coerceRole = (value: unknown): Role | undefined => {
  if (typeof value !== "string") return undefined;
  if (value === "admin" || value === "vendedor" || value === "cajero" || value === "almacen") return value;
  return LEGACY_ROLE_ALIASES[value];
};

export const getUserRoles = (user?: Pick<User, "role" | "roles"> | null): Role[] => {
  if (!user) return [];
  return Array.from(new Set([user.role, ...(user.roles?.length ? user.roles : [])].map(coerceRole).filter(Boolean) as Role[]));
};

export const formatUserRoles = (user?: Pick<User, "role" | "roles"> | null) =>
  getUserRoles(user).map((role) => ROLE_LABELS[role]).join(" + ");

export const SECONDARY_ROLE_COMBINATIONS: Partial<Record<Role, Role[]>> = {
  vendedor: ["almacen"],
};

export const normalizeUserRoles = (user: Pick<User, "role" | "roles">): Role[] => {
  const primary = coerceRole(user.role) || "vendedor";
  const allowedSecondary = SECONDARY_ROLE_COMBINATIONS[primary] || [];
  const selected = getUserRoles(user);
  return [
    primary,
    ...allowedSecondary.filter((role) => selected.includes(role)),
  ];
};

export const operationalRoleFor = (user: Pick<User, "role" | "roles"> | null | undefined, preferred: Role): Role | undefined => {
  if (!user) return undefined;
  const roles = getUserRoles(user);
  return roles.includes(preferred) ? preferred : roles[0];
};

export type LocationType = "tienda" | "puesto" | "deposito" | "almacen" | "otro";

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  tienda: "Tienda",
  puesto: "Tienda",
  deposito: "Deposito",
  almacen: "Almacen",
  otro: "Otro",
};

const STORAGE_LOCATION_TYPES = new Set<LocationType>(["deposito", "almacen"]);

export const isStorageLocation = (location?: Pick<Location, "type"> | null): boolean =>
  Boolean(location && STORAGE_LOCATION_TYPES.has(location.type));

export const isOperationalLocation = (location?: Pick<Location, "type"> | null): boolean =>
  Boolean(location && !isStorageLocation(location));

export const isLocationActive = (location?: Pick<Location, "active"> | null): boolean =>
  location?.active !== false;

export type Location = {
  id: string;
  name: string;
  type: LocationType;
  code?: string;
  address?: string;
  notes?: string;
  active?: boolean;
  createdAt?: string;
};

export type User = {
  id: string;
  name: string;
  dni?: string;
  phone?: string;
  role: Role;
  roles?: Role[];
  locationId: string;
  active: boolean;
  createdAt: string;
};

export type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  locationId: string;
  locationName: string;
  photoDataUrl: string; // base64
  timestamp: string; // sistema
};

export type ProductType = "zapato" | "accesorio";

export type CatalogMasterKind = "brands" | "models" | "colors" | "sizes";

export type CatalogMaster = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
};

export type ModelMaster = CatalogMaster & {
  brandId: string;
};

export type CatalogMasters = {
  brands: CatalogMaster[];
  models: ModelMaster[];
  colors: CatalogMaster[];
  sizes: CatalogMaster[];
};

export type PriceMode = "base" | "talla_exacta" | "rango_tallas";

export type SizePriceRule = {
  id: string;
  label: string;
  minSize?: number;
  maxSize?: number;
  size?: string;
  basePrice: number;
  wholesalePrice: number;
};

export type Product = {
  id: string;
  type: ProductType;
  brand: string;
  model: string;
  color: string;
  size?: string; // talla, solo zapatos
  cost: number;
  basePrice: number;
  wholesalePrice: number;
  maxDiscountSoles: number;
  priceMode?: PriceMode;
  sizePrices?: SizePriceRule[];
  active: boolean;
  createdAt: string;
};

export type PieceSide = "D" | "I"; // derecha / izquierda
export type ItemStatus =
  | "disponible"
  | "vendido"
  | "con_falla"
  | "bloqueado"
  | "reservado";

// Para zapatos: un "par" agrupa dos piezas. Para accesorios: una unidad simple.
export type InventoryItem = {
  id: string;
  productId: string;
  // Para zapatos
  pairCode?: string; // ej "A00001"
  side?: PieceSide; // D o I, omitido en accesorios
  // Común
  unitCode: string; // zapatos: "A00001-D", accesorios: "B00001"
  status: ItemStatus;
  locationId: string;
  responsibleUserId?: string;
  responsibleName?: string;
  notes?: string;
  createdAt: string;
};

export type MovementType =
  | "ingreso"
  | "traslado"
  | "entrega"
  | "venta"
  | "falla"
  | "ajuste"
  | "devolucion";

export type Movement = {
  id: string;
  type: MovementType;
  unitCodes: string[];
  fromLocationId?: string;
  toLocationId?: string;
  byUserId: string;
  byUserName: string;
  byUserRole?: Role;
  receivedBy?: string; // nombre libre, "otros"
  reason?: string;
  timestamp: string;
};

export type PaymentMethod = "efectivo" | "transferencia" | "yape_plin" | "tarjeta";

export type PaymentSplit = {
  method: PaymentMethod;
  amount: number; // monto base sin recargo
  surcharge?: number; // recargo aplicado (solo tarjeta)
};

export type SaleLine = {
  productId: string;
  productLabel: string;
  unitCode: string; // par o unidad
  cost: number;
  basePrice: number;
  finalPrice: number;
  discount: number; // basePrice - finalPrice (positivo si rebaja)
  maxDiscountSoles?: number;
  utility: number;
  isPair: boolean;
};

export type Sale = {
  id: string;
  code: string; // V-0001
  sellerId: string;
  sellerName: string;
  sellerRole?: Role;
  cashierId?: string;
  cashierRole?: Role;
  locationId: string;
  customerPhone?: string;
  lines: SaleLine[];
  subtotal: number; // suma finalPrice
  totalSurcharge: number;
  total: number; // subtotal + recargo
  payments: PaymentSplit[];
  commissionPerPair?: number;
  commissionTotal?: number;
  utilityTotal?: number;
  authorizedById?: string; // si requirió autorización por descuento
  status: "pendiente_cobro" | "confirmada" | "anulada" | "corregida";
  voidReason?: string;
  timestamp: string; // creación
  paidAt?: string; // confirmación de cobro
  paidByCashierId?: string;
  paidByCashierName?: string;
  paidByCashierRole?: Role;
};

export type AdvanceRecord = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  reason: string;
  paymentDate?: string;
  byUserId: string;
  byUserName: string;
  timestamp: string;
};

export type AfterSale = {
  id: string;
  type: "cambio" | "compra_error" | "correccion" | "anulacion";
  saleId: string;
  saleCode: string;
  byUserId: string;
  byUserName: string;
  byUserRole?: Role;
  reason: string;
  diff?: number; // diferencia de precio en cambios
  timestamp: string;
};

export type AuthorizationRequest = {
  id: string;
  type: "descuento_excedido" | "anulacion" | "correccion" | "otro";
  requestedBy: string;
  requestedByName: string;
  detail: string;
  amount?: number;
  status: "pendiente" | "aprobada" | "rechazada";
  resolvedBy?: string;
  resolvedAt?: string;
  timestamp: string;
};

export type AppSettings = {
  maxDiscountSoles: number; // descuento máx para colaborador en S/
  cardSurchargePct: number; // % recargo tarjeta
  commissionPerPair: number; // S/ por par vendido
  lowStockThreshold: number;
  paymentPolicy: string;
};

export type Counters = {
  pairSeq: number; // siguiente número para zapatos (A00001)
  accSeq: number; // siguiente número para accesorios (B00001)
  saleSeq: number;
};
