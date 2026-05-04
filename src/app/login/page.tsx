"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with:", email, password);
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("SignIn response:", result);

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        console.log("Redirecting to dashboard");
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("SignIn error:", err);
      setError("Error: " + String(err));
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      {/* Background effects */}
      <div
        className="login-bg-effect"
        style={{
          background: "var(--primary)",
          top: "-100px",
          right: "-100px",
        }}
      />
      <div
        className="login-bg-effect"
        style={{
          background: "var(--primary-dark)",
          bottom: "-150px",
          left: "-100px",
          width: "300px",
          height: "300px",
        }}
      />

      <div className="login-card">
        <img 
          src="/logo.png" 
          alt="Ajuha Jewellers" 
          style={{ 
            width: 72, 
            height: 72, 
            borderRadius: "var(--radius-lg)", 
            objectFit: "contain", 
            margin: "0 auto 1.5rem",
            background: "white",
            padding: 8
          }} 
        />
        <h1 className="login-title">Ajuha Jewellers</h1>
        <p className="login-subtitle">Sign in to your billing dashboard</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem",
                color: "var(--danger)",
                fontSize: "0.875rem",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? <div className="spinner" /> : "Sign In"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginTop: "1.5rem",
          }}
        >
          Secure billing system for authorized users only
        </p>
      </div>
    </div>
  );
}
