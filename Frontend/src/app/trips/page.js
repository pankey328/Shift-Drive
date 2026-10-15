"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useDispatch } from "react-redux";
import { updateUser } from "@/redux/slices/authSlice";
import ProtectedRoute from "@/components/ProtectedRoute";
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
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  KeyRound,
} from "lucide-react";

function TripsDashboardContent() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState("trips");

  const [statusFilter, setStatusFilter] = useState("ALL");

  // Bookings Data & State
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Cancellation Modal State
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelError, setCancelError] = useState("");

  // Wallet State
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [customTopupAmount, setCustomTopupAmount] = useState("");
  const [walletNotice, setWalletNotice] = useState("");

  // Receipt Modal State
  const [receiptBooking, setReceiptBooking] = useState(null);

  // Fetch Bookings
  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const res = await api.get("/bookings/my-bookings");
      if (res.data?.data && Array.isArray(res.data.data)) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.warn("Could not load bookings:", err.message);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Fetch Wallet Balance & Transaction History
  const fetchWalletData = async () => {
    try {
      setLoadingTransactions(true);
      const [historyRes, meRes] = await Promise.all([
        api.get("/wallet/history"),
        api.get("/auth/me"),
      ]);

      if (historyRes.data?.data) {
        setTransactions(historyRes.data.data);
      }
      if (meRes.data?.user) {
        dispatch(updateUser(meRes.data.user));
        setWalletBalance(parseFloat(meRes.data.user.wallet_balance || 0));
      }
    } catch (err) {
      console.warn("Could not load wallet data:", err.message);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
      fetchWalletData();
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
        // Refresh bookings and wallet
        await fetchBookings();
        await fetchWalletData();

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

  // Handle Wallet Mock Topup
  const handleTopup = async (amountToAdd) => {
    const num = parseFloat(amountToAdd);
    if (!num || num <= 0) return;

    setToppingUp(true);
    setWalletNotice("");

    try {
      const res = await api.post("/wallet/topup/mock", { amount: num });
      if (res.data?.success) {
        const newBal = parseFloat(res.data.data?.newBalance ?? (walletBalance + num));
        setWalletBalance(newBal);
        dispatch(updateUser({ wallet_balance: newBal }));
        setWalletNotice(`₹${num.toLocaleString("en-IN")} deposited successfully into your ShiftDrive Wallet!`);
        setCustomTopupAmount("");
        await fetchWalletData();
        setTimeout(() => setWalletNotice(""), 4000);
      }
    } catch (err) {
      console.error("Top-up error:", err.response?.data || err.message);
      setWalletNotice(err.response?.data?.message || "Top-up failed. Please wait a few seconds and retry.");
    } finally {
      setToppingUp(false);
    }
  };

  // Filter Bookings by status
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "UPCOMING") return b.status === "CONFIRMED";
      if (statusFilter === "ACTIVE") return b.status === "ACTIVE_TRIP";
      if (statusFilter === "COMPLETED") return b.status === "COMPLETED";
      if (statusFilter === "CANCELLED") return b.status === "CANCELLED";
      return true;
    });
  }, [bookings, statusFilter]);

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
                My Trips & Digital Wallet
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 font-light mt-0.5">
                Manage your reservations, view station pickup vouchers, and review digital wallet refund transactions.
              </p>
            </div>

            {/* Quick Wallet Balance Pill */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("wallet")}
                className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-colors cursor-pointer"
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
              </button>

              <Link
                href="/fleet"
                className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-md shadow-black/40"
              >
                <Plus className="w-4 h-4" />
                <span>Book New Car</span>
              </Link>
            </div>
          </div>

          {/* Primary View Switcher: Trips vs Wallet */}
          <div className="flex items-center gap-3 mt-6 border-t border-neutral-900 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab("trips")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "trips"
                ? "bg-white text-black shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
            >
              <Car className="w-4 h-4" />
              <span>My Bookings</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === "trips" ? "bg-black/10 text-black" : "bg-neutral-800 text-neutral-300"
                }`}>
                {bookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("wallet")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "wallet"
                ? "bg-white text-black shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
            >
              <Wallet className="w-4 h-4" />
              <span>ShiftDrive Wallet</span>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                ₹{walletBalance.toLocaleString("en-IN")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* TAB : MY BOOKINGS */}
        {activeTab === "trips" && (
          <div className="space-y-6">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {["ALL", "UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
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

                  return (
                    <div
                      key={trip.bookingId}
                      className="rounded-3xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all p-5 sm:p-6 space-y-4"
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
                        <div className="md:col-span-3 flex md:flex-col justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReceiptBooking(trip)}
                            className="flex-1 md:flex-initial py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-400" />
                            <span>View Voucher</span>
                          </button>

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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB : DIGITAL WALLET */}
        {activeTab === "wallet" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Wallet Balance & Topup Action */}
            <div className="lg:col-span-5 space-y-6">
              {/* Balance Card */}
              <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    <Wallet className="w-4 h-4" />
                    <span>ShiftDrive Digital Wallet</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Active
                  </span>
                </div>

                <div>
                  <span className="text-xs text-neutral-400">Total Available Balance</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                    ₹{walletBalance.toLocaleString("en-IN")}
                  </h2>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 text-xs space-y-1 text-neutral-400">
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    100% Instant Refund Gated
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    All trip cancellations and deposit releases are immediately credited back to this wallet balance without payment gateway delays.
                  </p>
                </div>
              </div>

              {/* Instant Top-Up Card */}
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Instant Mock Deposit</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Simulate adding funds directly to your ShiftDrive balance.
                  </p>
                </div>

                {walletNotice && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{walletNotice}</span>
                  </div>
                )}

                {/* Preset Amount Pills */}
                <div className="grid grid-cols-3 gap-2">
                  {[1000, 2500, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={toppingUp}
                      onClick={() => handleTopup(amt)}
                      className="py-2.5 px-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 text-xs font-semibold text-white transition-all text-center cursor-pointer disabled:opacity-50"
                    >
                      + ₹{amt.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                {/* Custom Amount Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customTopupAmount) handleTopup(customTopupAmount);
                  }}
                  className="space-y-3 pt-2"
                >
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="Enter custom amount..."
                      value={customTopupAmount}
                      onChange={(e) => setCustomTopupAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={toppingUp || !customTopupAmount}
                    className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md"
                  >
                    {toppingUp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing Deposit...</span>
                      </>
                    ) : (
                      <span>Deposit to Wallet</span>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Transaction History Ledger */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Transaction Audit Ledger</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Chronological log of deposits, vehicle booking deductions, and refunds.
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">
                    {transactions.length} Records
                  </span>
                </div>

                {loadingTransactions ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-2xl bg-neutral-950/60 border border-neutral-800/60 animate-pulse"
                      ></div>
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 text-xs text-neutral-500">
                    <Wallet className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                    <span>No transactions recorded yet.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {transactions.map((tx) => {
                      const isCredit = parseFloat(tx.amount) > 0;
                      return (
                        <div
                          key={tx.transactionId || tx.id}
                          className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isCredit
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                : "bg-red-500/10 border border-red-500/30 text-red-400"
                                }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </div>

                            <div>
                              <span className="font-semibold text-white block">
                                {tx.description || tx.type}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                {new Date(tx.createdAt).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`font-mono font-bold text-sm ${isCredit ? "text-emerald-400" : "text-neutral-300"
                                }`}
                            >
                              {isCredit ? "+" : ""}
                              ₹{Math.abs(parseFloat(tx.amount)).toLocaleString("en-IN")}
                            </span>
                            <span className="block text-[9px] text-neutral-500 uppercase tracking-wider">
                              {tx.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

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

      {/* VOUCHER / RECEIPT MODAL */}
      {receiptBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Trip Handover Voucher</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptBooking(null)}
                className="text-neutral-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

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
                <span className="text-white">{receiptBooking.DropoffHub?.name || receiptBooking.PickupHub?.name}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-neutral-900">
                <span className="text-neutral-400">Total Paid</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  ₹{parseFloat(receiptBooking.total_price || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
              <span className="text-neutral-200 font-semibold block">Pickup Instructions:</span>
              <p>
                Present your verified driving license at the station counter. A 2-hour sanitation buffer was completed prior to your scheduled pickup time.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReceiptBooking(null)}
              className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Close Voucher
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
                Loading My Trips & Wallet...
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
