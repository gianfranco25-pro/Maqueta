import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  buildInitialInventory,
  initialAfterSales,
  initialAttendance,
  initialAuthorizations,
  initialLocations,
  initialMovements,
  initialProducts,
  initialSales,
  initialSettings,
  initialUsers,
  pad,
} from "./mockData";
import type {
  AfterSale,
  AppSettings,
  AttendanceRecord,
  AuthorizationRequest,
  Counters,
  InventoryItem,
  ItemStatus,
  Location,
  Movement,
  Product,
  Role,
  Sale,
  User,
} from "./types";

const initialInv = buildInitialInventory();

const expandOperationalCodes = (rawCodes: string[], inventory: InventoryItem[]) => {
  const expanded = rawCodes.flatMap((raw) => {
    const code = raw.trim().toUpperCase();
    if (/^A\d{5}$/.test(code)) return [`${code}-D`, `${code}-I`];
    return [code];
  });
  return Array.from(new Set(expanded));
};

const getValidatedAvailableItems = (rawCodes: string[], inventory: InventoryItem[]) => {
  const unitCodes = expandOperationalCodes(rawCodes, inventory);
  const items = unitCodes.map((code) => inventory.find((i) => i.unitCode === code));
  const missing = unitCodes.filter((_, index) => !items[index]);
  if (missing.length) throw new Error(`Código no existe: ${missing.join(", ")}`);

  const unavailable = items.filter((item): item is InventoryItem => Boolean(item) && item.status !== "disponible");
  if (unavailable.length) {
    throw new Error(`No disponible: ${unavailable.map((i) => i.unitCode).join(", ")}`);
  }

  return { unitCodes, items: items as InventoryItem[] };
};

type State = {
  // Sesión simulada
  currentUserId: string;

  // Catálogos
  locations: Location[];
  users: User[];
  products: Product[];
  inventory: InventoryItem[];

  // Operación
  attendance: AttendanceRecord[];
  movements: Movement[];
  sales: Sale[];
  afterSales: AfterSale[];
  authorizations: AuthorizationRequest[];

  // Configuración
  settings: AppSettings;
  counters: Counters;
};

