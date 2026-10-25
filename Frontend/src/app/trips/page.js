"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useDispatch } from "react-redux";
import { updateUser } from "@/redux/slices/authSlice";
import ProtectedRoute from "@/components/ProtectedRoute";
import Pagination from "@/components/Pagination";
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Loader2,
  FileText,
  Search,
  ChevronRight,
  KeyRound,
  PhoneCall,
  Camera,
  AlertOctagon,
  Eye,
} from "lucide-react";

function TripsDashboardContent() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();

  // Trips Filtering: 'ALL', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Bookings Data & State
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 5,
  });

  // Cancellation Modal State
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelError, setCancelError] = useState("");

  // Emergency Incident Reporting State
  const [reportingEmergency, setReportingEmergency] = useState(null);
  const [submittingEmergency, setSubmittingEmergency] = useState(false);
  const [emergencySuccess, setEmergencySuccess] = useState("");
  const [emergencyError, setEmergencyError] = useState("");

  // Wallet Balance (for top header shortcut)
  const [walletBalance, setWalletBalance] = useState(0);

  // Receipt & Digital Inspection Modal State
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [receiptTab, setReceiptTab] = useState("voucher"); // 'voucher' | 'inspections'
  const [inspections, setInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);

  // Fetch Bookings with server-side status filter and pagination
  const fetchBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      const res = await api.get("/bookings/my-bookings", {
        params: {
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          page,
          limit,
        },
      });
      if (res.data?.data && Array.isArray(res.data.data)) {
        setBookings(res.data.data);
      }
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.warn("Could not load bookings:", err.message);
    } finally {
      setLoadingBookings(false);
    }
  }, [statusFilter, page, limit]);

  // Fetch Wallet Balance
  const fetchWalletBalance = async () => {
    try {
      const meRes = await api.get("/auth/me");
      if (meRes.data?.user) {
        dispatch(updateUser(meRes.data.user));
        setWalletBalance(parseFloat(meRes.data.user.wallet_balance || 0));
      }
    } catch (err) {
      console.warn("Could not load wallet balance:", err.message);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated, fetchBookings]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWalletBalance();
    }
  }, [isAuthenticated]);

  // Sync wallet balance from user state
  useEffect(() => {
    if (user?.wallet_balance !== undefined) {
      setWalletBalance(parseFloat(user.wallet_balance || 0));
    }
  }, [user?.wallet_balance]);

  // Handle Trip Cancellation with 100% Wallet Refund
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;

    setSubmittingCancel(true);
    setCancelError("");
    setCancelMessage("");

    try {
      const res = await api.post(`/bookings/${cancellingBooking.bookingId}/cancel`, {
        cancellationReason: cancelReason.trim() || "Customer requested self-cancellation.",
      });

      if (res.data?.success) {
        setCancelMessage("Booking cancelled successfully! 100% of the payment has been refunded to your ShiftDrive Wallet.");
        await fetchBookings();
        await fetchWalletBalance();

        setTimeout(() => {
          setCancellingBooking(null);
          setCancelReason("");
          setCancelMessage("");
        }, 2000);
      }
    } catch (err) {
      console.error("Cancellation error:", err.response?.data || err.message);
      setCancelError(err.response?.data?.message || "Failed to cancel booking. Please try again.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Handle Roadside Breakdown / Accident Emergency Reporting
  const handleReportEmergency = async () => {
    if (!reportingEmergency) return;

    setSubmittingEmergency(true);
    setEmergencyError("");
    setEmergencySuccess("");

    try {
      const res = await api.post(`/bookings/${reportingEmergency.bookingId}/emergency`);
      if (res.data?.success) {
        setEmergencySuccess(res.data.message || "Emergency reported. Late fees paused and station support alerted.");
        await fetchBookings();

        setTimeout(() => {
          setReportingEmergency(null);
          setEmergencySuccess("");
        }, 2500);
      }
    } catch (err) {
      console.error("Emergency report error:", err.response?.data || err.message);
      setEmergencyError(
        err.response?.data?.message || "Failed to report emergency. Please contact emergency hotline immediately."
      );
    } finally {
      setSubmittingEmergency(false);
    }
  };

  // Fetch Inspections when opening modal
  const handleOpenReceipt = async (trip) => {
    setReceiptBooking(trip);
    setReceiptTab("voucher");
    setInspections([]);

    try {
      setLoadingInspections(true);
      const res = await api.get(`/inspections/${trip.bookingId}`);
      if (res.data?.data) {
        setInspections(res.data.data);
      }
    } catch (err) {
      console.warn("Could not load inspections:", err.message);
    } finally {
      setLoadingInspections(false);
    }
  };

  // Bookings list (backed by server-side status filtering and pagination)
  const filteredBookings = bookings;

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Upcoming
          </span>
        );
      case "ACTIVE_TRIP":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
            On Road
          </span>
        );
      case "EMERGENCY_HOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-600/60 text-red-400 text-xs font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            Emergency Hold (Fees Paused)
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled & Refunded
          </span>
        );
      case "PENDING_PAYMENT":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Pending Payment
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  // RESTRICTION FOR STAFF ACCOUNTS
  if (user?.role && user.role !== "CUSTOMER") {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-neutral-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-blue-500/30 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
            <Car className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Staff Account Notice
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Customer Bookings Only
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
              As a {user.role === "SUPERADMIN" ? "Superadmin" : "Station Manager"}, your account manages fleet operations rather than personal trips. Consumer bookings are tracked on your operations desk.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-left space-y-2 text-xs">
            <p className="text-neutral-300 font-semibold">
              Looking for fleet reservations?
            </p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {user.role === "SUPERADMIN"
                ? "View and manage all customer bookings enterprise-wide from the Superadmin Bookings Ledger."
                : "View customer handovers and station vehicle assignments from your Station Dispatch Desk."}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href={user.role === "SUPERADMIN" ? "/admin/bookings" : "/manager"}
              className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all shadow-md"
            >
              {user.role === "SUPERADMIN" ? "Open Bookings Ledger" : "Open Station Desk"}
            </Link>
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white font-sans pb-24">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-[140px] pointer-events-none"></div>

      {/* Top Banner */}
      <div className="border-b border-neutral-900 bg-neutral-950/60 backdrop-blur-xl pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Customer Mobility Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                My Trips & Reservations
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 font-light mt-0.5">
                Manage your reserved fleet, access station pickup vouchers, and review digital inspection checklists.
              </p>
            </div>

            {/* Quick Wallet & Book Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/wallet"
                className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-colors"
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <span className="block text-[10px] text-neutral-500 uppercase tracking-wider">
                    Wallet Balance
                  </span>
                  <span className="text-sm font-bold text-white font-mono">
                    ₹{walletBalance.toLocaleString("en-IN")}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
              </Link>

              <Link
                href="/fleet"
                className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-md shadow-black/40"
              >
                <Plus className="w-4 h-4" />
                <span>Book New Car</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="space-y-6">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["ALL", "UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${statusFilter === status
                    ? "bg-white text-black shadow-md"
                    : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          {loadingBookings ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-3xl bg-neutral-900/40 border border-neutral-800 animate-pulse p-6"
                ></div>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl bg-neutral-900/30 border border-neutral-800/80 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/60 border border-neutral-700 flex items-center justify-center mx-auto mb-4 text-neutral-500">
                <Car className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No Bookings Found</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                {statusFilter === "ALL"
                  ? "You haven't reserved any vehicles yet. Explore our live sanitized fleet and book in 2 minutes."
                  : `You have no ${statusFilter.toLowerCase()} trips right now.`}
              </p>
              <Link
                href="/fleet"
                className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors shadow-md"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Discover Fleet</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((trip) => {
                const car = trip.Vehicle || {};
                const pickupHub = trip.PickupHub || {};
                const dropoffHub = trip.DropoffHub || pickupHub;
                const carImg =
                  car.gallery_urls?.[0] ||
                  "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80";
                const canCancel = trip.status === "CONFIRMED";
                const isActiveTrip = trip.status === "ACTIVE_TRIP";
                const isEmergencyHold = trip.status === "EMERGENCY_HOLD";

                return (
                  <div
                    key={trip.bookingId}
                    className={`rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${isEmergencyHold
                        ? "bg-red-950/20 border-red-800/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                        : "bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700"
                      }`}
                  >
                    {/* Top Header of Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
                      <div className="flex items-center gap-3">
                        {renderStatusBadge(trip.status)}
                        <span className="text-xs font-mono text-neutral-400">
                          Ref: <strong className="text-neutral-200">{trip.bookingId.slice(0, 8)}</strong>
                        </span>
                      </div>

                      <div className="text-xs text-neutral-400">
                        Total Paid:{" "}
                        <strong className="text-emerald-400 font-bold font-mono text-sm">
                          ₹{parseFloat(trip.total_price || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>

                    {/* Main Card Content */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      {/* Vehicle Preview */}
                      <div className="md:col-span-4 flex items-center gap-4">
                        <div className="relative h-20 w-28 rounded-2xl overflow-hidden bg-neutral-950 flex-shrink-0">
                          <img
                            src={carImg}
                            alt={`${car.make} ${car.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                            {car.make}
                          </span>
                          <h3 className="text-base font-bold text-white">
                            {car.model}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-400">
                              {car.plate_number || "REG-PENDING"}
                            </span>
                            <span className="text-[10px] text-neutral-500 uppercase">
                              {car.vehicle_class}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stations & Schedule */}
                      <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Pickup */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Pickup Station</span>
                          </div>
                          <span className="font-semibold text-white block truncate">
                            {pickupHub.name || "Station"}
                          </span>
                          <span className="text-[11px] text-neutral-400 block">
                            {trip.start_time
                              ? new Date(trip.start_time).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                              : "N/A"}
                          </span>
                        </div>

                        {/* Return */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                            <span>Return Station</span>
                          </div>
                          <span className="font-semibold text-white block truncate">
                            {dropoffHub.name || pickupHub.name || "Station"}
                          </span>
                          <span className="text-[11px] text-neutral-400 block">
                            {trip.end_time
                              ? new Date(trip.end_time).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="md:col-span-3 flex flex-wrap md:flex-col justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(trip)}
                          className="flex-1 md:flex-initial py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-neutral-400" />
                          <span>View Voucher</span>
                        </button>

                        {/* Self Cancellation (Upcoming) */}
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingBooking(trip);
                              setCancelError("");
                              setCancelMessage("");
                              setCancelReason("");
                            }}
                            className="flex-1 md:flex-initial py-2 px-3 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-800/40 text-xs font-bold text-red-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Cancel & Refund</span>
                          </button>
                        )}

                        {/* Roadside Emergency Reporting (Active Trip) */}
                        {isActiveTrip && (
                          <button
                            type="button"
                            onClick={() => {
                              setReportingEmergency(trip);
                              setEmergencyError("");
                              setEmergencySuccess("");
                            }}
                            className="flex-1 md:flex-initial py-2 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-xs font-bold text-red-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                            <span>Report Emergency</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Emergency Hold Banner */}
                    {isEmergencyHold && (
                      <div className="p-3 rounded-2xl bg-red-950/40 border border-red-800/60 flex items-center gap-2.5 text-xs text-red-300">
                        <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-white block">Incident Escalated to Station Dispatch</span>
                          <span className="text-[11px] text-red-300/80">
                            Late return penalties are paused. Emergency support team has been dispatched. Helpline: 1800-SHIFT-DRIVE.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loadingBookings && pagination.totalItems > 0 && (
            <div className="pt-2">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                limit={limit}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 250, behavior: "smooth" });
                }}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          )}
        </div>
      </main>

      {/* ROAD ACCIDENT / BREAKDOWN EMERGENCY MODAL */}
      {reportingEmergency && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-red-700/60 p-6 space-y-5 shadow-[0_20px_60px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Report Road Emergency</h3>
                <span className="text-xs text-neutral-400">
                  Vehicle: {reportingEmergency.Vehicle?.make} {reportingEmergency.Vehicle?.model}
                </span>
              </div>
            </div>

            {/* Helpline Banner */}
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <PhoneCall className="w-4 h-4 text-red-400" />
                <span>24/7 Roadside Assistance: 1800-SHIFT-DRIVE</span>
              </div>
              <p className="text-[11px] text-red-300/80">
                If you are in physical danger or need medical help, please call 112 immediately.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs text-neutral-300">
              <span className="font-semibold text-white block">What happens when you report:</span>
              <ul className="space-y-1 text-[11px] text-neutral-400 list-disc list-inside">
                <li>Late return fee accruals are <strong>automatically frozen</strong>.</li>
                <li>Station support & roadside recovery units are dispatched.</li>
                <li>Future customer reservations are automatically rescued to prevent disruption.</li>
              </ul>
            </div>

            {emergencySuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{emergencySuccess}</span>
              </div>
            )}

            {emergencyError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{emergencyError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReportingEmergency(null)}
                disabled={submittingEmergency}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReportEmergency}
                disabled={submittingEmergency}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-red-600/30"
              >
                {submittingEmergency ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Activating Protocol...</span>
                  </>
                ) : (
                  <span>Activate Emergency Hold</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-red-800/40 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cancel Reservation?</h3>
                <span className="text-xs text-neutral-400">
                  Ref: {cancellingBooking.bookingId.slice(0, 8)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Vehicle:</span>
                <span className="text-white font-semibold">
                  {cancellingBooking.Vehicle?.make} {cancellingBooking.Vehicle?.model}
                </span>
              </div>

              <div className="flex justify-between text-neutral-400">
                <span>100% Refund Amount:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  + ₹{parseFloat(cancellingBooking.total_price || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-900">
                The entire amount will be immediately credited back to your ShiftDrive Wallet balance.
              </p>
            </div>

            {cancelMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{cancelMessage}</span>
              </div>
            )}

            {cancelError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Change of travel plans, flight reschedule..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
              ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                disabled={submittingCancel}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Keep Booking
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={submittingCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submittingCancel ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Refund...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOUCHER & DIGITAL INSPECTION REPORT MODAL */}
      {receiptBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl">
            {/* Modal Header & Tab Switcher */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Trip Voucher & Inspection</h3>
                  <span className="text-[11px] text-neutral-400">Ref: {receiptBooking.bookingId.slice(0, 8)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReceiptBooking(null)}
                className="text-neutral-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setReceiptTab("voucher")}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${receiptTab === "voucher"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                  }`}
              >
                Voucher Details
              </button>

              <button
                type="button"
                onClick={() => setReceiptTab("inspections")}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${receiptTab === "inspections"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                  }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Inspection Report</span>
                {inspections.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                    {inspections.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Voucher Details */}
            {receiptTab === "voucher" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Booking ID</span>
                    <span className="font-mono text-white font-bold">{receiptBooking.bookingId}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-500">Vehicle</span>
                    <span className="text-white font-semibold">
                      {receiptBooking.Vehicle?.make} {receiptBooking.Vehicle?.model}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-500">License Plate</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {receiptBooking.Vehicle?.plate_number || "ASSIGNED AT HANDOVER"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-500">Pickup Station</span>
                    <span className="text-white">{receiptBooking.PickupHub?.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-500">Return Station</span>
                    <span className="text-white">
                      {receiptBooking.DropoffHub?.name || receiptBooking.PickupHub?.name}
                    </span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-neutral-900">
                    <span className="text-neutral-400">Total Paid (Wallet)</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ₹{parseFloat(receiptBooking.total_price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                  <span className="text-neutral-200 font-semibold block">Counter Handover Instructions:</span>
                  <p>
                    Present your verified driving license at the station counter. A 2-hour sanitation buffer was completed prior to your scheduled pickup time.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Inspection Report */}
            {receiptTab === "inspections" && (
              <div className="space-y-3">
                {loadingInspections ? (
                  <div className="py-12 text-center text-xs text-neutral-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading vehicle inspection checklist...</span>
                  </div>
                ) : inspections.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
                    <Camera className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="font-medium text-white">No Inspections Conducted Yet</p>
                    <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                      Digital pre-trip and post-trip vehicle condition checklists with photos will be uploaded by the hub manager upon station handover.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {inspections.map((insp) => (
                      <div
                        key={insp.inspectionId}
                        className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                            {insp.type === "PRE_TRIP" ? "Pickup Pre-Trip Inspection" : "Return Post-Trip Inspection"}
                          </span>
                          {insp.damage_flagged ? (
                            <span className="px-2 py-0.5 rounded-md bg-red-950/60 border border-red-800/60 text-red-400 text-[10px] font-bold">
                              Damage Flagged ({insp.damage_severity || "REVIEW"})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold">
                              Pass / Pristine
                            </span>
                          )}
                        </div>

                        {insp.notes && (
                          <p className="text-neutral-400 text-[11px] bg-neutral-900/60 p-2 rounded-xl">
                            {insp.notes}
                          </p>
                        )}

                        {/* Inspection Photos */}
                        {insp.photo_urls && Array.isArray(insp.photo_urls) && insp.photo_urls.length > 0 && (
                          <div>
                            <span className="text-[10px] text-neutral-500 font-semibold block mb-1.5">
                              Condition Photographs ({insp.photo_urls.length})
                            </span>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {insp.photo_urls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-16 h-16 rounded-xl overflow-hidden border border-neutral-800 flex-shrink-0 group relative bg-neutral-900"
                                >
                                  <img
                                    src={url}
                                    alt={`Inspection ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setReceiptBooking(null)}
              className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TripsPage() {
  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "HUB_ADMIN", "SUPERADMIN"]}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-neutral-400 tracking-wide">
                Loading My Trips...
              </p>
            </div>
          </div>
        }
      >
        <TripsDashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
