import { pgTable, text, serial, integer, boolean, date, decimal, json, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// 1. Users (Login View)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("staff").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number"),
});

// 3. Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image"), // Base64 string
  pricePerUnit: decimal("price_per_unit").default("1.00").notNull(),
  active: boolean("active").default(true).notNull(),
});

// 4. Varieties
export const varieties = pgTable("varieties", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  active: boolean("active").default(true).notNull(),
}, (table) => [
  index("varieties_category_id_idx").on(table.categoryId),
]);

// 5. Lots (Sowing Lot Entry)
export const lots = pgTable("lots", {
  id: serial("id").primaryKey(),
  lotNumber: text("lot_number").notNull().unique(),
  categoryId: integer("category_id").notNull(),
  varietyId: integer("variety_id").notNull(),
  sowingDate: text("sowing_date").notNull(),
  seedsSown: integer("seeds_sown").notNull(),
  damaged: integer("damaged").default(0).notNull(),
  expectedReadyDate: text("expected_ready_date"),
  remarks: text("remarks"),
}, (table) => [
  index("lots_category_id_idx").on(table.categoryId),
  index("lots_variety_id_idx").on(table.varietyId),
]);

// 8. Orders (Order Booking)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  lotId: integer("lot_id").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  village: text("village"),
  district: text("district"),
  taluk: text("taluk"),
  bookedQty: integer("booked_qty").notNull(),
  totalAmount: decimal("total_amount").notNull(),
  advanceAmount: decimal("advance_amount").notNull(),
  remainingBalance: decimal("remaining_balance").notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, PhonePe
  deliveryDate: text("delivery_date").notNull(),
  status: text("status").default("BOOKED").notNull(), // BOOKED, DELIVERED, CANCELLED
  paymentStatus: text("payment_status").notNull(), // Pending, Partially Paid, Paid
  deliveredQty: integer("delivered_qty").default(0),
  createdBy: integer("created_by"),
}, (table) => [
  index("orders_lot_id_idx").on(table.lotId),
  index("orders_created_by_idx").on(table.createdBy),
]);

// 9. Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE
  entityType: text("entity_type").notNull(), // category, variety, lot, order
  entityId: integer("entity_id").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("audit_logs_user_id_idx").on(table.userId),
  index("audit_logs_entity_idx").on(table.entityType, table.entityId),
]);

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  varieties: many(varieties),
  lots: many(lots),
}));

export const varietiesRelations = relations(varieties, ({ one, many }) => ({
  category: one(categories, { fields: [varieties.categoryId], references: [categories.id] }),
  lots: many(lots),
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

// Types
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Variety = typeof varieties.$inferSelect;
export type Lot = typeof lots.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
