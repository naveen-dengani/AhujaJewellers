"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState("/logo.png");

  useEffect(() => {
    setLogoUrl(`${window.location.origin}/logo.png`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img src={logoUrl} alt="Ahuja" className="login-logo-img" />
        </div>
        <p className="login-subtitle">Sign in</p>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "24px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          <button 
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
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
        .login-input {
          width: 100%;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 1rem;
          background: var(--bg-base);
          color: var(--text-main);
        }
        .login-input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .btn-lg {
          padding: 14px;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}