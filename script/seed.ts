import { db } from "../server/db";
import { users, categories, varieties, lots, seedInward } from "../shared/schema";
import { scryptSync, randomBytes } from "crypto";
import { eq } from "drizzle-orm";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("Seeding database...");

  // 1. Check if admin exists
  const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
  
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      username: "admin",
      password: hashPassword("admin123"),
      role: "admin",
      firstName: "System",
      lastName: "Administrator",
    });
    console.log("Created admin user");
  } else {
    console.log("Admin user already exists, skipping...");
  }

  // 2. Create Categories
  const catCount = await db.select().from(categories);
  if (catCount.length === 0) {
    const [vegetables] = await db.insert(categories).values({
      name: "Vegetables",
      pricePerUnit: "10.00",
      active: 1,
    }).returning();

    const [fruits] = await db.insert(categories).values({
      name: "Fruits",
      pricePerUnit: "25.00",
      active: 1,
    }).returning();

    console.log("Created categories");

    // 3. Create Varieties
    const [tomato] = await db.insert(varieties).values({
      categoryId: vegetables.id,
      name: "Tomato (Hybrid)",
      active: 1,
    }).returning();

    const [chilli] = await db.insert(varieties).values({
      categoryId: vegetables.id,
      name: "Green Chilli",
      active: 1,
    }).returning();

    const [mango] = await db.insert(varieties).values({
      categoryId: fruits.id,
      name: "Alphonso Mango",
      active: 1,
    }).returning();

    console.log("Created varieties");

    // 4. Create Seed Inward
    const [seedIn] = await db.insert(seedInward).values({
      categoryId: vegetables.id,
      varietyId: tomato.id,
      lotNo: "LOT-001",
      expiryDate: "2026-12-31",
      numberOfPackets: 100,
      totalQuantity: 1000,
      availableQuantity: 1000,
      typeOfPackage: "Packet",
      receivedFrom: "Seed Corp",
    }).returning();

    console.log("Created seed inward");

    // 5. Create Lots
    await db.insert(lots).values({
      lotNumber: "LOT-001",
      seedInwardId: seedIn.id,
      categoryId: vegetables.id,
      varietyId: tomato.id,
      sowingDate: new Date().toISOString().split('T')[0],
      seedsSown: 500,
      packetsSown: 50,
      damaged: 10,
      damagePercentage: "2.00",
      expectedReadyDate: "2026-05-22",
      remarks: "Initial test lot",
    });

    console.log("Created lots");
  } else {
    console.log("Categories already exist, skipping sample data...");
  }

  console.log("Seeding completed successfully!");
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
