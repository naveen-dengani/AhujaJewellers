import Link from "next/link";

export default function Home() {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      gap: "1rem"
    }}>
      <h1>Welcome to Ahuja Jewellers</h1>
      <Link href="/login">Go to Login</Link>
      <Link href="/dashboard">Go to Dashboard</Link>
    </div>
  );
}
