"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === "loading") {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh",
        color: "var(--text-muted)"
      }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={closeSidebar}
      />

      <Sidebar
        userName={session.user?.name || "User"}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="mobile-header">
        <div className="mobile-header-left">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <img 
            src="/logo.png" 
            alt="Ajuha Jewellers" 
            style={{ 
              width: 32, 
              height: 32, 
              borderRadius: "var(--radius-md)",
              objectFit: "contain",
              background: "white",
              padding: 2
            }} 
          />
          <span className="mobile-brand">Ajuha Jewellers</span>
        </div>
      </div>

      <main className="main-content">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardContent>{children}</DashboardContent>;
}
