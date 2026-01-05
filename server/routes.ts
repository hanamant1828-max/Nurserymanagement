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
    // Simple validation for booking logic could go here
    const order = await storage.createOrder(req.body);
    res.status(201).json(order);
  });

  app.put(api.orders.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const order = await storage.updateOrder(Number(req.params.id), req.body);
    res.json(order);
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const categories = await storage.getCategories();
  if (categories.length === 0) {
    const watermelon = await storage.createCategory({ name: "Watermelon", active: true });
    const tomato = await storage.createCategory({ name: "Tomato", active: true });
    
    const v1 = await storage.createVariety({ categoryId: watermelon.id, name: "Sugar Baby", active: true });
    const v2 = await storage.createVariety({ categoryId: tomato.id, name: "Roma", active: true });

    const lot = await storage.createLot({
      lotNumber: "LOT-001",
      categoryId: watermelon.id,
      varietyId: v1.id,
      sowingDate: new Date().toISOString().split('T')[0],
      seedsSown: 1000,
      damaged: 0,
      expectedReadyDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      remarks: "Initial seed lot"
    });
  }
}
