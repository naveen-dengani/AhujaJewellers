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
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Products", href: "/dashboard/products", icon: Package },
];

export default function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setLogoUrl(`${window.location.origin}/logo.png`);
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  return (
    <>
      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          className="icon-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <Link href="/dashboard" className="mobile-brand">
          <img src={logoUrl} alt="Ahuja" className="logo-img" />
        </Link>
        <Link 
          href="/dashboard/invoices/new" 
          className="icon-btn primary"
          aria-label="New invoice"
        >
          <Plus size={22} />
        </Link>
      </header>

      {/* Overlay - only on mobile */}
      {isOpen && !isDesktop && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar - Slide from left */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          {!isDesktop && (
            <button 
              className="icon-btn"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </button>
          )}
          <div className="brand">
            <img src={logoUrl} alt="Ahuja" className="logo-img" />
            <div className="brand-text">
              <span className="brand-name">Ahuja</span>
              <span className="brand-sub">Jewellers</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {userName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
              <span className="user-email">Admin</span>
            </div>
          </div>
          <div className="user-actions">
            <button
              onClick={toggleTheme}
              className="icon-btn ghost"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="icon-btn ghost"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}