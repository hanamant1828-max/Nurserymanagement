import { pgTable, text, integer, numeric, timestamp, index, serial, boolean } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger, real as sqliteReal, index as sqliteIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// We'll use a conditional approach or just switch to SQLite for now as requested.
// Since the user said "Still developing time use sql lite database later while publishing we can use post gry",
// I will switch the table definitions to SQLite.

// 1. Users (Login View)
export const users = sqliteTable("users", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  username: sqliteText("username").notNull().unique(),
  password: sqliteText("password").notNull(),
  role: sqliteText("role").default("staff").notNull(),
  firstName: sqliteText("first_name"),
  lastName: sqliteText("last_name"),
  phoneNumber: sqliteText("phone_number"),
});

// 3. Categories
export const categories = sqliteTable("categories", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  name: sqliteText("name").notNull(),
  image: sqliteText("image"), // Base64 string
  pricePerUnit: sqliteText("price_per_unit").default("1.00").notNull(),
  active: sqliteInteger("active", { mode: "boolean" }).default(true).notNull(),
});

// 4. Varieties
export const varieties = sqliteTable("varieties", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  categoryId: sqliteInteger("category_id").notNull(),
  name: sqliteText("name").notNull(),
  active: sqliteInteger("active", { mode: "boolean" }).default(true).notNull(),
}, (table) => {
  return {
    categoryIdIdx: sqliteIndex("idx_varieties_category_id").on(table.categoryId),
  };
});

// 5. Lots (Sowing Lot Entry)
export const lots = sqliteTable("lots", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  lotNumber: sqliteText("lot_number").notNull().unique(),
  seedInwardId: sqliteInteger("seed_inward_id"),
  categoryId: sqliteInteger("category_id").notNull(),
  varietyId: sqliteInteger("variety_id").notNull(),
  sowingDate: sqliteText("sowing_date").notNull(),
  seedsSown: sqliteInteger("seeds_sown").notNull(),
  packetsSown: sqliteInteger("packets_sown").default(0).notNull(),
  damaged: sqliteInteger("damaged").default(0).notNull(),
  damagePercentage: sqliteText("damage_percentage").default("0.00"),
  expectedReadyDate: sqliteText("expected_ready_date"),
  remarks: sqliteText("remarks"),
}, (table) => {
  return {
    varietyIdIdx: sqliteIndex("idx_lots_variety_id").on(table.varietyId),
    categoryIdIdx: sqliteIndex("idx_lots_category_id").on(table.categoryId),
  };
});

// Orders (Order Booking)
export const orders = sqliteTable("orders", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: sqliteText("invoice_number").unique(),
  lotId: sqliteInteger("lot_id"), // Nullable for pending lots
  categoryId: sqliteInteger("category_id").notNull(),
  varietyId: sqliteInteger("variety_id").notNull(),
  customerName: sqliteText("customer_name").notNull(),
  phone: sqliteText("phone").notNull(),
  village: sqliteText("village"),
  state: sqliteText("state"),
  district: sqliteText("district"),
  taluk: sqliteText("taluk"),
  perUnitPrice: sqliteText("per_unit_price").default("0.00").notNull(),
  bookedQty: sqliteText("booked_qty").notNull(),
  allocatedQuantity: sqliteText("allocated_quantity").default("0.00").notNull(),
  pendingQuantity: sqliteText("pending_quantity").notNull(),
  lotStatus: sqliteText("lot_status").default("PENDING_LOT").notNull(), // PENDING_LOT, ALLOCATED, PARTIAL
  discount: sqliteText("discount").default("0.00").notNull(),
  totalAmount: sqliteText("total_amount").notNull(),
  advanceAmount: sqliteText("advance_amount").notNull(),
  remainingBalance: sqliteText("remaining_balance").notNull(),
  paymentMode: sqliteText("payment_mode").notNull(), // Cash, PhonePe, UPI, GPay
  deliveryDate: sqliteText("delivery_date").notNull(),
  status: sqliteText("status").default("BOOKED").notNull(), // BOOKED, DELIVERED, CANCELLED
  paymentStatus: sqliteText("payment_status").notNull(), // Pending, Partially Paid, Paid
  actualDeliveryDate: sqliteText("actual_delivery_date"),
  actualDeliveryTime: sqliteText("actual_delivery_time"),
  deliveredQty: sqliteText("delivered_qty").default("0.00"),
  vehicleDetails: sqliteText("vehicle_details"),
  driverName: sqliteText("driver_name"),
  driverPhone: sqliteText("driver_phone"),
  createdBy: sqliteInteger("created_by"),
}, (table) => {
  return {
    lotIdIdx: sqliteIndex("idx_orders_lot_id").on(table.lotId),
    phoneIdx: sqliteIndex("idx_orders_phone").on(table.phone),
    invoiceNumberIdx: sqliteIndex("idx_orders_invoice_number").on(table.invoiceNumber),
    categoryIdIdx: sqliteIndex("idx_orders_category_id").on(table.categoryId),
    varietyIdIdx: sqliteIndex("idx_orders_variety_id").on(table.varietyId),
  };
});

