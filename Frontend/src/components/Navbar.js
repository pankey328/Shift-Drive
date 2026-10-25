"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  Car,
  Wallet,
  Calendar,
  ShieldAlert,
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  Gauge,
  Building2,
  LifeBuoy,
} from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname?.startsWith("/manager") || pathname?.startsWith("/admin")) {
    return null;
  }

  const isAuth = mounted && isAuthenticated;

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Car className="h-6 w-6 text-black" strokeWidth={2.2} />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">
              Shift<span className="text-emerald-400">Drive</span>
            </span>
            <span className="block text-[9px] font-semibold tracking-widest uppercase text-neutral-400">
              Enterprise Mobility
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
          <Link
            href="/fleet"
            className="hover:text-emerald-400 transition-colors"
          >
            Explore Fleet
          </Link>
          <Link
            href="/#hubs"
            className="hover:text-emerald-400 transition-colors"
          >
            Hub Stations
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-emerald-400 transition-colors"
          >
            How It Works
          </Link>
          {isAuth && user?.role === "CUSTOMER" && (
            <Link
              href="/trips"
              className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              My Trips
            </Link>
          )}
          <Link
            href="/support"
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
          >
            <LifeBuoy className="w-4 h-4 text-emerald-400" />
            Support
          </Link>
        </nav>

        {/* Right CTA / User State */}
        <div className="hidden md:flex items-center gap-4">
          {isAuth ? (
            <div className="flex items-center gap-3">
              {/* Wallet Badge */}
              <Link
                href="/wallet"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 text-xs font-medium text-neutral-200 transition-all hover:bg-neutral-800/60"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>₹{parseFloat(user?.wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </Link>

              {/* KYC Status Pill if unverified (Customer Only) */}
              {user?.role === "CUSTOMER" && user?.kyc_status !== "VERIFIED" && (
                <Link
                  href="/kyc"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Verify DL</span>
                </Link>
              )}

              {/* Staff Portals */}
              {user?.role === "HUB_ADMIN" && (
                <Link
                  href="/manager"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 text-xs font-semibold hover:bg-blue-600/30 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Action Desk</span>
                </Link>
              )}
              {user?.role === "SUPERADMIN" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-semibold hover:bg-purple-600/30 transition-colors"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Superadmin</span>
                </Link>
              )}

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-medium text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase">
                    {user?.name ? user.name[0] : "U"}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 border-b border-neutral-800/80 mb-1">
                      <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                      <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">
                        {user?.role}
                      </span>
                    </div>

                    {user?.role === "CUSTOMER" ? (
                      <>
                        <Link
                          href="/trips"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                        >
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          My Bookings
                        </Link>

                        <Link
                          href="/wallet"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                        >
                          <Wallet className="w-4 h-4 text-neutral-400" />
                          Wallet & Transactions
                        </Link>

                        <Link
                          href="/kyc"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4 text-neutral-400" />
                          KYC License Status
                        </Link>

                        <Link
                          href="/support"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                        >
                          <LifeBuoy className="w-4 h-4 text-emerald-400" />
                          Support Desk
                        </Link>
                      </>
                    ) : user?.role === "SUPERADMIN" ? (
                      <>
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-purple-300 hover:text-white hover:bg-purple-950/30 transition-colors"
                        >
                          <Gauge className="w-4 h-4 text-purple-400" />
                          Superadmin HQ
                        </Link>
                        <Link
                          href="/admin/bookings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                        >
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          Bookings Ledger
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/manager"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-blue-300 hover:text-white hover:bg-blue-950/30 transition-colors"
                        >
                          <Building2 className="w-4 h-4 text-blue-400" />
                          Station Dispatch Desk
                        </Link>
                        <Link
                          href="/manager/fleet"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                        >
                          <Car className="w-4 h-4 text-neutral-400" />
                          Station Fleet
                        </Link>
                      </>
                    )}

                    <Link
                      href="/reset-password"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors"
                    >
                      <User className="w-4 h-4 text-neutral-400" />
                      Change Password
                    </Link>

                    <div className="my-1 border-t border-neutral-800"></div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-all shadow-md active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu hamburger toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex md:hidden p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-950 px-4 py-6 space-y-4">
          <Link
            href="/fleet"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-neutral-300 hover:text-emerald-400"
          >
            Explore Fleet
          </Link>
          <Link
            href="/#hubs"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-neutral-300 hover:text-emerald-400"
          >
            Hub Stations
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-neutral-300 hover:text-emerald-400"
          >
            How It Works
          </Link>
          {isAuth ? (
            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Signed in as</span>
                <span className="text-xs font-semibold text-white">{user?.name}</span>
              </div>
              <Link
                href="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm text-neutral-300 hover:text-emerald-400"
              >
                Wallet (₹{user?.wallet_balance || 0})
              </Link>
              {user?.role === "CUSTOMER" ? (
                <Link
                  href="/trips"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm text-neutral-300 hover:text-emerald-400"
                >
                  My Bookings
                </Link>
              ) : (
                <Link
                  href={user?.role === "SUPERADMIN" ? "/admin" : "/manager"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm text-purple-400 hover:text-purple-300 font-semibold"
                >
                  {user?.role === "SUPERADMIN" ? "Superadmin HQ" : "Station Action Desk"}
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full text-left text-sm text-red-400 font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-neutral-800 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl border border-neutral-800 text-sm font-semibold text-white"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl bg-white text-black text-sm font-semibold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
