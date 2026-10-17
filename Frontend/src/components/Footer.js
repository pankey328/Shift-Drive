"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Car, Shield, Clock, RotateCcw, MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  // Do not render customer footer in manager or admin portals
  if (pathname?.startsWith("/manager") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="border-t border-neutral-800 bg-neutral-950 text-neutral-400 text-sm">
      {/* Feature Highlights Bar */}
      <div className="border-b border-neutral-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider">2-Hour Safety Buffer</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Every car sanitized & checked between trips</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider">Instant 100% Refunds</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Cancel before trip start with zero penalty</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider">One-Way Rentals</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Pick up at city hub, drop off at airport</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider">24/7 Roadside SOS</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Fleet command incident assistance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Column */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black">
              <Car className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white">
              Shift<span className="text-emerald-400">Drive</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Enterprise-grade self-drive car rental mobility platform. Zero key handoffs, contactless digital inspections, and premium fleet access.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-3">Explore Fleet</h5>
          <ul className="space-y-2 text-xs">
            <li><Link href="/fleet?category=LUXURY" className="hover:text-emerald-400 transition-colors">Luxury Class</Link></li>
            <li><Link href="/fleet?category=SUV" className="hover:text-emerald-400 transition-colors">Premium SUVs</Link></li>
            <li><Link href="/fleet?category=SEDAN" className="hover:text-emerald-400 transition-colors">Executive Sedans</Link></li>
            <li><Link href="/fleet?category=HATCHBACK" className="hover:text-emerald-400 transition-colors">Urban Hatchbacks</Link></li>
          </ul>
        </div>

        {/* Customer Portal */}
        <div>
          <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-3">Customer Desk</h5>
          <ul className="space-y-2 text-xs">
            <li><Link href="/trips" className="hover:text-emerald-400 transition-colors">Manage Bookings</Link></li>
            <li><Link href="/wallet" className="hover:text-emerald-400 transition-colors">Digital Wallet Top-up</Link></li>
            <li><Link href="/kyc" className="hover:text-emerald-400 transition-colors">Driver License Verification</Link></li>
            <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Branch Manager Login</Link></li>
          </ul>
        </div>

        {/* Contact & Support */}
        <div>
          <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-3">Fleet Headquarters</h5>
          <div className="space-y-2 text-xs">
            <p className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Jaipur Airport & City Hub Centers, Rajasthan</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>support@shiftdrive.com</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>+91 SHIFT-DRIVE (24x7)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-500">
        <p>© 2026 ShiftDrive Mobility Systems. All rights reserved.</p>
      </div>
    </footer>

  );
}
