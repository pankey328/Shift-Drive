"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/api";
import {
  TrendingUp,
  Building2,
  Car,
  Users,
  ShieldCheck,
  RefreshCw,
  IndianRupee,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Wrench,
  Clock,
  ChevronRight,
  ShieldAlert,
  Award,
  Sparkles,
  Phone,
  Mail,
  User,
} from "lucide-react";

export default function SuperadminCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [revenuePeriod, setRevenuePeriod] = useState("daily"); // daily, weekly, monthly, all_time

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/analytics/superadmin");
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load superadmin analytics:", err);
      setError(
        err.response?.data?.message || "Failed to load executive analytics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const financial = dashboardData?.financial_overview || {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
    all_time: 0,
    total_completed_trips: 0,
  };

  const fleet = dashboardData?.fleet_overview || {
    total_vehicles: 0,
    active_trips: 0,
    ready_on_lot: 0,
    maintenance_vehicles: 0,
    utilization_rate_pct: 0,
  };

  const hubMetrics = dashboardData?.hub_metrics || [];
  const managers = dashboardData?.manager_activity || [];

  return (
    <div className="space-y-8">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>ShiftDrive Enterprise Intelligence</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Cross-station revenue analytics, nationwide fleet utilization, and station manager audit scorecards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh Analytics</span>
          </button>

          <Link
            href="/manager"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
          >
            <span>Station Action Desk</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="underline font-bold text-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* FINANCIAL OVERVIEW STRIP */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Financial Performance</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Gross completed rental revenue and financial yield across all operating hubs.
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 self-start sm:self-auto text-xs font-semibold">
            {[
              { id: "daily", label: "Today" },
              { id: "weekly", label: "This Week" },
              { id: "monthly", label: "This Month" },
              { id: "all_time", label: "All-Time" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRevenuePeriod(t.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                  revenuePeriod === t.id
                    ? "bg-purple-600 text-white shadow-sm font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Selected Period Revenue */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                {revenuePeriod === "daily"
                  ? "Today's Revenue"
                  : revenuePeriod === "weekly"
                  ? "This Week's Revenue"
                  : revenuePeriod === "monthly"
                  ? "This Month's Revenue"
                  : "All-Time Revenue"}
              </span>
              <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                ₹{Math.round(financial[revenuePeriod] || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium block">
              {revenuePeriod === "daily"
                ? "Live counter & booking collections today"
                : "Aggregated gross rental yields"}
            </span>
          </div>

          {/* Card 2: This Month Total */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Current Month Run-Rate
              </span>
              <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Activity className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
                ₹{Math.round(financial.monthly || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 block font-medium">
              Calendar month gross revenue
            </span>
          </div>

          {/* Card 3: All-Time Gross Volume */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                All-Time Enterprise Yield
              </span>
              <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400">
                <IndianRupee className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                ₹{Math.round(financial.all_time || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 block font-medium">
              Cumulative completed rentals
            </span>
          </div>

          {/* Card 4: Total Completed Trips */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Completed Rentals
              </span>
              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {financial.total_completed_trips || 0}
              </span>
              <span className="text-xs text-neutral-500 font-medium">trips</span>
            </div>
            <span className="text-[10px] text-neutral-400 block font-medium">
              Successfully checked-in & settled
            </span>
          </div>
        </div>
      </div>

      {/* FLEET UTILIZATION & HEALTH GAUGE */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-400" />
              <h3 className="text-base font-bold text-white">
                Nationwide Fleet Health & Utilization
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live distribution of vehicles across all stations, active highway rentals, and maintenance bays.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
              <span className="text-neutral-500 block text-[10px]">Utilization Rate</span>
              <span className="text-lg font-black text-blue-400 font-mono">
                {fleet.utilization_rate_pct ?? 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden flex border border-neutral-800">
            {/* Active Trips on Road */}
            <div
              className="bg-blue-500 transition-all duration-700"
              style={{
                width: `${
                  fleet.total_vehicles > 0
                    ? ((fleet.active_trips || 0) / fleet.total_vehicles) * 100
                    : 0
                }%`,
              }}
              title={`On Road: ${fleet.active_trips}`}
            />
            {/* Ready on Lot */}
            <div
              className="bg-emerald-500 transition-all duration-700"
              style={{
                width: `${
                  fleet.total_vehicles > 0
                    ? ((fleet.ready_on_lot || 0) / fleet.total_vehicles) * 100
                    : 0
                }%`,
              }}
              title={`Ready on Lot: ${fleet.ready_on_lot}`}
            />
            {/* Maintenance */}
            <div
              className="bg-amber-500 transition-all duration-700"
              style={{
                width: `${
                  fleet.total_vehicles > 0
                    ? ((fleet.maintenance_vehicles || 0) / fleet.total_vehicles) * 100
                    : 0
                }%`,
              }}
              title={`In Maintenance: ${fleet.maintenance_vehicles}`}
            />
          </div>

          {/* Metric Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                <span>Total Registered</span>
              </div>
              <span className="text-xl font-extrabold text-white font-mono block">
                {fleet.total_vehicles || 0}
              </span>
              <span className="text-[10px] text-neutral-500">Across nationwide hubs</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Active on Road</span>
              </div>
              <span className="text-xl font-extrabold text-blue-400 font-mono block">
                {fleet.active_trips || 0}
              </span>
              <span className="text-[10px] text-neutral-500">Generating live mileage</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Ready on Lot</span>
              </div>
              <span className="text-xl font-extrabold text-emerald-400 font-mono block">
                {fleet.ready_on_lot || 0}
              </span>
              <span className="text-[10px] text-neutral-500">Sanitized for dispatch</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Service Bay Buffer</span>
              </div>
              <span className="text-xl font-extrabold text-amber-400 font-mono block">
                {fleet.maintenance_vehicles || 0}
              </span>
              <span className="text-[10px] text-neutral-500">Repairs & detailing</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN SECTION: STATIONS LEADERBOARD & MANAGER SCORECARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: STATION HUB PERFORMANCE */}
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Station Hub Leaderboard ({hubMetrics.length})
                </h3>
              </div>
              <Link
                href="/admin/hubs"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                <span>Manage Hubs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {hubMetrics.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
                <Building2 className="w-8 h-8 text-neutral-600 mx-auto" />
                <p>No active stations detected.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hubMetrics.map((hub) => (
                  <div
                    key={hub.hubId}
                    className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{hub.name}</h4>
                        <span className="text-xs text-neutral-400 font-medium">
                          {hub.city} &bull; Manager:{" "}
                          <span className="text-neutral-200">
                            {hub.manager?.name || "Unassigned"}
                          </span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          ₹{Math.round(hub.hub_revenue || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-neutral-500">Gross Station Yield</span>
                      </div>
                    </div>

                    {/* Fleet pills */}
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] pt-1 border-t border-neutral-800/80">
                      <div className="bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                        <span className="text-neutral-500 block text-[9px]">Total</span>
                        <span className="font-bold text-white">{hub.total_cars}</span>
                      </div>
                      <div className="bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-800/50">
                        <span className="text-emerald-400 block text-[9px]">Ready</span>
                        <span className="font-bold text-emerald-300">{hub.operational_cars}</span>
                      </div>
                      <div className="bg-blue-950/40 p-1.5 rounded-lg border border-blue-800/50">
                        <span className="text-blue-400 block text-[9px]">On Road</span>
                        <span className="font-bold text-blue-300">{hub.cars_in_use}</span>
                      </div>
                      <div className="bg-amber-950/40 p-1.5 rounded-lg border border-amber-800/50">
                        <span className="text-amber-400 block text-[9px]">In Bay</span>
                        <span className="font-bold text-amber-300">{hub.cars_in_maintenance}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/admin/hubs"
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-all text-center block mt-3"
          >
            Provision or Configure Stations &rarr;
          </Link>
        </div>

        {/* RIGHT COLUMN: MANAGER AUDIT SCORECARD */}
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Manager Inspection Scorecard ({managers.length})
                </h3>
              </div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                Asset Protection Audit
              </span>
            </div>

            {managers.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
                <Users className="w-8 h-8 text-neutral-600 mx-auto" />
                <p>No Hub Managers registered.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {managers.map((mgr) => (
                  <div
                    key={mgr.manager_id}
                    className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                          {mgr.name?.[0]?.toUpperCase() || "M"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{mgr.name}</h4>
                          <span className="text-xs text-neutral-400">
                            Station: <strong className="text-purple-300">{mgr.hub_name}</strong>
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                        ACTIVE DISPATCHER
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-neutral-800/80">
                      <div className="flex items-center justify-between bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                        <span className="text-neutral-400 text-[11px]">Handovers Audited:</span>
                        <span className="font-mono font-bold text-white">
                          {mgr.inspections_completed || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                        <span className="text-neutral-400 text-[11px]">Damages Flagged:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {mgr.damages_caught || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/admin/users"
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-all text-center block mt-3"
          >
            Manage Enterprise Staff Directory &rarr;
          </Link>
        </div>
      </div>

      {/* QUICK EXECUTIVE ACCESS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-800">
        <Link
          href="/admin/kyc"
          className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-purple-500/40 transition-all flex items-center gap-3.5 group"
        >
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
              Customer KYC Verification Desk
            </h4>
            <span className="text-[11px] text-neutral-400 block">
              Review and verify driver licenses
            </span>
          </div>
        </Link>

        <Link
          href="/admin/hubs"
          className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-blue-500/40 transition-all flex items-center gap-3.5 group"
        >
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
              Station Infrastructure & Bays
            </h4>
            <span className="text-[11px] text-neutral-400 block">
              Provision hubs and assign managers
            </span>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-all flex items-center gap-3.5 group"
        >
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
              Enterprise User Directory
            </h4>
            <span className="text-[11px] text-neutral-400 block">
              Customer & staff role governance
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
