"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PushNotificationButton } from "@/components/admin/push-notification-button";
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  Factory,
  Wheat,
  ShoppingBag,
  Users,
  Handshake,
  CreditCard,
  BookOpen,
  BarChart3,
  UserCheck,
  Sliders,
  FileText,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface AdminShellProps {
  admin: {
    id: string;
    phone: string;
    name: string | null;
    isOwner: boolean;
    permissions: string[];
  };
  children: React.ReactNode;
}

export function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard, permission: "dashboard_view" },
    { label: "Products", href: "/admin/products", icon: Package, permission: "products_view" },
    { label: "Categories", href: "/admin/categories", icon: Layers, permission: "categories_manage" },
    { label: "Inventory", href: "/admin/inventory", icon: Boxes, permission: "inventory_view" },
    { label: "Production", href: "/admin/production", icon: Factory, permission: "production_view" },
    { label: "Raw Materials", href: "/admin/raw-materials", icon: Wheat, permission: "inventory_view" },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag, permission: "orders_view" },
    { label: "CRM Pipeline", href: "/admin/crm", icon: Handshake, permission: "customers_view" },
    { label: "Customers", href: "/admin/customers", icon: Users, permission: "customers_view" },
    { label: "Credit Book", href: "/admin/credit", icon: BookOpen, permission: "customers_view" },
    { label: "Payments", href: "/admin/payments", icon: CreditCard, permission: "payments_view" },
    { label: "Sales Reports", href: "/admin/reports", icon: BarChart3, permission: "reports_view" },
    { label: "Staff & Permissions", href: "/admin/staff", icon: UserCheck, permission: "staff_manage" },
    { label: "Settings", href: "/admin/settings", icon: Sliders, permission: "settings_manage" },
    { label: "Activity Logs", href: "/admin/audit", icon: FileText, permission: "audit_view" },
  ];
  const visibleNavItems = navItems.filter(
    (item) => admin.isOwner || admin.permissions.includes(item.permission),
  );

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
    }
  };

  return (
    <div className="admin-shell" style={{ display: "flex", minHeight: "100vh", background: "#FAF7F0", color: "#17251F" }}>
      {/* Sidebar Desktop */}
      <aside
        style={{
          width: "260px",
          flexShrink: 0,
          background: "#073D2E",
          color: "#FAFAF5",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(201, 154, 74, 0.2)",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 40,
        }}
        className="hidden lg:flex"
      >
        {/* Brand */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#C99A4A",
              color: "#073D2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "18px",
            }}>
              M
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.02em", color: "#FFFFFF" }}>
                Milano Foods
              </div>
              <div style={{ fontSize: "10px", color: "#C99A4A", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Factory Management
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "grid", gap: "4px" }}>
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#FFFFFF" : "#C4D4CA",
                  background: isActive ? "rgba(201, 154, 74, 0.25)" : "transparent",
                  borderLeft: isActive ? "3px solid #C99A4A" : "3px solid transparent",
                  transition: "all 0.18s ease",
                  textDecoration: "none",
                }}
              >
                <Icon size={17} style={{ color: isActive ? "#C99A4A" : "#8DA396" }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User bar & Logout */}
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {admin.name || "Administrator"}
              </div>
              <div style={{ fontSize: "11px", color: "#9CB2A5", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{admin.phone}</span>
                <span style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: admin.isOwner ? "#C99A4A" : "rgba(255,255,255,0.15)",
                  color: admin.isOwner ? "#073D2E" : "#FFFFFF",
                  fontSize: "9px",
                  fontWeight: 800,
                }}>
                  {admin.isOwner ? "OWNER" : "STAFF"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              href="/"
              target="_blank"
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "7px 10px",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.08)",
                color: "#C4D4CA",
                fontSize: "11px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <ExternalLink size={13} />
              Website
            </Link>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "4px",
                background: "#991B1B",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              <LogOut size={13} />
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>
        {/* Top Navbar */}
        <header style={{
          height: "64px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E8E1D5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }} className="admin-topbar">
          <div className="admin-breadcrumb" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden"
              aria-label="Open admin navigation"
              aria-expanded={mobileOpen}
              aria-controls="admin-mobile-navigation"
              style={{
                background: "none",
                border: "none",
                padding: "6px",
                color: "#073D2E",
                cursor: "pointer",
                display: "flex",
              }}
            >
              <Menu size={22} />
            </button>
            <div className="admin-breadcrumb-label" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#777C75" }}>
              <span className="admin-breadcrumb-brand" style={{ fontWeight: 700, color: "#073D2E" }}>Milano Operations</span>
              <ChevronRight size={14} />
              <span style={{ textTransform: "capitalize" }}>
                {pathname === "/admin" ? "Overview" : pathname?.replace("/admin/", "").replace(/-/g, " ")}
              </span>
            </div>
          </div>

          <div className="admin-topbar-actions" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <PushNotificationButton app="admin" />
            <div className="admin-location-badge" style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "20px",
              background: "#E8F5E9",
              color: "#1B5E20",
              fontSize: "11px",
              fontWeight: 700,
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2E7D32" }} />
              Main Factory Warehouse (Addis Ababa)
            </div>

            <Link
              href="/"
              target="_blank"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #DED8CC",
                background: "#FFFFFF",
                color: "#073D2E",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <ExternalLink size={13} />
              <span>Storefront</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-main" style={{ flex: 1, padding: "28px 24px 60px", maxWidth: "1400px", width: "100%", margin: "0 auto" }}>
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }}
          />
          <div
            id="admin-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            style={{
            position: "relative",
            width: "280px",
            maxWidth: "80%",
            background: "#073D2E",
            color: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            zIndex: 10,
          }} className="admin-mobile-drawer">
            <div style={{
              padding: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}>
              <div style={{ fontWeight: 800, fontSize: "16px" }}>Milano Foods</div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin navigation"
                style={{ background: "none", border: "none", color: "#FFFFFF", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <nav style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: isActive ? "#FFFFFF" : "#C4D4CA",
                      background: isActive ? "rgba(201,154,74,0.25)" : "transparent",
                      textDecoration: "none",
                    }}
                  >
                    <Icon size={18} style={{ color: isActive ? "#C99A4A" : "#8DA396" }} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  background: "#991B1B",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
