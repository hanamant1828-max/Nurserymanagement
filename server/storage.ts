import {
  users, categories, varieties, lots, orders, auditLogs, seedInward,
  type User, type Category, type Variety, type Lot, type Order, type AuditLog, type SeedInward,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, sql, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { insertUserSchema, insertCategorySchema, insertVarietySchema, insertLotSchema, insertOrderSchema, insertAuditLogSchema, insertSeedInwardSchema } from "@shared/schema";
import { z } from "zod";

const PostgresSessionStore = connectPg(session);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertVariety = z.infer<typeof insertVarietySchema>;
export type InsertLot = z.infer<typeof insertLotSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertSeedInward = z.infer<typeof insertSeedInwardSchema>;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Varieties
  getVarieties(): Promise<Variety[]>;
  getVariety(id: number): Promise<Variety | undefined>;
  createVariety(variety: InsertVariety): Promise<Variety>;
  updateVariety(id: number, variety: Partial<InsertVariety>): Promise<Variety>;
  deleteVariety(id: number): Promise<void>;

  // Lots
  getLots(): Promise<(Lot & { category: Category; variety: Variety; orders: Order[]; available: number })[]>;
  getLot(id: number): Promise<Lot | undefined>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: number, lot: Partial<InsertLot>): Promise<Lot>;
  deleteLot(id: number): Promise<void>;

  // Orders
  getOrders(page?: number, limit?: number, sortField?: string, sortOrder?: "asc" | "desc"): Promise<{ orders: (Order & { lot: (Lot & { variety: Variety }) | null; creator?: User })[]; total: number }>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;

  // Seed Inward
  getSeedInwards(): Promise<(SeedInward & { category: Category; variety: Variety })[]>;
  createSeedInward(seedInward: InsertSeedInward): Promise<SeedInward>;
  deleteSeedInward(id: number): Promise<void>;

  // Audit Logs
  createAuditLog(log: z.infer<typeof insertAuditLogSchema>): Promise<AuditLog>;
  getAuditLogs(): Promise<(AuditLog & { user: User })[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, update: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(update).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategory(id: number, update: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db.update(categories).set(update).where(eq(categories.id, id)).returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getVarieties(): Promise<Variety[]> {
    return await db.select().from(varieties).orderBy(varieties.name);
  }

  async getVariety(id: number): Promise<Variety | undefined> {
    const [variety] = await db.select().from(varieties).where(eq(varieties.id, id));
    return variety;
  }

  async createVariety(insertVariety: InsertVariety): Promise<Variety> {
    const [variety] = await db.insert(varieties).values(insertVariety).returning();
    return variety;
  }

  async updateVariety(id: number, update: Partial<InsertVariety>): Promise<Variety> {
    const [variety] = await db.update(varieties).set(update).where(eq(varieties.id, id)).returning();
    return variety;
  }

  async deleteVariety(id: number): Promise<void> {
    await db.delete(varieties).where(eq(varieties.id, id));
  }

  async getLots(): Promise<(Lot & { category: Category; variety: Variety; orders: Order[]; available: number })[]> {
    const allLots = await db.query.lots.findMany({
      with: {
        category: true,
        variety: true,
        orders: true,
      },
    });

    return allLots.map((lot: any) => {
      const totalBooked = (lot.orders || []).reduce((sum: number, o: any) => sum + Number(o.bookedQty || 0), 0);
      const available = (Number(lot.seedsSown) || 0) - (Number(lot.damaged) || 0) - totalBooked;

      return {
        ...lot,
        available
      };
    });
  }

  async getLot(id: number): Promise<Lot | undefined> {
    const [lot] = await db.select().from(lots).where(eq(lots.id, id));
    return lot;
  }

  async createLot(insertLot: InsertLot): Promise<Lot> {
    const [existing] = await db.select().from(lots).where(eq(lots.lotNumber, insertLot.lotNumber));
    if (existing) {
      throw new Error(`Lot number ${insertLot.lotNumber} already exists`);
    }
    const [lot] = await db.insert(lots).values(insertLot).returning();
    
    // Auto-sync pending orders with the new lot
    await this.syncPendingOrdersWithNewLot(lot.id);
    
    return lot;
  }

  async syncPendingOrdersWithNewLot(lotId: number): Promise<void> {
    const lot = await this.getLot(lotId);
    if (!lot) return;

    // Get all pending orders for this category and variety
    const pendingOrders = await db.select().from(orders).where(
      and(
        eq(orders.categoryId, lot.categoryId),
        eq(orders.varietyId, lot.varietyId),
        sql`${orders.lotStatus} IN ('PENDING_LOT', 'PARTIAL')`
      )
    ).orderBy(orders.id);

    let currentLot = await this.getLot(lotId);
    if (!currentLot) return;

    // Calculate available stock
    const ordersForLot = await db.select().from(orders).where(eq(orders.lotId, lotId));
    const totalBooked = ordersForLot.reduce((sum, o) => sum + Number(o.bookedQty), 0);
    let availableStock = Number(currentLot.seedsSown) - Number(currentLot.damaged) - totalBooked;

    for (const order of pendingOrders) {
      if (availableStock <= 0) break;

      const neededQty = Number(order.pendingQuantity);
      const allocation = Math.min(neededQty, availableStock);
      
      const newAllocated = Number(order.allocatedQuantity) + allocation;
      const newPending = neededQty - allocation;
      const newStatus = newPending === 0 ? "ALLOCATED" : "PARTIAL";

      await db.update(orders).set({
        lotId: lotId,
        allocatedQuantity: newAllocated.toString(),
        pendingQuantity: newPending.toString(),
        lotStatus: newStatus
      }).where(eq(orders.id, order.id));

      availableStock -= allocation;
    }
  }

  async updateLot(id: number, update: Partial<InsertLot>): Promise<Lot> {
    const [lot] = await db.update(lots).set(update).where(eq(lots.id, id)).returning();
    return lot;
  }

  async deleteLot(id: number): Promise<void> {
    await db.delete(lots).where(eq(lots.id, id));
  }

  async getOrders(page: number = 1, limit: number = 50, sortField: string = "id", sortOrder: "asc" | "desc" = "desc"): Promise<{ orders: (Order & { lot: (Lot & { variety: Variety }) | null; creator?: User })[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const total = Number(totalResult?.count || 0);

    const allOrders = await db.query.orders.findMany({
      with: {
        lot: {
          with: {
            variety: true,
          }
        },
        creator: true,
      },
      orderBy: (orders, { asc, desc }) => {
        const field = (orders as any)[sortField];
        return [sortOrder === "asc" ? asc(field) : desc(field)];
      },
      limit: limit,
      offset: offset,
    });

    return { 
      orders: allOrders as any,
      total 
    };
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const lotId = insertOrder.lotId;
    let lotStatus: "PENDING_LOT" | "ALLOCATED" | "PARTIAL" = "PENDING_LOT";
    let allocatedQuantity = "0.00";
    let pendingQuantity = insertOrder.bookedQty;

    if (lotId) {
      const lot = await this.getLot(lotId);
      if (lot) {
        const ordersForLot = await db.select().from(orders).where(eq(orders.lotId, lotId));
        const totalBooked = ordersForLot.reduce((sum, o) => sum + Number(o.bookedQty), 0);
        const availableStock = Number(lot.seedsSown) - Number(lot.damaged) - totalBooked;
        
        const allocation = Math.min(Number(insertOrder.bookedQty), availableStock);
        allocatedQuantity = allocation.toString();
        pendingQuantity = (Number(insertOrder.bookedQty) - allocation).toString();
        lotStatus = Number(pendingQuantity) === 0 ? "ALLOCATED" : (allocation > 0 ? "PARTIAL" : "PENDING_LOT");
      }
    }

    const [order] = await db.insert(orders).values({
      ...insertOrder,
      lotStatus,
      allocatedQuantity,
      pendingQuantity,
    }).returning();
    return order;
  }

  async updateOrder(id: number, update: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db.update(orders).set(update).where(eq(orders.id, id)).returning();
    return order;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  async createAuditLog(log: z.infer<typeof insertAuditLogSchema>): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(): Promise<(AuditLog & { user: User })[]> {
    return await db.query.auditLogs.findMany({
      with: {
        user: true,
      },
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
      limit: 100,
    });
  }

  async getSeedInwards(): Promise<(SeedInward & { category: Category; variety: Variety })[]> {
    return await db.query.seedInward.findMany({
      with: {
        category: true,
        variety: true,
      },
      orderBy: (seedInward, { desc }) => [desc(seedInward.timestamp)],
    }) as any;
  }

  async createSeedInward(insertSeedInward: InsertSeedInward): Promise<SeedInward> {
    const [result] = await db.insert(seedInward).values(insertSeedInward).returning();
    return result;
  }

  async deleteSeedInward(id: number): Promise<void> {
    await db.delete(seedInward).where(eq(seedInward.id, id));
  }
}

export const storage = new DatabaseStorage();
