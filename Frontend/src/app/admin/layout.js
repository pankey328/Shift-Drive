"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Compass,
  Car,
  CalendarCheck,
  ShieldCheck,
  Users,
  LogOut,
  Menu,
  X,
  Gauge,
  Sparkles,
  ClipboardCheck,
  ArrowRightLeft,
} from "lucide-react";

export default function SuperadminLayout({ children }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Only SUPERADMIN allowed
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/admin");
    } else if (!loading && user && user.role !== "SUPERADMIN") {
      router.push("/manager");
    }
  }, [isAuthenticated, loading, user, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navItems = [
    {
      label: "Command Center",
      href: "/admin",
      exact: true,
      icon: LayoutDashboard,
      description: "Financial & fleet analytics",
    },
    {
      label: "Bookings & SOS",
      href: "/admin/bookings",
      exact: false,
      icon: CalendarCheck,
      description: "Master trips & incident queue",
    },
    {
      label: "Fleet Catalog",
      href: "/admin/fleet",
      exact: false,
      icon: Car,
      description: "Master fleet & transfers",
    },
    {
      label: "Station Hubs",
      href: "/admin/hubs",
      exact: true,
      icon: Building2,
      description: "Directory & provisioning",
    },
    {
      label: "Hub Info",
      href: "/admin/hub-info",
      exact: false,
      icon: Compass,
      description: "Live station telemetry & fleet",
    },
    {
      label: "KYC Verification",
      href: "/admin/kyc",
      exact: false,
      icon: ShieldCheck,
      description: "Customer DL document review",
    },
    {
      label: "User Governance",
      href: "/admin/users",
      exact: false,
      icon: Users,
      description: "Staff & customer directory",
    },
    {
      label: "Inspection Audits",
      href: "/admin/inspections",
      exact: false,
      icon: ClipboardCheck,
      description: "Pre & post trip damage audits",
    },
    {
      label: "Fleet Transfers",
      href: "/admin/transfers",
      exact: false,
      icon: ArrowRightLeft,
      description: "Inter-hub deadhead dispatch",
    },
  ];

  if (loading || !isAuthenticated || user?.role !== "SUPERADMIN") {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-neutral-400 font-medium tracking-wide">
          Verifying Enterprise Credentials...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col lg:flex-row">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:translate-x-0 flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Brand */}
          <div className="p-5 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-white tracking-wide">ShiftDrive</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Enterprise
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 block font-medium">
                  Superadmin HQ
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Operations Control
            </div>
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-start gap-3 p-3 rounded-2xl transition-all ${active
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? "text-purple-400" : "text-neutral-500"
                      }`}
                  />
                  <div>
                    <span className="text-xs font-bold block">{item.label}</span>
                    <span className="text-[10px] text-neutral-500 block leading-tight">
                      {item.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* User Profile & Sign Out Footer */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300">
                  {user?.name?.[0]?.toUpperCase() || "A"}
                </div>
                <div className="overflow-hidden">
                  <span className="text-xs font-bold text-white block truncate">
                    {user?.name || "Super Admin"}
                  </span>
                  <span className="text-[10px] text-purple-400 block truncate">
                    Enterprise Administrator
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Navbar */}
        <header className="lg:hidden p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-sm text-white">Superadmin HQ</span>
          </div>
        </header>

        {/* Child Pages */}
        <main className="flex-1 p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
