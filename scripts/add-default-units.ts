import prisma from "../src/lib/db";

async function addDefaultUnits() {
  const defaultUnits = ["kg", "line", "packet", "dozen", "gram"];
  
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }

  for (const unitName of defaultUnits) {
    const existing = await prisma.unit.findFirst({
      where: { name: unitName, userId: user.id },
    });

    if (!existing) {
      await prisma.unit.create({
        data: { name: unitName, userId: user.id },
      });
      console.log(`Created unit: ${unitName}`);
    }
  }
  
  console.log("Default units added!");
}

addDefaultUnits()
  .catch(console.error)
  .finally(() => prisma.$disconnect());