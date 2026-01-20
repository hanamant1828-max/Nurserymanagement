import {
  users, categories, varieties, lots, orders, auditLogs,
  type User, type Category, type Variety, type Lot, type Order, type AuditLog,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, sql, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { insertUserSchema, insertCategorySchema, insertVarietySchema, insertLotSchema, insertOrderSchema, insertAuditLogSchema } from "@shared/schema";
import { z } from "zod";

const PostgresSessionStore = connectPg(session);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertVariety = z.infer<typeof insertVarietySchema>;
export type InsertLot = z.infer<typeof insertLotSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

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
  getOrders(): Promise<(Order & { lot: Lot & { variety: Variety }; creator?: User })[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;

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

    return allLots.map((lot) => {
      const totalBooked = lot.orders.reduce((sum, o) => sum + o.bookedQty, 0);
      const available = (lot.seedsSown || 0) - lot.damaged - totalBooked;

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
    const [lot] = await db.insert(lots).values(insertLot).returning();
    return lot;
  }

  async updateLot(id: number, update: Partial<InsertLot>): Promise<Lot> {
    const [lot] = await db.update(lots).set(update).where(eq(lots.id, id)).returning();
    return lot;
  }

  async deleteLot(id: number): Promise<void> {
    await db.delete(lots).where(eq(lots.id, id));
  }

  async getOrders(): Promise<(Order & { lot: Lot & { variety: Variety }; creator?: User })[]> {
    const allOrders = await db.query.orders.findMany({
      with: {
        lot: {
          with: {
            variety: true,
          }
        },
        creator: true,
      },
      orderBy: (orders, { desc }) => [desc(orders.id)],
    });

    return allOrders as any;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
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
}

export const storage = new DatabaseStorage();
