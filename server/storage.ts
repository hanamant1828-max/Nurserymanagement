import { db, pool } from "./db";
import {
  users, categories, varieties, lots, orders,
  type User, type Category, type Variety, type Lot, type Order,
  type InsertUser, type InsertCategory, type InsertVariety, type InsertLot, type InsertOrder
} from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;

  // Varieties
  getVarieties(): Promise<Variety[]>;
  createVariety(variety: InsertVariety): Promise<Variety>;
  updateVariety(id: number, variety: Partial<InsertVariety>): Promise<Variety>;

  // Lots
  getLots(): Promise<(Lot & { category: Category, variety: Variety, available: number })[]>;
  getLot(id: number): Promise<Lot | undefined>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: number, lot: Partial<InsertLot>): Promise<Lot>;

  // Orders
  getOrders(): Promise<(Order & { lot: Lot })[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, update: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db.update(categories).set(update).where(eq(categories.id, id)).returning();
    return updated;
  }

  async getVarieties(): Promise<Variety[]> {
    return await db.select().from(varieties);
  }

  async createVariety(variety: InsertVariety): Promise<Variety> {
    const [newVariety] = await db.insert(varieties).values(variety).returning();
    return newVariety;
  }

  async updateVariety(id: number, update: Partial<InsertVariety>): Promise<Variety> {
    const [updated] = await db.update(varieties).set(update).where(eq(varieties.id, id)).returning();
    return updated;
  }

  async getLots(): Promise<(Lot & { category: Category, variety: Variety, available: number })[]> {
    const allLots = await db.query.lots.findMany({
      with: {
        category: true,
        variety: true,
        orders: true
      }
    });

    return allLots.map(lot => {
      const booked = lot.orders
        .filter(o => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.bookedQty, 0);
      const available = lot.seedsSown - lot.damaged - booked;
      return { ...lot, available };
    });
  }

  async getLot(id: number): Promise<Lot | undefined> {
    const [lot] = await db.select().from(lots).where(eq(lots.id, id));
    return lot;
  }

  async createLot(lot: InsertLot): Promise<Lot> {
    const [newLot] = await db.insert(lots).values(lot).returning();
    return newLot;
  }

  async updateLot(id: number, update: Partial<InsertLot>): Promise<Lot> {
    const [updated] = await db.update(lots).set(update).where(eq(lots.id, id)).returning();
    return updated;
  }

  async getOrders(): Promise<(Order & { lot: Lot })[]> {
    return await db.query.orders.findMany({
      with: { lot: true }
    });
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, update: Partial<InsertOrder>): Promise<Order> {
    const [updated] = await db.update(orders).set(update).where(eq(orders.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
