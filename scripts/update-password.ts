import prisma from "../src/lib/db";
import bcrypt from "bcryptjs";

async function updatePassword() {
  const email = "mayank.dengani25@gmail.com";
  const newPassword = "ahuja123";
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log("User not found. Creating user with hashed password...");
    await prisma.user.create({
      data: {
        email,
        name: "Mayank",
        password: hashedPassword,
      },
    });
    console.log("User created with hashed password!");
  } else {
    console.log("Updating existing user with hashed password...");
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
    console.log("Password updated!");
  }
}

updatePassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());