import { eq, sql, and, desc } from "drizzle-orm";
import {
  users, rolePermissions, categories, varieties, lots, orders, auditLogs, seedInward,
  type User, type RolePermission, type Category, type Variety, type Lot, type Order, type AuditLog, type SeedInward,
} from "@shared/schema";
import { db } from "./db";
import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up Passport auth
  setupAuth(app);

  app.use("/api", (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Categories
  app.get(api.categories.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post(api.categories.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const category = await storage.createCategory(req.body);
    res.status(201).json(category);
  });

  app.put(api.categories.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const category = await storage.updateCategory(Number(req.params.id), req.body);
    res.json(category);
  });

  app.delete(api.categories.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);

    // Check for associated varieties
    const varieties = await storage.getVarieties();
    const hasVarieties = varieties.some(v => v.categoryId === id);
    if (hasVarieties) {
      return res.status(400).json({ 
        message: "Cannot delete category because it has associated varieties. Please delete the varieties first." 
      });
    }

    await storage.deleteCategory(id);
    res.sendStatus(200);
  });

  // Varieties
  app.get(api.varieties.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const varieties = await storage.getVarieties();
    res.json(varieties);
  });

  app.post(api.varieties.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const variety = await storage.createVariety(req.body);
    res.status(201).json(variety);
  });

  app.put(api.varieties.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const variety = await storage.updateVariety(Number(req.params.id), req.body);
    res.json(variety);
  });

  app.delete(api.varieties.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);

    // Check for associated lots
    const lots = await storage.getLots();
    const hasLots = lots.some(l => l.varietyId === id);
    if (hasLots) {
      return res.status(400).json({ 
        message: "Cannot delete variety because it has associated sowing lots. Please delete the lots first." 
      });
    }

    await storage.deleteVariety(id);
    res.sendStatus(200);
  });

  // Lots
  app.get(api.lots.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lots = await storage.getLots();
    res.json(lots);
  });

  app.post(api.lots.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { orderIds, ...lotData } = req.body;
      const lot = await storage.createLot(lotData, orderIds);
      res.status(201).json(lot);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(api.lots.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lot = await storage.updateLot(Number(req.params.id), req.body);
    res.json(lot);
  });

  app.delete(api.lots.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);

    // Check for associated orders
    const { orders: relatedOrders } = await storage.getOrders(1, 1);
    const hasOrders = relatedOrders.length > 0;
    if (hasOrders) {
      return res.status(400).json({ 
        message: "Cannot delete lot because it has associated customer orders. Please delete the orders first." 
      });
    }

    await storage.deleteLot(id);
    res.sendStatus(200);
  });

  // Orders
  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const sortField = (req.query.sortField as string) || "id";
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";
    const result = await storage.getOrders(page, limit, sortField, sortOrder);
    res.json(result);
  });

  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orderData = {
      ...req.body,
      createdBy: (req.user as any).id
    };
    const order = await storage.createOrder(orderData);
    await storage.createAuditLog({
      userId: (req.user as any).id,
      action: "CREATE",
      entityType: "order",
      entityId: order.id,
      details: `Created new order for: ${order.customerName}`,
    });
    res.status(201).json(order);
  });

  app.put(api.orders.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const order = await storage.updateOrder(Number(req.params.id), req.body);
    await storage.createAuditLog({
      userId: (req.user as any).id,
      action: "UPDATE",
      entityType: "order",
      entityId: order.id,
      details: `Updated order status to: ${order.status}`,
    });
    res.json(order);
  });

  app.post("/api/orders/:id/deliver", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const order = await storage.deliverOrder(id, req.body);
    await storage.createAuditLog({
      userId: (req.user as any).id,
      action: "UPDATE",
      entityType: "order",
      entityId: order.id,
      details: `Marked order as DELIVERED. Delivered Qty: ${order.deliveredQty}`,
    });
    res.json(order);
  });

  app.get("/api/customers/lookup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const phone = req.query.phone as string;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });
    
    const { orders: allOrders } = await storage.getOrders(1, 1000);
    const customerOrder = allOrders.find(o => o.phone === phone);
    
    if (customerOrder) {
      res.json({
        customerName: customerOrder.customerName,
        state: customerOrder.state,
        district: customerOrder.district,
        taluk: customerOrder.taluk,
        village: customerOrder.village
      });
    } else {
      res.json(null);
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    await storage.deleteOrder(id);
    await storage.createAuditLog({
      userId: (req.user as any).id,
      action: "DELETE",
      entityType: "order",
      entityId: id,
      details: `Deleted order ID: ${id}`,
    });
    res.sendStatus(200);
  });

  // User Management
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    
    try {
      // Hash password before creating user
      const { password, ...userData } = req.body;
      const hashedPassword = await hashPassword(password);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    
    try {
      const id = Number(req.params.id);
      const { password, ...userData } = req.body;
      
      const updateData: any = { ...userData };
      if (password && typeof password === 'string' && password.trim() !== "") {
        updateData.password = await hashPassword(password);
      } else {
        delete updateData.password;
      }
      
      const user = await storage.updateUser(id, updateData);
      
      await storage.createAuditLog({
        userId: (req.user as any).id,
        action: "UPDATE",
        entityType: "user",
        entityId: id,
        details: `Updated user: ${user.username}`,
      });

      res.json(user);
    } catch (error: any) {
      console.error("Update user error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    await storage.deleteUser(Number(req.params.id));
    res.sendStatus(200);
  });

  // Role Management
  app.get("/api/roles", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    
    // Explicitly define base roles
    const baseRoles = ["admin", "staff", "manager"];
    
    const usersList = await storage.getUsers();
    const permissions = await db.select().from(rolePermissions);
    
    const rolesFromUsers = usersList.map(u => u.role);
    const rolesFromPermissions = permissions.map(p => p.role);
    
    const allRoles = Array.from(new Set([...baseRoles, ...rolesFromUsers, ...rolesFromPermissions]));
    res.json(allRoles);
  });

  app.post("/api/roles", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Role name is required" });
    
    // In this system, roles are defined by their presence in role_permissions or users.
    // To "create" a role, we can just initialize its permissions for at least one page.
    await storage.updateRolePermission(name, "/", { canView: true });
    res.status(201).json({ name });
  });

  app.delete("/api/roles/:role", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    const { role } = req.params;
    
    // Check if any users are using this role
    const users = await storage.getUsers();
    if (users.some(u => u.role === role)) {
      return res.status(400).json({ message: "Cannot delete role because it is assigned to users" });
    }

    // Delete permissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.role, role));
    res.sendStatus(200);
  });

  app.get("/api/roles/:role/permissions", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    const permissions = await storage.getRolePermissions(req.params.role);
    res.json(permissions);
  });

  app.post("/api/roles/:role/permissions", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    const { pagePath, ...permissions } = req.body;
    await storage.updateRolePermission(req.params.role, pagePath, permissions);
    res.sendStatus(200);
  });

  app.get("/api/my-permissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const permissions = await storage.getRolePermissions((req.user as any).role);
    res.json(permissions);
  });

  // Seed Inward
  app.get("/api/seed-inward/lots", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const categoryId = Number(req.query.categoryId);
    const varietyId = Number(req.query.varietyId);
    
    if (isNaN(categoryId) || isNaN(varietyId)) {
      return res.status(400).json({ message: "Invalid categoryId or varietyId" });
    }

    const inwardLots = await storage.getSeedInwardLots(categoryId, varietyId);
    
    // Calculate available quantity for each inward lot by checking current lots (sowing entries)
    const existingLots = await storage.getLots();
    
    const results = inwardLots.map(inward => {
      // The inward.availableQuantity is already updated in createLot/updateLot/deleteLot
      const available = Number(inward.availableQuantity);
      
      return {
        id: inward.id,
        lotNumber: inward.lotNo,
        availableQuantity: available
      };
    });

    res.json(results);
  });

  app.get(api.seedInward.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const seedInwards = await storage.getSeedInwards();
    res.json(seedInwards);
  });

  app.post(api.seedInward.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const result = await storage.createSeedInward(req.body);
    await storage.createAuditLog({
      userId: (req.user as any).id,
      action: "CREATE",
      entityType: "seed_inward",
      entityId: result.id,
      details: `Created seed inward entry for lot: ${result.lotNo}`,
    });
    res.status(201).json(result);
  });

  app.put(api.seedInward.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const result = await storage.updateSeedInward(id, req.body);
    await storage.createAuditLog({
      userId: (req.user as any).id,
      action: "UPDATE",
      entityType: "seed_inward",
      entityId: id,
      details: `Updated seed inward entry for lot: ${result.lotNo}`,
    });
    res.json(result);
  });

  app.delete(api.seedInward.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    await storage.deleteSeedInward(id);
    await storage.createAuditLog({
      userId: (req.user as any).id,
      action: "DELETE",
      entityType: "seed_inward",
      entityId: id,
      details: `Deleted seed inward entry ID: ${id}`,
    });
    res.sendStatus(200);
  });

  // Audit Logs
  app.get("/api/audit-logs", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  app.get("/api/orders/unallocated", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const categoryId = Number(req.query.categoryId);
    const varietyId = Number(req.query.varietyId);
    
    if (isNaN(categoryId) || isNaN(varietyId)) {
      return res.status(400).json({ message: "Invalid categoryId or varietyId" });
    }

    const orders = await storage.getUnallocatedOrders(categoryId, varietyId);
    res.json(orders);
  });

  app.get("/api/orders/unallocated-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const categoryId = Number(req.query.categoryId);
    const varietyId = Number(req.query.varietyId);
    
    if (isNaN(categoryId) || isNaN(varietyId)) {
      return res.status(400).json({ message: "Invalid categoryId or varietyId" });
    }

    const count = await storage.getUnallocatedOrderCount(categoryId, varietyId);
    res.json({ count });
  });

  return httpServer;
}

async function seedDatabase() {
  const existingCategories = await storage.getCategories();
  // Seeding is disabled to prevent unwanted data on publish/restart
  return;
}
