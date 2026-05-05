import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { signIn } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, action, credential } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { credentials: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "register") {
      if (!credential) {
        return NextResponse.json({ error: "Missing credential" }, { status: 400 });
      }

      const credId = credential.id;
      const pubKey = JSON.stringify(credential.response?.attestationObject || {});

      await prisma.passkeyCredential.create({
        data: {
          id: credId,
          userId: user.id,
          credentialId: credId,
          publicKey: pubKey,
          counter: 0,
          deviceType: "singleDevice",
          backedUp: credential.backedUp || false,
          transports: credential.transports ? JSON.stringify(credential.transports) : null,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "authenticate") {
      if (!user.credentials.length) {
        return NextResponse.json({ error: "No passkeys registered" }, { status: 404 });
      }

      if (!credential) {
        return NextResponse.json({ error: "Missing credential" }, { status: 400 });
      }

      const credId = credential.id;
      const storedCred = user.credentials.find(c => c.credentialId === credId);
      
      if (!storedCred) {
        return NextResponse.json({ error: "Credential not recognized" }, { status: 401 });
      }

      const result = await signIn("credentials", {
        email: normalizedEmail,
        password: "passkey-auth",
        redirect: false,
      });

      if (result?.error) {
        return NextResponse.json({ error: "Login failed" }, { status: 401 });
      }

      return NextResponse.json({ success: true, userId: user.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Passkey verify error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}