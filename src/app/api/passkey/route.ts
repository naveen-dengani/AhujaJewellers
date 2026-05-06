import { NextResponse } from "next/server";
import prisma from "@/lib/db";

const ALLOWED_EMAILS = [
  "naveen.dengani@gmail.com",
  "mayank.dengani25@gmail.com",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, action } = body;

    // Handle get-all-credentials action
    if (action === "get-all-credentials") {
      const allCredentials = await prisma.passkeyCredential.findMany({
        select: {
          credentialId: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      });
      
      const credentials = allCredentials
        .filter(c => ALLOWED_EMAILS.includes(c.user.email.toLowerCase()))
        .map(c => ({
          credentialId: c.credentialId,
          email: c.user.email,
        }));
      
      return NextResponse.json({ credentials });
    }

    if (!email || !ALLOWED_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { credentials: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: normalizedEmail.split("@")[0],
        },
        include: { credentials: true },
      });
    }

    if (action === "register" || action === "authenticate") {
      if (action === "authenticate" && user.credentials.length === 0) {
        return NextResponse.json({ error: "No passkeys registered", needsRegistration: true }, { status: 404 });
      }

      if (action === "get-credentials") {
        const creds = user.credentials.map(c => ({
          credentialId: c.credentialId,
          deviceType: c.deviceType,
        }));
        return NextResponse.json({ credentials: creds });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Passkey error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}