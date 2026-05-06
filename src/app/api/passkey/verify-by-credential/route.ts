import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { signIn } from "@/lib/auth";

const ALLOWED_EMAILS = [
  "naveen.dengani@gmail.com",
  "mayank.dengani25@gmail.com",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, credentialId } = body;

    if (action === "authenticate") {
      if (!credentialId) {
        return NextResponse.json({ error: "Missing credentialId" }, { status: 400 });
      }

      // Find user by credential ID
      const credential = await prisma.passkeyCredential.findFirst({
        where: { credentialId },
        include: { user: true },
      });

      if (!credential) {
        return NextResponse.json({ error: "Credential not recognized" }, { status: 401 });
      }

      const email = credential.user.email.toLowerCase();
      
      // Verify email is allowed
      if (!ALLOWED_EMAILS.includes(email)) {
        return NextResponse.json({ error: "Email not allowed" }, { status: 401 });
      }

      // Sign in the user
      const result = await signIn("credentials", {
        email,
        password: "passkey-auth",
        redirect: false,
      });

      if (result?.error) {
        return NextResponse.json({ error: "Login failed" }, { status: 401 });
      }

      return NextResponse.json({ success: true, userId: credential.userId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Passkey verify error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}