import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create admin user (passkey-based, no password)
  const user = await prisma.user.upsert({
    where: { email: "admin@ahuja.com" },
    update: {},
    create: {
      email: "admin@ahuja.com",
      name: "Ahuja Admin",
    },
  });
  console.log("✅ Admin user created:", user.email);

  console.log("\n🎉 Seed completed!");
  console.log("\n📧 Login: Use passkey authentication");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
