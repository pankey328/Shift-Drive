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

// Live Hold Countdown Timer for Pending Payment reservations
function HoldCountdownTimer({ lockedUntil, onExpire }) {
  const calculateRemaining = useCallback(() => {
    if (!lockedUntil) return 0;
    const expiry = new Date(lockedUntil).getTime();
    return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
  }, [lockedUntil]);

  const [seconds, setSeconds] = useState(calculateRemaining);

  useEffect(() => {
    setSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemaining, onExpire]);

  if (seconds <= 0) {
    return <span className="font-mono text-red-400 font-bold">00:00</span>;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

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

  // Running Late Modal State
  const [runningLateBooking, setRunningLateBooking] = useState(null);
  const [submittingRunningLate, setSubmittingRunningLate] = useState(false);
  const [runningLateMessage, setRunningLateMessage] = useState("");
  const [runningLateError, setRunningLateError] = useState("");

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

  // Handle Trip Cancellation with Tiered Wallet Refund
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
        setCancelMessage(
          res.data.message ||
            "Booking cancelled successfully. Wallet refund has been credited."
        );
        await fetchBookings();
        await fetchWalletBalance();

        setTimeout(() => {
          setCancellingBooking(null);
          setCancelReason("");
          setCancelMessage("");
        }, 2500);
      }
    } catch (err) {
      console.error("Cancellation error:", err.response?.data || err.message);
      setCancelError(err.response?.data?.message || "Failed to cancel booking. Please try again.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Handle Running Late / Hold for Next-Day Pickup
  const handleConfirmRunningLate = async () => {
    if (!runningLateBooking) return;

    setSubmittingRunningLate(true);
    setRunningLateError("");
    setRunningLateMessage("");

    try {
      const res = await api.post(`/bookings/${runningLateBooking.bookingId}/running-late`);

      if (res.data?.success) {
        setRunningLateMessage(
          res.data.message ||
            "Vehicle successfully held for next-day pickup! Station team notified."
        );
        await fetchBookings();

        setTimeout(() => {
          setRunningLateBooking(null);
          setRunningLateMessage("");
        }, 2500);
      }
    } catch (err) {
      console.error("Running late error:", err.response?.data || err.message);
      setRunningLateError(
        err.response?.data?.message || "Failed to notify station. Please contact support."
      );
    } finally {
      setSubmittingRunningLate(false);
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
  const renderStatusBadge = (status, lockedUntil = null, endTime = null) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Upcoming
          </span>
        );
      case "ACTIVE_TRIP": {
        const isLate = endTime && new Date(endTime).getTime() < Date.now();
        if (isLate) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500 text-red-300 text-xs font-bold animate-pulse shadow-sm shadow-red-950/60">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              Overdue (Late Penalty Active)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
            On Road
          </span>
        );
      }
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-600/60 text-amber-400 text-xs font-bold shadow-sm shadow-amber-950/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>Hold Active</span>
            {lockedUntil && (
              <span className="font-mono text-amber-300 font-semibold ml-0.5">
                (<HoldCountdownTimer lockedUntil={lockedUntil} onExpire={fetchBookings} />)
              </span>
            )}
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
                const isPendingPayment = trip.status === "PENDING_PAYMENT";
                const isOverdue = isActiveTrip && trip.end_time && new Date(trip.end_time).getTime() < Date.now();

                return (
                  <div
                    key={trip.bookingId}
                    className={`rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${
                      isOverdue
                        ? "bg-red-950/25 border-red-700/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
                        : isEmergencyHold
                          ? "bg-red-950/20 border-red-800/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                          : isPendingPayment
                            ? "bg-amber-950/15 border-amber-800/50 hover:border-amber-700/60"
                            : "bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700"
                    }`}
                  >
                    {/* Top Header of Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {renderStatusBadge(trip.status, trip.locked_until, trip.end_time)}
                        <span className="text-xs font-mono text-neutral-400">
                          Ref: <strong className="text-neutral-200">{trip.bookingId.slice(0, 8)}</strong>
                        </span>
                        {trip.status === "CONFIRMED" && (
                          user?.kyc_status === "VERIFIED" ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> DL Pre-Verified
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Show Original DL at Pickup
                            </span>
                          )
                        )}
                      </div>

                      <div className="text-xs text-neutral-400">
                        {isPendingPayment ? "Amount Due: " : "Total Paid: "}
                        <strong className={isPendingPayment ? "text-amber-400 font-bold font-mono text-sm" : "text-emerald-400 font-bold font-mono text-sm"}>
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
                        {isPendingPayment ? (
                          <Link
                            href={`/checkout?vehicleId=${trip.vehicle_id || car.vehicleId}&pickupHubId=${trip.pickup_hub_id}&dropoffHubId=${trip.dropoff_hub_id || trip.pickup_hub_id}&startTime=${encodeURIComponent(trip.start_time)}&endTime=${encodeURIComponent(trip.end_time)}`}
                            className="flex-1 md:flex-initial py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Complete Payment</span>
                            <span className="font-mono text-[11px] bg-black/20 px-1.5 py-0.5 rounded font-extrabold text-black">
                              <HoldCountdownTimer lockedUntil={trip.locked_until} onExpire={fetchBookings} />
                            </span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(trip)}
                            className="flex-1 md:flex-initial py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-400" />
                            <span>View Voucher</span>
                          </button>
                        )}

                        {/* Self Cancellation (Upcoming) */}
                        {canCancel && (
                          <>
                            {!trip.is_delayed_pickup && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRunningLateBooking(trip);
                                  setRunningLateError("");
                                  setRunningLateMessage("");
                                }}
                                className="flex-1 md:flex-initial py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>I'm Running Late</span>
                              </button>
                            )}

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
                          </>
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

                    {/* Pending Payment Hold Banner */}
                    {isPendingPayment && (
                      <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400">
                            <Clock className="w-4 h-4 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 font-bold text-white text-sm">
                              <span>Temporary Vehicle Hold Active</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs">
                                <HoldCountdownTimer lockedUntil={trip.locked_until} onExpire={fetchBookings} /> remaining
                              </span>
                            </div>
                            <span className="text-[11px] text-amber-300/80 block mt-0.5">
                              This vehicle is temporarily held for your session. Complete payment before the timer expires to confirm your reservation.
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/checkout?vehicleId=${trip.vehicle_id || car.vehicleId}&pickupHubId=${trip.pickup_hub_id}&dropoffHubId=${trip.dropoff_hub_id || trip.pickup_hub_id}&startTime=${encodeURIComponent(trip.start_time)}&endTime=${encodeURIComponent(trip.end_time)}`}
                          className="self-end sm:self-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs whitespace-nowrap transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                        >
                          <span>Resume & Pay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}

                    {/* Overdue Return Penalty Banner */}
                    {isOverdue && (
                      <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-600/70 flex items-start gap-3 text-xs text-red-300">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 animate-bounce mt-0.5" />
                        <div>
                          <strong className="text-white block text-sm">Overdue Return Warning</strong>
                          <p className="text-[11px] text-red-200/90 mt-0.5 leading-relaxed">
                            Scheduled return was {trip.end_time ? new Date(trip.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "passed"}. In accordance with ShiftDrive policies, a late penalty of ₹1,000/hour is actively assessed against your wallet. Please return the vehicle to {dropoffHub.name || pickupHub.name || "the station"} immediately or contact station support.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Fleet Swap / Reassignment Banner */}
                    {trip.incident_notes && trip.incident_notes.includes("Fleet Swap") && (
                      <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-700/50 flex items-start gap-2.5 text-xs text-blue-300">
                        <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Vehicle Seamlessly Reassigned</span>
                          <span className="text-[11px] text-blue-200/80 block mt-0.5">{trip.incident_notes}</span>
                        </div>
                      </div>
                    )}

                    {/* Cancellation & Apology Credit Notice */}
                    {trip.status === "CANCELLED" && trip.cancellation_reason && (
                      <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex items-start gap-3 text-xs">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-semibold text-white block">Cancellation Notice</span>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">{trip.cancellation_reason}</p>
                          {trip.cancellation_reason.includes("Apology Credit") && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold mt-1">
                              <Sparkles className="w-3 h-3" />
                              <span>₹1,000 Inconvenience Credit Credited to Wallet</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delayed Pickup Next-Day Hold Banner */}
                    {trip.is_delayed_pickup && trip.status === "CONFIRMED" && (
                      <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-3 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Next-Day Station Pickup Confirmed</span>
                          <span className="text-[11px] text-emerald-200/90 block mt-0.5">
                            Your vehicle is locked on the lot and reserved for next-day pickup at <strong>{pickupHub.name || "the station"}</strong> starting at {pickupHub.opening_time ? pickupHub.opening_time.slice(0, 5) : "08:00 AM"}. Scheduled rental dates and total pricing remain unchanged.
                          </span>
                        </div>
                      </div>
                    )}

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
      {cancellingBooking && (() => {
        const pickupClose = cancellingBooking.PickupHub?.closing_time || "20:00:00";
        const [closeH, closeM] = pickupClose.split(":").map(Number);
        const startDate = new Date(cancellingBooking.start_time);
        const hubCloseOnPickup = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          closeH || 20,
          closeM || 0,
          0
        );
        const isPastHubClose = Date.now() > hubCloseOnPickup.getTime();
        const totalPaid = parseFloat(cancellingBooking.total_price || 0);

        return (
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

                {!isPastHubClose ? (
                  <>
                    <div className="flex justify-between text-neutral-400">
                      <span>100% Refund Amount:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        + ₹{totalPaid.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-900 leading-relaxed">
                      You are cancelling prior to station closing time ({pickupClose.slice(0, 5)}). 100% of your payment will be immediately credited to your ShiftDrive Wallet.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-neutral-400">
                      <span>Original Paid:</span>
                      <span className="text-white font-bold font-mono">
                        ₹{totalPaid.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-amber-900/40 text-[11px] text-amber-300/90 leading-relaxed space-y-1">
                      <div className="font-semibold text-amber-200">Prorated Refund Policy Active:</div>
                      <p>
                        Because station closing on your scheduled pickup date has passed, elapsed day(s) during which the vehicle was held will be deducted at the daily rate, and the remaining unused balance will be credited to your wallet.
                      </p>
                    </div>
                  </>
                )}
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
        );
      })()}

      {/* RUNNING LATE / NEXT-DAY PICKUP CONFIRMATION MODAL */}
      {runningLateBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-amber-500/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Running Late?</h3>
                <span className="text-xs text-neutral-400">
                  Ref: {runningLateBooking.bookingId.slice(0, 8)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Pickup Station:</span>
                <span className="text-white font-semibold">
                  {runningLateBooking.PickupHub?.name || "Station"}
                </span>
              </div>

              <div className="flex justify-between text-neutral-400">
                <span>Tomorrow's Station Opening:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {runningLateBooking.PickupHub?.opening_time
                    ? runningLateBooking.PickupHub.opening_time.slice(0, 5)
                    : "08:00 AM"}
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-900 space-y-1.5 text-[11px] text-neutral-400">
                <span className="font-semibold text-white block">Next-Day Pickup Terms:</span>
                <ul className="list-disc list-inside space-y-1 text-neutral-400">
                  <li>Your vehicle will remain locked and held exclusively for you on the station lot.</li>
                  <li>
                    No refund is provided for elapsed hours or the missed day; original reservation dates & total pricing remain unchanged.
                  </li>
                  <li>
                    If you wish to change your dates entirely, please cancel this booking and book again for your revised dates.
                  </li>
                </ul>
              </div>
            </div>

            {runningLateMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{runningLateMessage}</span>
              </div>
            )}

            {runningLateError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{runningLateError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRunningLateBooking(null)}
                disabled={submittingRunningLate}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleConfirmRunningLate}
                disabled={submittingRunningLate}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                {submittingRunningLate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Notifying Station...</span>
                  </>
                ) : (
                  <span>Hold for Tomorrow</span>
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