type Actions = {
  setCurrentUser: (id: string) => void;
  switchToFirstUserOfRole: (role: Role) => void;

  // Users
  addUser: (u: Omit<User, "id" | "createdAt">) => User;
  updateUser: (id: string, patch: Partial<User>) => void;
  toggleUserActive: (id: string) => void;

  // Locations
  addLocation: (l: Omit<Location, "id">) => Location;

  // Attendance
  addAttendance: (a: Omit<AttendanceRecord, "id" | "timestamp">) => void;

  // Products
  addProduct: (p: Omit<Product, "id" | "createdAt">) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;

  // Inventory
  addShoePair: (productId: string, locationId: string) => { pairCode: string };
  addAccessoryUnits: (productId: string, locationId: string, qty: number) => string[];
  updateItemStatus: (unitCode: string, status: ItemStatus, notes?: string) => void;
  transferItems: (unitCodes: string[], toLocationId: string, byUserId: string, byUserName: string, byUserRole?: Role, receivedBy?: string) => void;
  deliverFromWarehouse: (unitCodes: string[], byUserId: string, byUserName: string, byUserRole?: Role, receivedBy?: string) => void;
  markAsSample: (unitCode: string) => void;
  markAsFault: (unitCode: string, reason: string, byUserId: string, byUserName: string, byUserRole?: Role) => void;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Sales
  createDraftSale: (sale: Omit<Sale, "id" | "code" | "timestamp" | "status">) => Sale;
  confirmSalePayment: (saleId: string, payments: import("./types").PaymentSplit[], totalSurcharge: number, total: number, cashierId: string, cashierName: string, cashierRole?: Role) => Sale | undefined;
  cancelDraftSale: (saleId: string, reason: string) => void;
  voidSale: (saleId: string, reason: string, byUserId: string, byUserName: string, byUserRole?: Role) => void;

  // After-sales
  registerExchange: (saleId: string, oldUnitCode: string, newUnitCode: string, diff: number, byUserId: string, byUserName: string, byUserRole: Role | undefined, reason: string) => void;
  registerWrongPurchase: (saleId: string, reason: string, byUserId: string, byUserName: string, byUserRole?: Role) => void;

  // Authorizations
  requestAuthorization: (req: Omit<AuthorizationRequest, "id" | "timestamp" | "status">) => AuthorizationRequest;
  resolveAuthorization: (id: string, approve: boolean, byUserId: string) => void;

  // Util
  resetData: () => void;
};

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      currentUserId: "u-admin",
      locations: initialLocations,
      users: initialUsers,
      products: initialProducts,
      inventory: initialInv.items,
      counters: initialInv.counters,
      attendance: initialAttendance,
      movements: initialMovements,
      sales: initialSales,
      afterSales: initialAfterSales,
      authorizations: initialAuthorizations,
      settings: initialSettings,

      setCurrentUser: (id) => set({ currentUserId: id }),
      switchToFirstUserOfRole: (role) => {
        const u = get().users.find((x) => (x.roles?.includes(role) || x.role === role) && x.active);
        if (u) set({ currentUserId: u.id });
      },

      addUser: (u) => {
        const user: User = { ...u, id: `u-${Date.now()}`, createdAt: new Date().toISOString() };
        set({ users: [...get().users, user] });
        return user;
      },
      updateUser: (id, patch) =>
        set({ users: get().users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }),
      toggleUserActive: (id) =>
        set({ users: get().users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)) }),

      addLocation: (l) => {
        const loc: Location = { ...l, id: `loc-${Date.now()}` };
        set({ locations: [...get().locations, loc] });
        return loc;
      },

      addAttendance: (a) => {
        const rec: AttendanceRecord = {
          ...a,
          id: `att-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
        set({ attendance: [rec, ...get().attendance] });
      },

      addProduct: (p) => {
        const prod: Product = { ...p, id: `p-${Date.now()}`, createdAt: new Date().toISOString() };
        set({ products: [...get().products, prod] });
        return prod;
      },
      updateProduct: (id, patch) =>
        set({ products: get().products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),

      addShoePair: (productId, locationId) => {
        const c = { ...get().counters };
        const pairCode = `A${pad(c.pairSeq)}`;
        c.pairSeq += 1;
        const t = new Date().toISOString();
        const items: InventoryItem[] = [
          { id: `inv-${pairCode}-D`, productId, pairCode, side: "D", unitCode: `${pairCode}-D`, status: "disponible", locationId, createdAt: t },
          { id: `inv-${pairCode}-I`, productId, pairCode, side: "I", unitCode: `${pairCode}-I`, status: "disponible", locationId, createdAt: t },
        ];
        const mv: Movement = {
          id: `mv-${Date.now()}`,
          type: "ingreso",
          unitCodes: items.map((i) => i.unitCode),
          toLocationId: locationId,
          byUserId: get().currentUserId,
          byUserName: get().users.find((u) => u.id === get().currentUserId)?.name || "—",
          byUserRole: get().users.find((u) => u.id === get().currentUserId)?.role,
          timestamp: t,
        };
        set({ inventory: [...get().inventory, ...items], counters: c, movements: [mv, ...get().movements] });
        return { pairCode };
      },
      addAccessoryUnits: (productId, locationId, qty) => {
        const c = { ...get().counters };
        const t = new Date().toISOString();
        const newItems: InventoryItem[] = [];
        const codes: string[] = [];
        for (let i = 0; i < qty; i++) {
          const code = `B${pad(c.accSeq)}`;
          c.accSeq += 1;
          newItems.push({ id: `inv-${code}`, productId, unitCode: code, status: "disponible", locationId, createdAt: t });
          codes.push(code);
        }
        const mv: Movement = {
          id: `mv-${Date.now()}`,
          type: "ingreso",
          unitCodes: codes,
          toLocationId: locationId,
          byUserId: get().currentUserId,
          byUserName: get().users.find((u) => u.id === get().currentUserId)?.name || "—",
          byUserRole: get().users.find((u) => u.id === get().currentUserId)?.role,
          timestamp: t,
        };
        set({ inventory: [...get().inventory, ...newItems], counters: c, movements: [mv, ...get().movements] });
        return codes;
      },

      updateItemStatus: (unitCode, status, notes) =>
        set({
          inventory: get().inventory.map((i) =>
            i.unitCode === unitCode ? { ...i, status, notes: notes ?? i.notes } : i
          ),
        }),

      transferItems: (rawCodes, toLocationId, byUserId, byUserName, byUserRole, receivedBy) => {
        const inventory = get().inventory;
        const { unitCodes, items } = getValidatedAvailableItems(rawCodes, inventory);
        const fromLocationId = items[0]?.locationId;

        if (!toLocationId) throw new Error("Selecciona una ubicación destino");
        if (items.some((i) => i.locationId !== fromLocationId)) {
          throw new Error("Todos los ítems deben salir de la misma ubicación");
        }
        if (fromLocationId === toLocationId) throw new Error("El destino debe ser distinto al origen");

        const inv = inventory.map((i) =>
          unitCodes.includes(i.unitCode) ? { ...i, locationId: toLocationId, status: "disponible" as ItemStatus } : i
        );
        const mv: Movement = {
          id: `mv-${Date.now()}`,
          type: "traslado",
          unitCodes,
          fromLocationId,
          toLocationId,
          byUserId,
          byUserName,
          byUserRole,
          receivedBy,
          timestamp: new Date().toISOString(),
        };
        set({ inventory: inv, movements: [mv, ...get().movements] });
      },

      deliverFromWarehouse: (rawCodes, byUserId, byUserName, byUserRole, receivedBy) => {
        const inventory = get().inventory;
        const warehouseIds = get().locations.filter((l) => l.type === "almacen").map((l) => l.id);
        const receiver = get().users.find((u) => u.active && u.name.toLowerCase() === (receivedBy || "").trim().toLowerCase());
        const { unitCodes, items } = getValidatedAvailableItems(rawCodes, inventory);
        const fromLocationId = items[0]?.locationId;
        const toLocationId = receiver?.locationId;

        if (!receivedBy?.trim()) throw new Error("Indica quién recibe");
        if (items.some((i) => i.locationId !== fromLocationId)) {
          throw new Error("Todos los ítems deben salir del mismo depósito");
        }
        if (!fromLocationId || !warehouseIds.includes(fromLocationId)) {
          throw new Error("Solo se pueden entregar ítems que están en depósito");
        }
        if (!toLocationId) {
          throw new Error("Para entregar a otros usa traslado y elige una ubicación destino");
        }

        const inv = inventory.map((i) =>
          unitCodes.includes(i.unitCode) ? { ...i, locationId: toLocationId, status: "disponible" as ItemStatus } : i
        );
        const mv: Movement = {
          id: `mv-${Date.now()}`,
          type: "entrega",
          unitCodes,
          fromLocationId,
          toLocationId,
          byUserId,
          byUserName,
          byUserRole,
          receivedBy: receiver.name,
          timestamp: new Date().toISOString(),
        };
        set({ inventory: inv, movements: [mv, ...get().movements] });
      },

      markAsSample: (unitCode) =>
        set({
          inventory: get().inventory.map((i) => (i.unitCode === unitCode ? { ...i, status: "muestra" } : i)),
        }),

      markAsFault: (unitCode, reason, byUserId, byUserName, byUserRole) => {
        const mv: Movement = {
          id: `mv-${Date.now()}`,
          type: "falla",
          unitCodes: [unitCode],
          byUserId,
          byUserName,
          byUserRole,
          reason,
          timestamp: new Date().toISOString(),
        };
        set({
          inventory: get().inventory.map((i) =>
            i.unitCode === unitCode ? { ...i, status: "con_falla", notes: reason } : i
          ),
          movements: [mv, ...get().movements],
        });
      },

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      createDraftSale: (sale) => {
        const c = { ...get().counters };
        const code = `V-${pad(c.saleSeq, 4)}`;
        c.saleSeq += 1;
        const fullSale: Sale = {
          ...sale,
          id: `s-${Date.now()}`,
          code,
          sellerRole: get().users.find((u) => u.id === sale.sellerId)?.role,
          status: "pendiente_cobro",
          timestamp: new Date().toISOString(),
        };
        // Reservar items (no vendidos aún, pero bloqueados)
        const reservedUnitCodes = new Set<string>();
        sale.lines.forEach((l) => {
          if (l.isPair) {
            reservedUnitCodes.add(`${l.unitCode}-D`);
            reservedUnitCodes.add(`${l.unitCode}-I`);
          } else {
            reservedUnitCodes.add(l.unitCode);
          }
        });
        const inv = get().inventory.map((i) =>
          reservedUnitCodes.has(i.unitCode) ? { ...i, status: "reservado" as ItemStatus } : i
        );
        set({
          sales: [fullSale, ...get().sales],
          counters: c,
          inventory: inv,
        });
        return fullSale;
      },

      confirmSalePayment: (saleId, payments, totalSurcharge, total, cashierId, cashierName, cashierRole) => {
        const sale = get().sales.find((s) => s.id === saleId);
        if (!sale || sale.status !== "pendiente_cobro") return;
        const soldUnitCodes = new Set<string>();
        sale.lines.forEach((l) => {
          if (l.isPair) {
            soldUnitCodes.add(`${l.unitCode}-D`);
            soldUnitCodes.add(`${l.unitCode}-I`);
          } else {
            soldUnitCodes.add(l.unitCode);
          }
        });
        const inv = get().inventory.map((i) =>
          soldUnitCodes.has(i.unitCode) ? { ...i, status: "vendido" as ItemStatus } : i
        );
        const updatedSale: Sale = {
          ...sale,
          payments,
          totalSurcharge,
          total,
          status: "confirmada",
          paidAt: new Date().toISOString(),
          paidByCashierId: cashierId,
          paidByCashierName: cashierName,
          paidByCashierRole: cashierRole,
          cashierId,
          cashierRole,
        };
        const mv: Movement = {
          id: `mv-${Date.now()}`,
          type: "venta",
          unitCodes: Array.from(soldUnitCodes),
          byUserId: sale.sellerId,
          byUserName: sale.sellerName,
          byUserRole: sale.sellerRole,
          timestamp: new Date().toISOString(),
        };
        set({
          sales: get().sales.map((s) => (s.id === saleId ? updatedSale : s)),
          inventory: inv,
          movements: [mv, ...get().movements],
        });
        return updatedSale;
      },

      cancelDraftSale: (saleId, reason) => {
        const sale = get().sales.find((s) => s.id === saleId);
        if (!sale || sale.status !== "pendiente_cobro") return;
        const release = new Set<string>();
        sale.lines.forEach((l) => {
          if (l.isPair) {
            release.add(`${l.unitCode}-D`);
            release.add(`${l.unitCode}-I`);
          } else release.add(l.unitCode);
        });
        const inv = get().inventory.map((i) =>
          release.has(i.unitCode) ? { ...i, status: "disponible" as ItemStatus } : i
        );
        const updated = get().sales.map((s) =>
          s.id === saleId ? { ...s, status: "anulada" as const, voidReason: reason } : s
        );
        set({ sales: updated, inventory: inv });
      },

      voidSale: (saleId, reason, byUserId, byUserName, byUserRole) => {
        const sale = get().sales.find((s) => s.id === saleId);
        if (!sale) return;
        // Devolver items al stock
        const restore = new Set<string>();
        sale.lines.forEach((l) => {
          if (l.isPair) {
            restore.add(`${l.unitCode}-D`);
            restore.add(`${l.unitCode}-I`);
          } else restore.add(l.unitCode);
        });
        const inv = get().inventory.map((i) =>
          restore.has(i.unitCode) ? { ...i, status: "disponible" as ItemStatus } : i
        );
        const updated = get().sales.map((s) =>
          s.id === saleId ? { ...s, status: "anulada" as const, voidReason: reason } : s
        );
        const after: AfterSale = {
          id: `as-${Date.now()}`,
          type: "anulacion",
          saleId,
          saleCode: sale.code,
          byUserId,
          byUserName,
          byUserRole,
          reason,
          timestamp: new Date().toISOString(),
        };
        set({ sales: updated, inventory: inv, afterSales: [after, ...get().afterSales] });
      },

      registerExchange: (saleId, oldUnitCode, newUnitCode, _diff, byUserId, byUserName, byUserRole, reason) => {
        const sale = get().sales.find((s) => s.id === saleId);
        if (!sale || sale.status !== "confirmada") throw new Error("Selecciona una venta confirmada");
        const oldLine = sale.lines.find((l) => l.unitCode === oldUnitCode);
        if (!oldLine) throw new Error("El producto devuelto no pertenece a la venta");

        const isPairOld = oldUnitCode.startsWith("A");
        const isPairNew = newUnitCode.startsWith("A");
        const release = isPairOld ? [`${oldUnitCode}-D`, `${oldUnitCode}-I`] : [oldUnitCode];
        const reserve = isPairNew ? [`${newUnitCode}-D`, `${newUnitCode}-I`] : [newUnitCode];
        const reservedItems = reserve.map((code) => get().inventory.find((i) => i.unitCode === code));
        if (reservedItems.some((item) => !item)) throw new Error("El nuevo producto no existe completo");
        if (reservedItems.some((item) => item?.status !== "disponible")) throw new Error("El nuevo producto no está disponible");

        const newProduct = get().products.find((p) => p.id === reservedItems[0]?.productId);
        const diff = Math.max(0, (newProduct?.basePrice || 0) - oldLine.finalPrice);
        const after: AfterSale = {
          id: `as-${Date.now()}`,
          type: "cambio",
          saleId,
          saleCode: sale.code,
          byUserId,
          byUserName,
          byUserRole,
          reason: `${reason} | ${oldUnitCode} → ${newUnitCode}`,
          diff,
          timestamp: new Date().toISOString(),
        };
        const inv = get().inventory.map((i) => {
          if (release.includes(i.unitCode)) return { ...i, status: "disponible" as ItemStatus };
          if (reserve.includes(i.unitCode)) return { ...i, status: "vendido" as ItemStatus };
          return i;
        });
        set({ afterSales: [after, ...get().afterSales], inventory: inv });
      },

      registerWrongPurchase: (saleId, reason, byUserId, byUserName, byUserRole) => {
        const sale = get().sales.find((s) => s.id === saleId);
        if (!sale) return;
        const after: AfterSale = {
          id: `as-${Date.now()}`,
          type: "compra_error",
          saleId,
          saleCode: sale.code,
          byUserId,
          byUserName,
          byUserRole,
          reason,
          timestamp: new Date().toISOString(),
        };
        set({ afterSales: [after, ...get().afterSales] });
      },

      requestAuthorization: (req) => {
        const r: AuthorizationRequest = {
          ...req,
          id: `auth-${Date.now()}`,
          status: "pendiente",
          timestamp: new Date().toISOString(),
        };
        set({ authorizations: [r, ...get().authorizations] });
        return r;
      },
      resolveAuthorization: (id, approve, byUserId) =>
        set({
          authorizations: get().authorizations.map((a) =>
            a.id === id
              ? { ...a, status: approve ? "aprobada" : "rechazada", resolvedBy: byUserId, resolvedAt: new Date().toISOString() }
              : a
          ),
        }),

      resetData: () => {
        const fresh = buildInitialInventory();
        set({
          currentUserId: "u-admin",
          locations: initialLocations,
          users: initialUsers,
          products: initialProducts,
          inventory: fresh.items,
          counters: fresh.counters,
          attendance: [],
          movements: [],
          sales: [],
          afterSales: [],
          authorizations: [],
          settings: initialSettings,
        });
      },
    }),
    {
      name: "kabutt-store-v2",
    }
  )
);

// Selectores útiles
export const useCurrentUser = () => {
  const userId = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  return users.find((u) => u.id === userId) || users[0];
};
