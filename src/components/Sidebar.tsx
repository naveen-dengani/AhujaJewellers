"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/ThemeProvider";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Plus,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

const navItems = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Management",
    items: [
      { href: "/dashboard/customers", label: "Customers", icon: Users },
      { href: "/dashboard/products", label: "Products", icon: Package },
    ],
  },
  {
    section: "Billing",
    items: [
      { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
      { href: "/dashboard/invoices/new", label: "New Invoice", icon: Plus },
    ],
  },
];

export default function Sidebar({ userName, isOpen, onClose }: { userName: string; isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <img 
          src="/logo.png" 
          alt="Ajuha Jewellers" 
          style={{ 
            width: 36, 
            height: 36, 
            borderRadius: "var(--radius-md)",
            objectFit: "contain",
            background: "white",
            padding: 4
          }} 
        />
        <div>
          <div className="sidebar-brand">Ajuha Jewellers</div>
          <div className="sidebar-brand-sub">Billing System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? "active" : ""}`}
                  onClick={handleNavClick}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>
              {userName}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Admin
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-icon"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn btn-ghost btn-icon"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
