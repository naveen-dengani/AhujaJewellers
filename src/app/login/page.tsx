"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_EMAILS = [
  "naveen.dengani@gmail.com",
  "mayank.dengani25@gmail.com",
];

async function verifyPasskey(email: string, action: string, credential: Credential) {
  const res = await fetch("/api/passkey/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, action, credential }),
  });
  return res.json();
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasskeyLogin = async () => {
    if (!email) {
      setError("Please enter your email first");
      return;
    }

    const normalizedEmail = email.toLowerCase();
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      setError("Email not allowed");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // First get the user to see their registered credentials
      const userCheck = await fetch("/api/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, action: "get-credentials" }),
      });
      const userData = await userCheck.json();

      const allowCredentials = userData.credentials?.length > 0 
        ? userData.credentials.map((c: { credentialId: string }) => ({ 
            type: "public-key", 
            id: c.credentialId 
          }))
        : [];

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: allowCredentials.length > 0 ? allowCredentials : [],
          userVerification: "preferred",
        },
      });

      if (!credential) {
        setError("Authentication cancelled");
        setLoading(false);
        return;
      }

      const verifyRes = await verifyPasskey(normalizedEmail, "authenticate", credential);
      
      if (verifyRes.success) {
        router.push("/dashboard");
      } else {
        setError(verifyRes.error || "Authentication failed");
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      if (errorObj.name === "NotAllowedError") {
        setError("Passkey authentication cancelled");
      } else {
        console.error("Passkey error:", err);
        setError(errorObj.message || "Passkey authentication failed");
      }
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email) {
      setError("Please enter your email first");
      return;
    }

    const normalizedEmail = email.toLowerCase();
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      setError("Email not allowed");
      return;
    }

    const rpId = window.location.hostname;
    const isLocalhost = rpId === "localhost" || rpId.includes("127.0.0.1");
    const rpName = isLocalhost ? "Ahuja Jewellers (Dev)" : "Ahuja Jewellers";

    setError("");
    setLoading(true);

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: rpName, id: rpId },
          user: { 
            id: new TextEncoder().encode(normalizedEmail), 
            name: normalizedEmail,
            displayName: normalizedEmail.split("@")[0]
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
        },
      });

      if (!credential) {
        setError("Registration cancelled");
        setLoading(false);
        return;
      }

      const verifyRes = await verifyPasskey(normalizedEmail, "register", credential);

      if (verifyRes.success) {
        alert("Passkey registered! You can now sign in with passkey.");
      } else {
        setError(verifyRes.error || "Registration failed");
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      if (errorObj.name === "NotAllowedError") {
        setError("Passkey registration cancelled");
      } else {
        console.error("Registration error:", err);
        setError(errorObj.message || "Failed to register passkey");
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-bg-effect" style={{ background: "var(--primary)", top: "-100px", right: "-100px" }} />
      <div className="login-bg-effect" style={{ background: "var(--primary-dark)", bottom: "-150px", left: "-100px", width: 300, height: 300 }} />

      <div className="login-card">
        <img src="/logo.png" alt="Ahuja Jewellers" style={{ width: 72, height: 72, borderRadius: "var(--radius-lg)", objectFit: "contain", margin: "0 auto 1.5rem", background: "white", padding: 8 }} />
        <h1 className="login-title">Ahuja Jewellers</h1>
        <p className="login-subtitle">Sign in with passkey</p>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-md)", padding: "0.75rem", color: "var(--danger)", fontSize: "0.875rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="email id" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>

          <button type="button" className="btn btn-primary btn-lg" onClick={handlePasskeyLogin} disabled={loading} style={{ width: "100%" }}>
            {loading ? <div className="spinner" /> : "Sign in with Passkey"}
          </button>

          <button type="button" className="btn btn-secondary" onClick={handleRegister} disabled={loading} style={{ width: "100%" }}>
            {loading ? <div className="spinner" /> : "Register New Passkey"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>
          
        </p>
      </div>
    </div>
  );
}