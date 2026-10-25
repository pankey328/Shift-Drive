"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/api";
import Link from "next/link";
import {
  CalendarCheck,
  Search,
  RefreshCw,
  Loader2,
  Building2,
  Car,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  Clock,
  MapPin,
  IndianRupee,
  Phone,
  Mail,
  User,
  ArrowRight,
  ChevronDown,
  Layers,
  AlertOctagon,
  Eye,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import Pagination from "@/components/Pagination";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [hubFilter, setHubFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  // Debounce search input (800ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Inspect Modal
  const [inspectBooking, setInspectBooking] = useState(null);

  // Emergency Resolution Modal
  const [resolvingEmergency, setResolvingEmergency] = useState(null);
  const [resolutionOutcome, setResolutionOutcome] = useState("COMPLETED"); // COMPLETED or CANCELLED
  const [incidentNotes, setIncidentNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [submittingEmergency, setSubmittingEmergency] = useState(false);
  const [emergencyError, setEmergencyError] = useState("");
  const [emergencySuccess, setEmergencySuccess] = useState("");

  // Force Cancel Modal
  const [forceCancellingBooking, setForceCancellingBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [refundToWallet, setRefundToWallet] = useState(true);
  const [submittingForceCancel, setSubmittingForceCancel] = useState(false);
  const [forceCancelError, setForceCancelError] = useState("");
  const [forceCancelSuccess, setForceCancelSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        hubId: hubFilter !== "ALL" ? hubFilter : undefined,
      };

      const [allRes, emergRes, hubsRes] = await Promise.all([
        api.get("/bookings/admin/all", { params }),
        api.get("/bookings/admin/emergencies"),
        api.get("/hubs"),
      ]);

      if (allRes.data?.success) {
        setBookings(allRes.data.data || []);
        if (allRes.data.pagination) {
          setPagination(allRes.data.pagination);
        } else {
          setPagination({
            totalItems: allRes.data.data?.length || 0,
            totalPages: 1,
            currentPage: 1,
            limit,
          });
        }
      }
      if (emergRes.data?.success) {
        setEmergencies(emergRes.data.data || []);
      }
      if (hubsRes.data?.success) {
        setHubs(hubsRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load bookings ledger:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, hubFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleResolveEmergency = async (e) => {
    e.preventDefault();
    if (!resolvingEmergency) return;

    setSubmittingEmergency(true);
    setEmergencyError("");
    setEmergencySuccess("");

    try {
      const payload = {
        resolution: resolutionOutcome,
        incidentNotes: incidentNotes.trim() || `Emergency resolved as ${resolutionOutcome}.`,
        refundAmount: parseFloat(refundAmount) || 0,
      };

      const res = await api.patch(
        `/bookings/admin/${resolvingEmergency.bookingId}/resolve-emergency`,
        payload
      );

      if (res.data?.success) {
        setEmergencySuccess(res.data.message || "Emergency incident resolved successfully.");
        setTimeout(() => {
          setResolvingEmergency(null);
          setEmergencySuccess("");
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setEmergencyError(err.response?.data?.message || "Failed to resolve emergency.");
    } finally {
      setSubmittingEmergency(false);
    }
  };

  const handleForceCancel = async (e) => {
    e.preventDefault();
    if (!forceCancellingBooking) return;

    setSubmittingForceCancel(true);
    setForceCancelError("");
    setForceCancelSuccess("");

    try {
      const payload = {
        cancellationReason:
          cancellationReason.trim() || "Administrative override by Superadmin.",
        refundToWallet,
      };

      const res = await api.patch(
        `/bookings/admin/${forceCancellingBooking.bookingId}/force-cancel`,
        payload
      );

      if (res.data?.success) {
        setForceCancelSuccess(
          res.data.message || "Booking has been administratively force-cancelled."
        );
        setTimeout(() => {
          setForceCancellingBooking(null);
          setForceCancelSuccess("");
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setForceCancelError(err.response?.data?.message || "Failed to force cancel booking.");
    } finally {
      setSubmittingForceCancel(false);
    }
  };

  // Bookings list (already filtered by backend query)
  const filteredBookings = bookings;

  // KPI calculations
  const totalBookingsCount = bookings.length;
  const activeTripsCount = bookings.filter((b) => b.status === "ACTIVE_TRIP").length;
  const emergencyHoldsCount = emergencies.length;
  const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;
  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span>Master Trips & Operations Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Enterprise Bookings & Incident Operations
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Global ledger of customer reservations, real-time emergency SOS incident queue, and administrative cancellation overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Bookings Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* High-Priority Emergency SOS Incidents Banner (if any active) */}
      {emergencies.length > 0 && (
        <div className="p-5 rounded-3xl bg-red-950/30 border border-red-800/80 space-y-3.5 shadow-xl shadow-red-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-600 text-white animate-pulse">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Active Emergency SOS Incidents ({emergencies.length})
                </h3>
                <p className="text-xs text-red-300">
                  Customer safety holds requiring immediate administrative intervention and vehicle recovery.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-red-600/30 text-red-200 border border-red-500/40">
              URGENT ACTION DESK
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {emergencies.map((em) => (
              <div
                key={em.bookingId}
                className="p-4 rounded-2xl bg-neutral-950/90 border border-red-800/50 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {em.Customer?.name || "Customer"}
                    </span>
                    <span className="font-mono text-xs text-red-400 font-bold">
                      {em.Vehicle?.plate_number}
                    </span>
                  </div>
                  <div className="text-neutral-400 text-[11px] flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-red-400" />
                    <span>{em.Customer?.phone || "No phone listed"}</span>
                  </div>
                  <div className="text-neutral-400 text-[11px] flex items-center gap-2">
                    <Car className="w-3.5 h-3.5 text-neutral-500" />
                    <span>
                      {em.Vehicle?.make} {em.Vehicle?.model}
                    </span>
                  </div>
                  {em.incident_notes && (
                    <div className="p-2 rounded-xl bg-red-950/40 border border-red-900/60 text-[10px] text-red-300 mt-1">
                      <strong>Report:</strong> {em.incident_notes}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResolvingEmergency(em);
                    setResolutionOutcome("COMPLETED");
                    setIncidentNotes(em.incident_notes || "");
                    setRefundAmount(0);
                    setEmergencyError("");
                    setEmergencySuccess("");
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Resolve & Clear Emergency Hold</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Total Bookings</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalBookingsCount}</div>
          <p className="text-[10px] text-neutral-500">Lifecycle customer ledger</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Active on Road</span>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-blue-400">{activeTripsCount}</div>
          <p className="text-[10px] text-neutral-500">Currently in customer custody</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Emergency Holds</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400">{emergencyHoldsCount}</div>
          <p className="text-[10px] text-neutral-500">SOS interventions pending</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Completed Trips</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{completedCount}</div>
          <p className="text-[10px] text-neutral-500">Successfully returned</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Cancelled Trips</span>
            <XCircle className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-black text-neutral-400">{cancelledCount}</div>
          <p className="text-[10px] text-neutral-500">User or administrative overrides</p>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer name, phone, plate, booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Hub Filter */}
          <div className="relative">
            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-purple-500 cursor-pointer pr-8"
            >
              <option value="ALL">All Pickup Stations ({hubs.length})</option>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  {h.name} ({h.city})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Status Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          {[
            { key: "ALL", label: "All Bookings", count: totalBookingsCount },
            { key: "ACTIVE_TRIP", label: "Active Trips", count: activeTripsCount },
            { key: "EMERGENCY_HOLD", label: "Emergency SOS", count: emergencyHoldsCount },
            { key: "CONFIRMED", label: "Confirmed", count: bookings.filter((b) => b.status === "CONFIRMED").length },
            { key: "COMPLETED", label: "Completed", count: completedCount },
            { key: "CANCELLED", label: "Cancelled", count: cancelledCount },
            { key: "PENDING_PAYMENT", label: "Pending Payment", count: bookings.filter((b) => b.status === "PENDING_PAYMENT").length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? tab.key === "EMERGENCY_HOLD"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                    : "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  statusFilter === tab.key
                    ? "bg-black/30 text-white"
                    : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Ledger Table */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Loading master bookings ledger...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <CalendarCheck className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No Reservations Match Current Filters</p>
          <p className="text-xs text-neutral-500">Try selecting another status tab or search query.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-neutral-800 bg-neutral-900 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3.5">Booking ID & Date</th>
                <th className="px-4 py-3.5">Customer Dossier</th>
                <th className="px-4 py-3.5">Vehicle</th>
                <th className="px-4 py-3.5">Trip Route</th>
                <th className="px-4 py-3.5">Total Fare</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredBookings.map((booking) => {
                const isOngoingOrHold = ["CONFIRMED", "ACTIVE_TRIP", "EMERGENCY_HOLD"].includes(
                  booking.status
                );

                return (
                  <tr key={booking.bookingId} className="hover:bg-neutral-800/30 transition-colors">
                    {/* Booking ID & Date */}
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-white text-xs">
                        #{booking.bookingId.slice(0, 8)}
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        Booked: {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">
                        {booking.Customer?.name || "Guest User"}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        {booking.Customer?.phone || booking.Customer?.email}
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">
                        {booking.Vehicle?.make} {booking.Vehicle?.model}
                      </div>
                      <span className="font-mono text-[10px] font-bold text-purple-300 px-1.5 py-0.2 rounded bg-neutral-950 border border-neutral-800 inline-block mt-0.5">
                        {booking.Vehicle?.plate_number}
                      </span>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-white font-semibold text-[11px]">
                        <span>{booking.PickupHub?.name || "Pickup Hub"}</span>
                        <ArrowRight className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                        <span>{booking.DropoffHub?.name || "Dropoff Hub"}</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {new Date(booking.start_time).toLocaleDateString([], { month: "short", day: "numeric" })} -{" "}
                        {new Date(booking.end_time).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </div>
                    </td>

                    {/* Fare */}
                    <td className="px-4 py-4 font-bold text-white text-sm">
                      ₹{Number(booking.total_price || 0).toLocaleString("en-IN")}
                      {parseFloat(booking.relocation_fee || 0) > 0 && (
                        <span className="text-[10px] text-neutral-400 block font-normal">
                          Includes ₹{booking.relocation_fee} dropoff
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border inline-flex items-center gap-1.5 ${
                          booking.status === "ACTIVE_TRIP"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : booking.status === "CONFIRMED"
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                            : booking.status === "COMPLETED"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : booking.status === "EMERGENCY_HOLD"
                            ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse"
                            : "bg-neutral-800 border-neutral-700 text-neutral-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            booking.status === "ACTIVE_TRIP"
                              ? "bg-blue-400 animate-pulse"
                              : booking.status === "EMERGENCY_HOLD"
                              ? "bg-red-400"
                              : booking.status === "COMPLETED"
                              ? "bg-emerald-400"
                              : "bg-neutral-500"
                          }`}
                        />
                        <span>
                          {booking.status === "EMERGENCY_HOLD"
                            ? "Emergency SOS"
                            : booking.status === "ACTIVE_TRIP"
                            ? "On Road"
                            : booking.status}
                        </span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect Details Button */}
                        <button
                          type="button"
                          onClick={() => setInspectBooking(booking)}
                          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all cursor-pointer"
                          title="Inspect Booking Dossier"
                        >
                          <Eye className="w-3.5 h-3.5 text-neutral-300" />
                        </button>

                        {/* Resolve Emergency Button (if EMERGENCY_HOLD) */}
                        {booking.status === "EMERGENCY_HOLD" && (
                          <button
                            type="button"
                            onClick={() => {
                              setResolvingEmergency(booking);
                              setResolutionOutcome("COMPLETED");
                              setIncidentNotes(booking.incident_notes || "");
                              setRefundAmount(0);
                              setEmergencyError("");
                              setEmergencySuccess("");
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-red-600/20 flex items-center gap-1"
                            title="Resolve Emergency Incident"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>Resolve SOS</span>
                          </button>
                        )}

                        {/* Force Cancel Administrative Override */}
                        {isOngoingOrHold && (
                          <button
                            type="button"
                            onClick={() => {
                              setForceCancellingBooking(booking);
                              setCancellationReason("");
                              setRefundToWallet(true);
                              setForceCancelError("");
                              setForceCancelSuccess("");
                            }}
                            className="p-2 rounded-xl bg-neutral-800 hover:bg-red-950/60 hover:text-red-400 text-neutral-400 transition-all cursor-pointer"
                            title="Administrative Override: Force Cancel Booking"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Toolbar */}
          <div className="border-t border-neutral-800 px-4 bg-neutral-900/40">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              limit={pagination.limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INSPECT BOOKING DOSSIER                                         */}
      {/* ========================================================================= */}
      {inspectBooking && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Booking Dossier Inspection</h3>
                <span className="text-xs font-mono text-purple-400">
                  #{inspectBooking.bookingId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectBooking(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Customer Profile */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                  Customer Information
                </span>
                <div className="grid grid-cols-2 gap-2 text-neutral-200">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Name</span>
                    <strong className="text-white text-sm">{inspectBooking.Customer?.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Phone</span>
                    <strong className="font-mono text-white">
                      {inspectBooking.Customer?.phone || "No phone listed"}
                    </strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-neutral-500 block">Email Address</span>
                    <span className="font-mono text-neutral-300">{inspectBooking.Customer?.email}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle & Station Route */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                  Vehicle & Station Dispatch
                </span>
                <div className="grid grid-cols-2 gap-2 text-neutral-200">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Assigned Vehicle</span>
                    <strong className="text-white">
                      {inspectBooking.Vehicle?.make} {inspectBooking.Vehicle?.model}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">License Plate</span>
                    <strong className="font-mono text-purple-300">
                      {inspectBooking.Vehicle?.plate_number}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Pickup Hub</span>
                    <span>{inspectBooking.PickupHub?.name} ({inspectBooking.PickupHub?.city})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Dropoff Hub</span>
                    <span>{inspectBooking.DropoffHub?.name} ({inspectBooking.DropoffHub?.city})</span>
                  </div>
                </div>
              </div>

              {/* Timeline & Financials */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 block">Trip Window</span>
                  <div className="text-[11px] text-white">
                    <strong>Start:</strong>{" "}
                    {new Date(inspectBooking.start_time).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-white">
                    <strong>End:</strong>{" "}
                    {new Date(inspectBooking.end_time).toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 block">Total Rental Fare</span>
                  <div className="text-xl font-black text-white">
                    ₹{Number(inspectBooking.total_price || 0).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-emerald-400 block font-semibold">
                    Status: {inspectBooking.status}
                  </span>
                </div>
              </div>

              {/* Incident Notes if any */}
              {inspectBooking.incident_notes && (
                <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-800/40 text-red-300 space-y-1">
                  <strong className="text-xs font-bold block">Incident Notes / Emergency Report:</strong>
                  <p className="text-[11px]">{inspectBooking.incident_notes}</p>
                </div>
              )}

              {/* Cancellation Reason if any */}
              {inspectBooking.cancellation_reason && (
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-400 space-y-1">
                  <strong className="text-xs font-bold text-white block">Cancellation Reason:</strong>
                  <p className="text-[11px]">{inspectBooking.cancellation_reason}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setInspectBooking(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESOLVE EMERGENCY SOS INCIDENT                                   */}
      {/* ========================================================================= */}
      {resolvingEmergency && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />
                <h3 className="text-base font-bold text-white">Resolve Emergency SOS Incident</h3>
              </div>
              <button
                type="button"
                onClick={() => setResolvingEmergency(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveEmergency} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-800/40 space-y-1">
                <span className="font-bold text-white">
                  Driver: {resolvingEmergency.Customer?.name} ({resolvingEmergency.Customer?.phone})
                </span>
                <span className="text-[11px] text-red-300 block">
                  Vehicle: {resolvingEmergency.Vehicle?.make} {resolvingEmergency.Vehicle?.model} (
                  {resolvingEmergency.Vehicle?.plate_number})
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">Select Resolution Outcome *</label>
                <select
                  value={resolutionOutcome}
                  onChange={(e) => setResolutionOutcome(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="COMPLETED">
                    COMPLETED (Vehicle recovered & checked in, trip finalized)
                  </option>
                  <option value="CANCELLED">
                    CANCELLED (Trip aborted due to breakdown/accident)
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">
                  Goodwill Refund to Customer Wallet (₹ Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max={resolvingEmergency.total_price}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
                <span className="text-[10px] text-neutral-500 block">
                  Max refundable: ₹{resolvingEmergency.total_price} (credited directly to wallet).
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">Incident Resolution Summary *</label>
                <textarea
                  required
                  rows={3}
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder="Describe roadside assistance dispatch, car condition, tow status..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              {emergencySuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {emergencySuccess}
                </div>
              )}

              {emergencyError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {emergencyError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingEmergency}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all cursor-pointer"
              >
                {submittingEmergency ? "Resolving Incident..." : "Confirm & Clear Emergency Hold"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADMINISTRATIVE OVERRIDE FORCE CANCEL                             */}
      {/* ========================================================================= */}
      {forceCancellingBooking && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Force Cancel Reservation</h3>
              </div>
              <button
                type="button"
                onClick={() => setForceCancellingBooking(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForceCancel} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="font-bold text-white">
                  Booking #{forceCancellingBooking.bookingId.slice(0, 8)} &bull;{" "}
                  {forceCancellingBooking.Customer?.name}
                </span>
                <span className="text-[11px] text-neutral-400 block">
                  Vehicle: {forceCancellingBooking.Vehicle?.make}{" "}
                  {forceCancellingBooking.Vehicle?.model} (
                  {forceCancellingBooking.Vehicle?.plate_number})
                </span>
                <span className="text-[11px] text-neutral-400 block">
                  Total Value: ₹{Number(forceCancellingBooking.total_price || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">
                  Administrative Cancellation Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Customer dispute settlement, emergency roadside recall, fraud prevention..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="refundWallet"
                  checked={refundToWallet}
                  onChange={(e) => setRefundToWallet(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="refundWallet" className="text-neutral-300 cursor-pointer text-xs">
                  Credit full refund (<strong>₹{forceCancellingBooking.total_price}</strong>) back to customer wallet
                </label>
              </div>

              {forceCancelSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {forceCancelSuccess}
                </div>
              )}

              {forceCancelError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {forceCancelError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingForceCancel}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all cursor-pointer"
              >
                {submittingForceCancel ? "Cancelling..." : "Confirm Administrative Force Cancel"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
