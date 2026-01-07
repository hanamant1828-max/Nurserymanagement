import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up Passport auth
  setupAuth(app);

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
    const lot = await storage.createLot(req.body);
    res.status(201).json(lot);
  });

  app.put(api.lots.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lot = await storage.updateLot(Number(req.params.id), req.body);
    res.json(lot);
  });

  // Orders
  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.delete(api.lots.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);

    // Check for associated orders
    const orders = await storage.getOrders();
    const hasOrders = orders.some(o => o.lotId === id);
    if (hasOrders) {
      return res.status(400).json({ 
        message: "Cannot delete lot because it has associated customer orders. Please delete the orders first." 
      });
    }

    await storage.deleteLot(id);
    res.sendStatus(200);
  });

  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orderData = {
      ...req.body,
      createdBy: (req.user as any).id
    };
    const order = await storage.createOrder(orderData);
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

  app.delete(api.orders.delete.path || "/api/orders/:id", async (req, res) => {
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
    const user = await storage.createUser(req.body);
    res.status(201).json(user);
  });

  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    await storage.deleteUser(Number(req.params.id));
    res.sendStatus(200);
  });

  // Audit Logs
  app.get("/api/audit-logs", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.sendStatus(403);
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  // Seed Data - Run in background to avoid blocking server startup
  seedDatabase().catch(err => {
    console.error("Failed to seed database:", err);
  });

  return httpServer;
}

async function seedDatabase() {
  const existingCategories = await storage.getCategories();
  if (existingCategories.length < 15) {
    const categoriesToCreate = [
      { name: "Watermelon", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=100&q=80" },
      { name: "Tomato", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=100&q=80" },
      { name: "Green Chili", image: "https://images.unsplash.com/photo-1588253518679-119c709cbef5?auto=format&fit=crop&w=100&q=80" },
      { name: "Eggplant", image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=100&q=80" },
      { name: "Cucumber", image: "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=100&q=80" },
      { name: "Bell Pepper", image: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=100&q=80" },
      { name: "Cabbage", image: "https://images.unsplash.com/photo-1550258114-b83033991628?auto=format&fit=crop&w=100&q=80" },
      { name: "Cauliflower", image: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=100&q=80" },
      { name: "Broccoli", image: "https://images.unsplash.com/photo-1453360994457-13d704300f98?auto=format&fit=crop&w=100&q=80" },
      { name: "Onion", image: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=100&q=80" },
      { name: "Garlic", image: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=100&q=80" },
      { name: "Ginger", image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=100&q=80" },
      { name: "Carrot", image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=100&q=80" },
      { name: "Radish", image: "https://images.unsplash.com/photo-1590779033100-9f60702a053b?auto=format&fit=crop&w=100&q=80" },
      { name: "Spinach", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=100&q=80" }
    ];

    for (const catData of categoriesToCreate) {
      const category = await storage.createCategory({ name: catData.name, image: catData.image, active: true });
      
      for (let i = 1; i <= 5; i++) {
        const variety = await storage.createVariety({ 
          categoryId: category.id, 
          name: `${category.name} Variety ${i}`, 
          active: true 
        });

        for (let j = 1; j <= 4; j++) {
          const lot = await storage.createLot({
            lotNumber: `LOT-${category.name.substring(0, 2).toUpperCase()}-${variety.id}-${j}`,
            categoryId: category.id,
            varietyId: variety.id,
            sowingDate: "2025-12-01",
            seedsSown: 1000,
            damaged: 10,
            expectedReadyDate: "2026-02-01",
            remarks: "Batch seeding"
          });

          for (let k = 1; k <= 10; k++) {
            await storage.createOrder({
              lotId: lot.id,
              customerName: `Customer ${k} for ${lot.lotNumber}`,
              phone: `90000000${k}`,
              village: "Seeded Village",
              bookedQty: 5,
              advanceAmount: "100",
              paymentMode: "Cash",
              deliveryDate: "2026-02-15",
              status: "BOOKED"
            });
          }
        }
      }
    }
  }
}