// 9. Audit Logs
export const auditLogs = sqliteTable("audit_logs", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  userId: sqliteInteger("user_id").notNull(),
  action: sqliteText("action").notNull(), // CREATE, UPDATE, DELETE
  entityType: sqliteText("entity_type").notNull(), // category, variety, lot, order
  entityId: sqliteInteger("entity_id").notNull(),
  details: sqliteText("details"),
  timestamp: sqliteInteger("timestamp", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// Seed Inward
export const seedInward = sqliteTable("seed_inward", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  categoryId: sqliteInteger("category_id").notNull(),
  varietyId: sqliteInteger("variety_id").notNull(),
  lotNo: sqliteText("lot_no").notNull(),
  expiryDate: sqliteText("expiry_date").notNull(),
  numberOfPackets: sqliteInteger("number_of_packets").notNull(),
  totalQuantity: sqliteInteger("total_quantity").notNull(),
  usedQuantity: sqliteInteger("used_quantity").default(0).notNull(),
  availableQuantity: sqliteInteger("available_quantity").notNull(),
  typeOfPackage: sqliteText("type_of_package").notNull(),
  receivedFrom: sqliteText("received_from").notNull(),
  timestamp: sqliteInteger("timestamp", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => {
  return {
    categoryIdIdx: sqliteIndex("idx_seed_inward_category_id").on(table.categoryId),
    varietyIdIdx: sqliteIndex("idx_seed_inward_variety_id").on(table.varietyId),
  };
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  varieties: many(varieties),
  lots: many(lots),
  seedInwards: many(seedInward),
}));

export const varietiesRelations = relations(varieties, ({ one, many }) => ({
  category: one(categories, { fields: [varieties.categoryId], references: [categories.id] }),
  lots: many(lots),
  seedInwards: many(seedInward),
}));

export const seedInwardRelations = relations(seedInward, ({ one }) => ({
  category: one(categories, { fields: [seedInward.categoryId], references: [categories.id] }),
  variety: one(varieties, { fields: [seedInward.varietyId], references: [varieties.id] }),
}));

export const lotsRelations = relations(lots, ({ one, many }) => ({
  category: one(categories, { fields: [lots.categoryId], references: [categories.id] }),
  variety: one(varieties, { fields: [lots.varietyId], references: [varieties.id] }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  lot: one(lots, { fields: [orders.lotId], references: [lots.id] }),
  creator: one(users, { fields: [orders.createdBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertVarietySchema = createInsertSchema(varieties).omit({ id: true });
export const insertLotSchema = createInsertSchema(lots).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export const insertSeedInwardSchema = createInsertSchema(seedInward).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Variety = typeof varieties.$inferSelect;
export type Lot = typeof lots.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SeedInward = typeof seedInward.$inferSelect;
