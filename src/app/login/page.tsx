"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState("/logo.png");

  useEffect(() => {
    setLogoUrl(`${window.location.origin}/logo.png`);
  }, []);

  const handlePasskeyLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // Get all registered credentials from DB
      const userCheck = await fetch("/api/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-all-credentials" }),
      });
      const userData = await userCheck.json();

      if (!userData.credentials?.length) {
        setError("No passkeys found. Please register first.");
        setLoading(false);
        return;
      }

      // Let browser prompt for any registered credential
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          userVerification: "preferred",
        },
      });

      if (!credential) {
        setError("Authentication cancelled");
        setLoading(false);
        return;
      }

      // Verify by credential ID
      const verifyRes = await fetch("/api/passkey/verify-by-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "authenticate", 
          credentialId: credential.id 
        }),
      });
      
      const result = await verifyRes.json();

      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Authentication failed");
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
    // Get any existing credentials to check if already registered
    const userCheck = await fetch("/api/passkey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get-all-credentials" }),
    });
    const userData = await userCheck.json();

    if (userData.credentials?.length > 0) {
      setError("Passkey already registered. Please use Sign in with Passkey.");
      return;
    }

    const rpId = window.location.hostname;
    const isLocalhost = rpId === "localhost" || rpId.includes("127.0.0.1");
    const rpName = isLocalhost ? "Ahuja Jewellers (Dev)" : "Ahuja Jewellers";

    // Hardcoded first allowed email for registration
    const email = ALLOWED_EMAILS[0];

    setError("");
    setLoading(true);

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: rpName, id: rpId },
          user: { 
            id: new TextEncoder().encode(email), 
            name: email,
            displayName: email.split("@")[0]
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

      const verifyRes = await verifyPasskey(email, "register", credential);

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
      <div className="login-card">
        <div className="login-logo">
          <img src={logoUrl} alt="Ahuja" className="login-logo-img" />
        </div>
        <p className="login-subtitle">Sign in with passkey</p>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "24px" }}>
          <button 
            type="button"
            className="btn btn-primary btn-lg" 
            onClick={handlePasskeyLogin}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Loading..." : "Sign in with Passkey"}
          </button>

          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={handleRegister}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Loading..." : "Register New Passkey"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--bg-base);
        }
        .login-card {
          background: var(--bg-card);
          border-radius: 16px;
          padding: 32px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .login-logo {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-logo-img {
          width: 100%;
          height: auto;
        }
        .login-subtitle {
          text-align: center;
          color: var(--text-muted);
          margin-bottom: 24px;
        }
        .login-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 12px;
          color: var(--danger);
          font-size: 0.875rem;
          text-align: center;
          margin-bottom: 16px;
        }
        .btn-lg {
          padding: 14px;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}