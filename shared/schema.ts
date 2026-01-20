import { sqliteTable, text, integer, numeric, customType } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Custom decimal type for SQLite
const decimal = customType<{ data: string }>( {
  dataType() {
    return "numeric";
  },
  fromDriver(value: unknown) {
    return String(value);
  },
  toDriver(value: string) {
    return value;
  }
});

// 1. Users (Login View)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("staff").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number"),
});

// 3. Categories
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  image: text("image"), // Base64 string
  pricePerUnit: decimal("price_per_unit").default("1.00").notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
});

// 4. Varieties
export const varieties = sqliteTable("varieties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
});

// 5. Lots (Sowing Lot Entry)
export const lots = sqliteTable("lots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lotNumber: text("lot_number").notNull().unique(),
  categoryId: integer("category_id").notNull(),
  varietyId: integer("variety_id").notNull(),
  sowingDate: text("sowing_date").notNull(),
  seedsSown: integer("seeds_sown").notNull(),
  packetsSown: integer("packets_sown").default(0).notNull(),
  damaged: integer("damaged").default(0).notNull(),
  damagePercentage: decimal("damage_percentage").default("0.00"),
  expectedReadyDate: text("expected_ready_date"),
  remarks: text("remarks"),
});

// 8. Orders (Order Booking)
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lotId: integer("lot_id").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  village: text("village"),
  state: text("state"),
  district: text("district"),
  taluk: text("taluk"),
  perUnitPrice: decimal("per_unit_price").default("0.00").notNull(),
  bookedQty: integer("booked_qty").notNull(),
  discount: decimal("discount").default("0.00").notNull(),
  totalAmount: decimal("total_amount").notNull(),
  advanceAmount: decimal("advance_amount").notNull(),
  remainingBalance: decimal("remaining_balance").notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, PhonePe
  deliveryDate: text("delivery_date").notNull(),
  status: text("status").default("BOOKED").notNull(), // BOOKED, DELIVERED, CANCELLED
  paymentStatus: text("payment_status").notNull(), // Pending, Partially Paid, Paid
  actualDeliveryDate: text("actual_delivery_date"),
  actualDeliveryTime: text("actual_delivery_time"),
  deliveredQty: integer("delivered_qty").default(0),
  createdBy: integer("created_by"),
});

// 9. Audit Logs
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE
  entityType: text("entity_type").notNull(), // category, variety, lot, order
  entityId: integer("entity_id").notNull(),
  details: text("details"),
  timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

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
