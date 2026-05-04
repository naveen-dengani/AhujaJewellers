import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@ajuha.com" },
    update: {},
    create: {
      email: "admin@ajuha.com",
      password: hashedPassword,
      name: "Ajuha Admin",
    },
  });
  console.log("✅ User created:", user.email);

  // Create sample customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { phone_userId: { phone: "9876543210", userId: user.id } },
      update: {},
      create: {
        name: "Rajesh Kumar",
        phone: "9876543210",
        notes: "Regular customer, prefers gold jewellery",
        userId: user.id,
      },
    }),
    prisma.customer.upsert({
      where: { phone_userId: { phone: "9876543211", userId: user.id } },
      update: {},
      create: {
        name: "Priya Sharma",
        phone: "9876543211",
        notes: "Wholesale buyer",
        userId: user.id,
      },
    }),
    prisma.customer.upsert({
      where: { phone_userId: { phone: "9876543212", userId: user.id } },
      update: {},
      create: {
        name: "Amit Patel",
        phone: "9876543212",
        userId: user.id,
      },
    }),
  ]);
  console.log(`✅ ${customers.length} customers created`);

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { name_userId: { name: "Gold Chain 22K", userId: user.id } },
      update: {},
      create: {
        name: "Gold Chain 22K",
        defaultPrice: 45000,
        description: "22 Karat gold chain, standard weight",
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { name_userId: { name: "Silver Bracelet", userId: user.id } },
      update: {},
      create: {
        name: "Silver Bracelet",
        defaultPrice: 3500,
        description: "Pure silver bracelet",
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { name_userId: { name: "Gold Ring 18K", userId: user.id } },
      update: {},
      create: {
        name: "Gold Ring 18K",
        defaultPrice: 18000,
        description: "18 Karat gold ring",
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { name_userId: { name: "Diamond Pendant", userId: user.id } },
      update: {},
      create: {
        name: "Diamond Pendant",
        defaultPrice: 75000,
        description: "Diamond pendant with gold setting",
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { name_userId: { name: "Gold Earrings 22K", userId: user.id } },
      update: {},
      create: {
        name: "Gold Earrings 22K",
        defaultPrice: 25000,
        description: "22K gold earrings pair",
        userId: user.id,
      },
    }),
  ]);
  console.log(`✅ ${products.length} products created`);

  console.log("\n🎉 Seed completed!");
  console.log("\n📧 Login credentials:");
  console.log("   Email: admin@ajuha.com");
  console.log("   Password: admin123\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
