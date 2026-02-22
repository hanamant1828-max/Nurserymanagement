import {
  users, categories, varieties, lots, orders, auditLogs, seedInward,
  type User, type Category, type Variety, type Lot, type Order, type AuditLog, type SeedInward,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, desc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { insertUserSchema, insertCategorySchema, insertVarietySchema, insertLotSchema, insertOrderSchema, insertAuditLogSchema, insertSeedInwardSchema } from "@shared/schema";
import { z } from "zod";

const MemoryStore = createMemoryStore(session);

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
  createLot(lot: InsertLot, orderIds?: number[]): Promise<Lot>;
  updateLot(id: number, lot: Partial<InsertLot>): Promise<Lot>;
  deleteLot(id: number): Promise<void>;

  // Orders
  getOrders(page?: number, limit?: number, sortField?: string, sortOrder?: "asc" | "desc"): Promise<{ orders: (Order & { lot: (Lot & { variety: Variety }) | null; creator?: User })[]; total: number }>;
  getUnallocatedOrders(categoryId: number, varietyId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  deliverOrder(id: number, deliveryData: { 
    actualDeliveryDate: string; 
    actualDeliveryTime: string; 
    deliveredQty: string; 
    vehicleDetails?: string; 
    driverName?: string; 
    driverPhone?: string;
  }): Promise<Order>;
  deleteOrder(id: number): Promise<void>;

  // Seed Inward
  getSeedInwards(): Promise<(SeedInward & { category: Category; variety: Variety })[]>;
  getSeedInwardLots(categoryId: number, varietyId: number): Promise<SeedInward[]>;
  createSeedInward(seedInward: InsertSeedInward): Promise<SeedInward>;
  updateSeedInward(id: number, seedInward: Partial<InsertSeedInward>): Promise<SeedInward>;
  deleteSeedInward(id: number): Promise<void>;

  // Audit Logs
  createAuditLog(log: z.infer<typeof insertAuditLogSchema>): Promise<AuditLog>;
  getAuditLogs(): Promise<(AuditLog & { user: User })[]>;
  getUnallocatedOrderCount(categoryId: number, varietyId: number): Promise<number>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
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

  async getVarieties(): Promise<(Variety & { category: Category })[]> {
    return await db.query.varieties.findMany({
      with: {
        category: true,
      },
      orderBy: (varieties, { asc }) => [asc(varieties.name)],
    }) as any;
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

  async createLot(insertLot: InsertLot, orderIds?: number[]): Promise<Lot> {
    const [existing] = await db.select().from(lots).where(eq(lots.lotNumber, insertLot.lotNumber));
    if (existing) {
      throw new Error(`Lot number ${insertLot.lotNumber} already exists. Please use a unique lot number.`);
    }

    // Stock deduction logic
    let inward: SeedInward | undefined;
    
    if (insertLot.seedInwardId) {
      const [record] = await db.select().from(seedInward).where(eq(seedInward.id, insertLot.seedInwardId));
      inward = record;
    } else {
      const inwardLots = await db.select().from(seedInward).where(
        and(
          eq(seedInward.lotNo, insertLot.lotNumber),
          eq(seedInward.categoryId, insertLot.categoryId),
          eq(seedInward.varietyId, insertLot.varietyId)
        )
      );
      inward = inwardLots[0];
    }

    if (!inward) {
      throw new Error(`Seed Inward record not found for Lot No: ${insertLot.lotNumber}`);
    }

    const packetsSown = insertLot.packetsSown ?? 0;
    if (inward.availableQuantity < packetsSown) {
      throw new Error(`Insufficient packet quantity. Available: ${inward.availableQuantity}, Requested: ${packetsSown}`);
    }

    const currentInward = inward; // for closure
    const lot = db.transaction((tx) => {
      // Update seed inward stock
      tx.update(seedInward)
        .set({
          usedQuantity: currentInward.usedQuantity + packetsSown,
          availableQuantity: currentInward.availableQuantity - packetsSown,
        })
        .where(eq(seedInward.id, currentInward.id))
        .run();

      const [newLot] = tx.insert(lots).values({
        ...insertLot,
        seedInwardId: currentInward.id
      }).returning().all();
      return newLot;
    });

    // Selective sync of pending orders with the new lot
    await this.syncPendingOrdersWithNewLot(lot.id, orderIds);

    return lot;
  }

  async getUnallocatedOrders(categoryId: number, varietyId: number): Promise<Order[]> {
    return await db.select().from(orders).where(
      and(
        eq(orders.categoryId, categoryId),
        eq(orders.varietyId, varietyId),
        eq(orders.lotStatus, 'PENDING_LOT'),
        eq(orders.status, 'BOOKED')
      )
    ).orderBy(orders.id);
  }

  async syncPendingOrdersWithNewLot(lotId: number, orderIds?: number[]): Promise<void> {
    const lot = await this.getLot(lotId);
    if (!lot) return;

    // Get pending orders for this category and variety
    let query = and(
      eq(orders.categoryId, lot.categoryId),
      eq(orders.varietyId, lot.varietyId),
      sql`${orders.lotStatus} IN ('PENDING_LOT', 'PARTIAL')`,
      eq(orders.status, 'BOOKED')
    );

    if (orderIds && orderIds.length > 0) {
      query = and(query, sql`${orders.id} IN ${orderIds}`);
    } else if (orderIds && orderIds.length === 0) {
      // If empty array provided, don't sync anything
      return;
    }

    const pendingOrders = await db.select().from(orders).where(query).orderBy(orders.id);

    const ordersForLot = await db.select().from(orders).where(eq(orders.lotId, lotId));
    const totalBookedOnLot = ordersForLot.reduce((sum, o) => sum + Number(o.bookedQty), 0);
    let availableStock = Number(lot.seedsSown) - Number(lot.damaged) - totalBookedOnLot;

    for (const order of pendingOrders) {
      if (availableStock <= 0) break;

      const currentAllocated = Number(order.allocatedQuantity);
      const currentPending = Number(order.pendingQuantity);
      
      const allocation = Math.min(currentPending, availableStock);
      if (allocation <= 0) continue;

      const newAllocated = currentAllocated + allocation;
      const newPending = currentPending - allocation;
      const newStatus = newPending === 0 ? "ALLOCATED" : "PARTIAL";

      await db.update(orders).set({
        lotId: lotId,
        allocatedQuantity: newAllocated.toFixed(2),
        pendingQuantity: newPending.toFixed(2),
        lotStatus: newStatus
      }).where(eq(orders.id, order.id));

      availableStock -= allocation;
    }
  }

  async updateLot(id: number, update: Partial<InsertLot>): Promise<Lot> {
    const oldLot = await this.getLot(id);
    if (!oldLot) throw new Error("Lot not found");

    const lot = await db.transaction(async (tx) => {
      if (update.packetsSown !== undefined && update.packetsSown !== oldLot.packetsSown) {
        const [inward] = await tx.select().from(seedInward).where(
          and(
            eq(seedInward.lotNo, oldLot.lotNumber),
            eq(seedInward.categoryId, oldLot.categoryId),
            eq(seedInward.varietyId, oldLot.varietyId)
          )
        );

        if (inward) {
          const diff = update.packetsSown - oldLot.packetsSown;

          if (inward.availableQuantity < diff) {
            throw new Error(`Insufficient packet quantity for update. Available: ${inward.availableQuantity}, Needed additional: ${diff}`);
          }

          await tx.update(seedInward)
            .set({
              usedQuantity: inward.usedQuantity + diff,
              availableQuantity: inward.availableQuantity - diff,
            })
            .where(eq(seedInward.id, inward.id));
        }
      }

      const [updatedLot] = await tx.update(lots).set(update).where(eq(lots.id, id)).returning();
      return updatedLot;
    });

    return lot;
  }

  async deleteLot(id: number): Promise<void> {
    const lot = await this.getLot(id);
    if (!lot) return;

    await db.transaction(async (tx) => {
      const [inward] = await tx.select().from(seedInward).where(
        and(
          eq(seedInward.lotNo, lot.lotNumber),
          eq(seedInward.categoryId, lot.categoryId),
          eq(seedInward.varietyId, lot.varietyId)
        )
      );

      if (inward) {
        await tx.update(seedInward)
          .set({
            usedQuantity: inward.usedQuantity - lot.packetsSown,
            availableQuantity: inward.availableQuantity + lot.packetsSown,
          })
          .where(eq(seedInward.id, inward.id));
      }

      await tx.delete(lots).where(eq(lots.id, id));
    });
  }

  async getOrders(page: number = 1, limit: number = 50, sortField: string = "id", sortOrder: "asc" | "desc" = "desc"): Promise<{ orders: (Order & { lot: (Lot & { variety: Variety; category: Category }) | null; creator?: User })[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const total = Number(totalResult?.count || 0);

    const allOrders = await db.query.orders.findMany({
      with: {
        lot: {
          with: {
            variety: true,
            category: true,
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

  async deliverOrder(id: number, deliveryData: any): Promise<Order> {
    const [order] = await db.update(orders)
      .set({
        ...deliveryData,
        status: "DELIVERED",
      })
      .where(eq(orders.id, id))
      .returning();
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

  async getUnallocatedOrderCount(categoryId: number, varietyId: number): Promise<number> {
    const [result] = await db.select({ 
      count: sql<number>`count(*)` 
    })
    .from(orders)
    .where(
      and(
        eq(orders.categoryId, categoryId),
        eq(orders.varietyId, varietyId),
        eq(orders.lotStatus, 'PENDING_LOT'),
        eq(orders.status, 'BOOKED')
      )
    );
    return Number(result?.count || 0);
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

  async getSeedInwardLots(categoryId: number, varietyId: number): Promise<SeedInward[]> {
    return await db.select().from(seedInward).where(
      and(
        eq(seedInward.categoryId, categoryId),
        eq(seedInward.varietyId, varietyId)
      )
    );
  }

  async createSeedInward(insertSeedInward: InsertSeedInward): Promise<SeedInward> {
    const [result] = await db.insert(seedInward).values(insertSeedInward).returning();
    return result;
  }

  async updateSeedInward(id: number, update: Partial<InsertSeedInward>): Promise<SeedInward> {
    const [result] = await db.update(seedInward).set(update).where(eq(seedInward.id, id)).returning();
    return result;
  }

  async deleteSeedInward(id: number): Promise<void> {
    await db.delete(seedInward).where(eq(seedInward.id, id));
  }
}

export const storage = new DatabaseStorage();
