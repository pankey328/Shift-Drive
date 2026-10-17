"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import api from "@/api";
import {
  Car,
  Building2,
  ClipboardCheck,
  PlusCircle,
  ArrowRightLeft,
  Package,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Clock,
  ChevronRight,
} from "lucide-react";

function ManagerSidebarContent() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hubs, setHubs] = useState([]);
  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");

  // Role Gate
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/manager");
    } else if (
      !loading &&
      user &&
      user.role !== "HUB_ADMIN" &&
      user.role !== "SUPERADMIN"
    ) {
      router.push("/");
    }
  }, [isAuthenticated, loading, user, router]);

  // Load Station Hub Details
  useEffect(() => {
    const fetchHubs = async () => {
      try {
        const res = await api.get("/hubs");
        if (res.data?.success) {
          const allHubs = res.data.data || [];
          setHubs(allHubs);

          if (user?.role === "HUB_ADMIN") {
            const assigned = allHubs.find((h) => h.manager_id === user.userId) || allHubs[0];
            setCurrentHub(assigned);
            setSelectedHubId(assigned?.hubId || "");
          } else if (user?.role === "SUPERADMIN") {
            const defaultHub = allHubs[0];
            setCurrentHub(defaultHub);
            setSelectedHubId(defaultHub?.hubId || "");
          }
        }
      } catch (err) {
        console.error("Failed to load hubs in manager layout:", err);
      }
    };
    if (isAuthenticated) {
      fetchHubs();
    }
  }, [user, isAuthenticated]);

  const handleSelectSuperadminHub = (hubId) => {
    setSelectedHubId(hubId);
    const found = hubs.find((h) => h.hubId === hubId);
    setCurrentHub(found);
    window.dispatchEvent(new CustomEvent("superadmin-hub-change", { detail: hubId }));
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navItems = [
    {
      label: "Today's Dispatch Desk",
      href: "/manager",
      exact: true,
      icon: ClipboardCheck,
      description: "Pickups, returns & overdue alerts",
    },
    {
      label: "Lot Fleet Inventory",
      href: "/manager/fleet",
      exact: false,
      icon: Car,
      description: "Station lot status & bays",
    },
    {
      label: "Walk-In Counter POS",
      href: "/manager/pos",
      exact: false,
      icon: PlusCircle,
      description: "Instant counter reservations",
    },
    {
      label: "Inter-Hub Transfers",
      href: "/manager/transfers",
      exact: false,
      icon: ArrowRightLeft,
      description: "Deadheading fleet rebalance",
    },
    {
      label: "Station Lost & Found",
      href: "/manager/lost-found",
      exact: false,
      icon: Package,
      description: "Property vault & release ledger",
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Header & Assigned Station Badge */}
        <div className="p-5 border-b border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/manager" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white block leading-tight">
                  Shift<span className="text-blue-400">Drive</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 block">
                  Station Desk ERP
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STATION ASSIGNMENT BADGE */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                {user?.role === "SUPERADMIN" ? "Assigned Inspection Desk" : "Your Assigned Station"}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active
              </span>
            </div>

            {/* If Superadmin, allow hub switching. If Hub Manager, show their locked assigned station! */}
            {user?.role === "SUPERADMIN" ? (
              <div className="space-y-1">
                <select
                  value={selectedHubId}
                  onChange={(e) => handleSelectSuperadminHub(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {hubs.map((h) => (
                    <option key={h.hubId} value={h.hubId}>
                      📍 {h.name} ({h.city})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-purple-400 font-semibold block">
                  Superadmin Hub Override
                </span>
              </div>
            ) : (
              <div>
                <h4 className="text-xs font-bold text-white truncate">
                  📍 {currentHub?.name || "Hub Operations Center"}
                </h4>
                <p className="text-[11px] text-neutral-400 truncate">
                  {currentHub?.city} • {currentHub?.address || "Station Headquarters"}
                </p>
                <p className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span>
                    Hours: {currentHub?.opening_time?.slice(0, 5) || "06:00"} - {currentHub?.closing_time?.slice(0, 5) || "23:00"}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1.5">
          <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 px-3 block mb-2">
            Station Operations
          </span>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all group ${
                  isActive
                    ? "bg-blue-600/15 border border-blue-500/30 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "bg-neutral-800 text-neutral-400 group-hover:text-blue-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`text-xs font-semibold block truncate ${
                        isActive ? "text-white font-bold" : "text-neutral-300 group-hover:text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-neutral-500 block truncate">
                      {item.description}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-colors flex-shrink-0 ${
                    isActive ? "text-blue-400" : "text-neutral-600 group-hover:text-neutral-400"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        {/* Bottom Manager Profile Card & Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-bold text-xs text-blue-400 uppercase">
              {user?.name ? user.name[0] : "M"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider block">
                {user?.role === "SUPERADMIN" ? "Superadmin" : "Station Manager"}
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-1 border-t border-neutral-900">
            <Link
              href="/"
              target="_blank"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Customer Website</span>
              </div>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                View
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Desk</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Navigation Trigger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-neutral-950 border-b border-neutral-800 px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-white">
          Shift<span className="text-blue-400">Drive</span> Operations
        </span>
        <div className="w-8" />
      </div>
    </>
  );
}

export default function ManagerLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex overflow-hidden">
      <Suspense fallback={<div className="w-72 bg-neutral-900 border-r border-neutral-800 hidden lg:block" />}>
        <ManagerSidebarContent />
      </Suspense>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-16 lg:pt-0">
        <main className="flex-1 bg-black">
          {children}
        </main>
      </div>
    </div>
  );
}
