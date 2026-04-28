// Tipos de dominio para KABUTT (prototipo frontend)

export type Role =
  | "admin"
  | "vendedor"
  | "cajero"
  | "almacen"
  | "administrativo";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  cajero: "Cajero",
  almacen: "Almacén",
  administrativo: "Administrativo",
};

export const getUserRoles = (user?: Pick<User, "role" | "roles"> | null): Role[] => {
  if (!user) return [];
  return Array.from(new Set(user.roles?.length ? user.roles : [user.role]));
};

export const formatUserRoles = (user?: Pick<User, "role" | "roles"> | null) =>
  getUserRoles(user).map((role) => ROLE_LABELS[role]).join(" + ");

export const operationalRoleFor = (user: Pick<User, "role" | "roles"> | null | undefined, preferred: Role): Role | undefined => {
  if (!user) return undefined;
  const roles = getUserRoles(user);
  return roles.includes(preferred) ? preferred : roles[0];
};

export type Location = {
  id: string;
  name: string;
  type: "tienda" | "puesto" | "almacen";
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
  basePrice: number;
  wholesalePrice: number;
  priceMode?: PriceMode;
  sizePrices?: SizePriceRule[];
  active: boolean;
  createdAt: string;
};

export type PieceSide = "D" | "I"; // derecha / izquierda
export type ItemStatus =
  | "disponible"
  | "vendido"
  | "muestra"
  | "con_falla"
  | "trasladado"
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
  notes?: string;
  createdAt: string;
};

export type MovementType =
  | "ingreso"
  | "traslado"
  | "entrega"
  | "venta"
  | "muestra"
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
  basePrice: number;
  finalPrice: number;
  discount: number; // basePrice - finalPrice (positivo si rebaja)
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
  authorizedById?: string; // si requirió autorización por descuento
  status: "pendiente_cobro" | "confirmada" | "anulada" | "corregida";
  voidReason?: string;
  timestamp: string; // creación
  paidAt?: string; // confirmación de cobro
  paidByCashierId?: string;
  paidByCashierName?: string;
  paidByCashierRole?: Role;
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
  maxDiscountSoles: number; // descuento máx para vendedor en S/
  cardSurchargePct: number; // % recargo tarjeta
  commissionPerPair: number; // S/ por par vendido
  lowStockThreshold: number;
};

export type Counters = {
  pairSeq: number; // siguiente número para zapatos (A00001)
  accSeq: number; // siguiente número para accesorios (B00001)
  saleSeq: number;
};
