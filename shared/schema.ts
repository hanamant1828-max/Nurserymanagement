import { pgTable, text, integer, numeric, timestamp, index, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

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
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }).default("1.00").notNull(),
  active: boolean("active").default(true).notNull(),
});

// 4. Varieties
export const varieties = pgTable("varieties", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  active: boolean("active").default(true).notNull(),
}, (table) => {
  return {
    categoryIdIdx: index("idx_varieties_category_id").on(table.categoryId),
  };
});

// 5. Lots (Sowing Lot Entry)
export const lots = pgTable("lots", {
  id: serial("id").primaryKey(),
  lotNumber: text("lot_number").notNull().unique(),
  categoryId: integer("category_id").notNull(),
  varietyId: integer("variety_id").notNull(),
  sowingDate: text("sowing_date").notNull(),
  seedsSown: integer("seeds_sown").notNull(),
  packetsSown: integer("packets_sown").default(0).notNull(),
  damaged: integer("damaged").default(0).notNull(),
  damagePercentage: numeric("damage_percentage", { precision: 5, scale: 2 }).default("0.00"),
  expectedReadyDate: text("expected_ready_date"),
  remarks: text("remarks"),
}, (table) => {
  return {
    varietyIdIdx: index("idx_lots_variety_id").on(table.varietyId),
    categoryIdIdx: index("idx_lots_category_id").on(table.categoryId),
  };
});

// Orders (Order Booking)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").unique(),
  lotId: integer("lot_id"), // Nullable for pending lots
  categoryId: integer("category_id").notNull(),
  varietyId: integer("variety_id").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  village: text("village"),
  state: text("state"),
  district: text("district"),
  taluk: text("taluk"),
  perUnitPrice: numeric("per_unit_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  bookedQty: numeric("booked_qty", { precision: 10, scale: 2 }).notNull(),
  allocatedQuantity: numeric("allocated_quantity", { precision: 10, scale: 2 }).default("0.00").notNull(),
  pendingQuantity: numeric("pending_quantity", { precision: 10, scale: 2 }).notNull(),
  lotStatus: text("lot_status").default("PENDING_LOT").notNull(), // PENDING_LOT, ALLOCATED, PARTIAL
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  advanceAmount: numeric("advance_amount", { precision: 10, scale: 2 }).notNull(),
  remainingBalance: numeric("remaining_balance", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, PhonePe, UPI, GPay
  deliveryDate: text("delivery_date").notNull(),
  status: text("status").default("BOOKED").notNull(), // BOOKED, DELIVERED, CANCELLED
  paymentStatus: text("payment_status").notNull(), // Pending, Partially Paid, Paid
  actualDeliveryDate: text("actual_delivery_date"),
  actualDeliveryTime: text("actual_delivery_time"),
  deliveredQty: numeric("delivered_qty", { precision: 10, scale: 2 }).default("0.00"),
  vehicleDetails: text("vehicle_details"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  createdBy: integer("created_by"),
}, (table) => {
  return {
    lotIdIdx: index("idx_orders_lot_id").on(table.lotId),
    phoneIdx: index("idx_orders_phone").on(table.phone),
    invoiceNumberIdx: index("idx_orders_invoice_number").on(table.invoiceNumber),
    categoryIdIdx: index("idx_orders_category_id").on(table.categoryId),
    varietyIdIdx: index("idx_orders_variety_id").on(table.varietyId),
  };
});

// 9. Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE
  entityType: text("entity_type").notNull(), // category, variety, lot, order
  entityId: integer("entity_id").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Seed Inward
export const seedInward = pgTable("seed_inward", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  varietyId: integer("variety_id").notNull(),
  lotNo: text("lot_no").notNull(),
  expiryDate: text("expiry_date").notNull(),
  numberOfPackets: integer("number_of_packets").notNull(),
  typeOfPackage: text("type_of_package").notNull(),
  receivedFrom: text("received_from").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => {
  return {
    categoryIdIdx: index("idx_seed_inward_category_id").on(table.categoryId),
    varietyIdIdx: index("idx_seed_inward_variety_id").on(table.varietyId),
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
