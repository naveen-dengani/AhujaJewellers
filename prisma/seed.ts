import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create admin user only
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
  console.log("✅ Admin user created:", user.email);

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
