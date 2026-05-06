import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create allowed users
  const users = [
    { email: "naveen.dengani@gmail.com", name: "Naveen Dangani" },
    { email: "mayank.dengani25@gmail.com", name: "Mayank Dangani" },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
      },
    });
    console.log("✅ User created:", user.email);
  }

  console.log("\n🎉 Seed completed!");
  console.log("\n📧 Login: Use passkey authentication with email and password 'passkey-auth'");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });