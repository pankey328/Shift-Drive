"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useDispatch } from "react-redux";
import { updateUser } from "@/redux/slices/authSlice";
import {
  Car,
  Clock,
  MapPin,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Upload,
  Lock,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Loader2,
  FileText,
  CreditCard,
  Plus,
} from "lucide-react";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const dispatch = useDispatch();

  // Search Query Params
  const vehicleId = searchParams.get("vehicleId") || "";
  const pickupHubId = searchParams.get("pickupHubId") || "";
  const dropoffHubId = searchParams.get("dropoffHubId") || pickupHubId;
  const startTime = searchParams.get("startTime") || "";
  const endTime = searchParams.get("endTime") || "";

  // Data States
  const [vehicle, setVehicle] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Booking Hold State
  const [booking, setBooking] = useState(null);
  const [initiatingHold, setInitiatingHold] = useState(false);
  const [holdError, setHoldError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(null);

  // KYC States
  const [kycFile, setKycFile] = useState(null);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [kycMessage, setKycMessage] = useState("");
  const [kycError, setKycError] = useState("");

  // Wallet States
  const [walletBalance, setWalletBalance] = useState(0);
  const [toppingUp, setToppingUp] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState("");

  // Payment Confirmation States
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Fetch Vehicle, Hubs & User Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [vehicleRes, hubsRes] = await Promise.all([
          vehicleId ? api.get(`/vehicles/${vehicleId}`) : Promise.resolve({ data: {} }),
          api.get("/hubs"),
        ]);

        if (vehicleRes.data?.data) {
          setVehicle(vehicleRes.data.data);
        }
        if (hubsRes.data?.data) {
          setHubs(hubsRes.data.data);
        }

        // Fetch fresh user profile for current wallet balance & kyc status
        if (isAuthenticated) {
          try {
            const meRes = await api.get("/auth/me");
            if (meRes.data?.user) {
              dispatch(updateUser(meRes.data.user));
              setWalletBalance(parseFloat(meRes.data.user.wallet_balance || 0));
            }
          } catch (err) {
            console.warn("Could not fetch user profile:", err.message);
          }
        }
      } catch (err) {
        console.error("Error loading checkout details:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [vehicleId, isAuthenticated, dispatch]);

  // Sync wallet balance from user state
  useEffect(() => {
    if (user?.wallet_balance !== undefined) {
      setWalletBalance(parseFloat(user.wallet_balance || 0));
    }
  }, [user?.wallet_balance]);

  // Initiate 5-minute inventory hold
  const handleInitiateHold = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setInitiatingHold(true);
    setHoldError("");

    try {
      const res = await api.post("/bookings/initiate", {
        vehicleId,
        pickupHubId,
        dropoffHubId,
        startTime,
        endTime,
      });

      if (res.data?.data) {
        setBooking(res.data.data);
        const lockExpiry = new Date(res.data.data.locked_until).getTime();
        const diffSeconds = Math.max(0, Math.floor((lockExpiry - Date.now()) / 1000));
        setSecondsRemaining(diffSeconds);
      }
    } catch (err) {
      console.error("Hold initiation error:", err.response?.data || err.message);
      setHoldError(
        err.response?.data?.message || "Failed to acquire vehicle inventory lock."
      );
    } finally {
      setInitiatingHold(false);
    }
  };

  // Auto-initiate hold on load if user is authenticated and params are present
  useEffect(() => {
    if (isAuthenticated && vehicleId && pickupHubId && startTime && endTime && !booking && !initiatingHold && !holdError) {
      handleInitiateHold();
    }
  }, [isAuthenticated, vehicleId, pickupHubId, startTime, endTime]);

  // 5-Minute Countdown Timer
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Handle KYC Document Upload
  const handleKycUpload = async (e) => {
    e.preventDefault();
    if (!kycFile) {
      setKycError("Please choose a driving license document.");
      return;
    }

    setUploadingKyc(true);
    setKycError("");
    setKycMessage("");

    try {
      const formData = new FormData();
      formData.append("documents", kycFile);

      const res = await api.post("/auth/kyc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setKycMessage(res.data?.message || "Document uploaded successfully!");
      if (res.data?.kyc_status) {
        dispatch(updateUser({ kyc_status: res.data.kyc_status }));
      }
    } catch (err) {
      console.error("KYC Upload error:", err.response?.data || err.message);
      setKycError(err.response?.data?.message || "Failed to upload KYC document.");
    } finally {
      setUploadingKyc(false);
    }
  };

  // Mock Topup Wallet
  const handleTopup = async (amountToAdd) => {
    setToppingUp(true);
    setTopupSuccess("");

    try {
      const res = await api.post("/wallet/topup/mock", { amount: amountToAdd });
      if (res.data?.success) {
        const newBal = parseFloat(res.data.data?.balance || (walletBalance + amountToAdd));
        setWalletBalance(newBal);
        dispatch(updateUser({ wallet_balance: newBal }));
        setTopupSuccess(`₹${amountToAdd.toLocaleString("en-IN")} deposited successfully!`);
        setTimeout(() => setTopupSuccess(""), 4000);
      }
    } catch (err) {
      console.error("Top-up error:", err.response?.data || err.message);
    } finally {
      setToppingUp(false);
    }
  };

  // Confirm Booking Payment from Wallet
  const handleConfirmPayment = async () => {
    if (!booking) return;

    setPaying(true);
    setPayError("");

    try {
      const res = await api.post(`/bookings/${booking.bookingId}/pay`);
      if (res.data?.success) {
        setConfirmedBooking(res.data.data);
        // Refresh wallet balance
        const updatedBal = Math.max(0, walletBalance - parseFloat(booking.total_price));
        setWalletBalance(updatedBal);
        dispatch(updateUser({ wallet_balance: updatedBal }));
      }
    } catch (err) {
      console.error("Payment confirmation error:", err.response?.data || err.message);
      setPayError(err.response?.data?.message || "Payment confirmation failed.");
    } finally {
      setPaying(false);
    }
  };

  // Helpers
  const pickupHub = hubs.find((h) => h.hubId === pickupHubId);
  const dropoffHub = hubs.find((h) => h.hubId === dropoffHubId) || pickupHub;
  const isOneWay = pickupHubId && dropoffHubId && pickupHubId !== dropoffHubId;

  const rentalDays = useMemo(() => {
    if (!startTime || !endTime) return 1;
    const s = new Date(startTime);
    const e = new Date(endTime);
    const diffHours = (e - s) / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(diffHours / 24));
  }, [startTime, endTime]);

  const baseDailyRate = parseFloat(vehicle?.base_daily_rate || 0);
  const estimatedTotal = booking
    ? parseFloat(booking.total_price)
    : baseDailyRate * rentalDays + (isOneWay ? 500 : 0);

  const neededAmount = Math.max(0, estimatedTotal - walletBalance);
  const isHoldExpired = secondsRemaining !== null && secondsRemaining === 0;
  const isKycVerified = user?.kyc_status === "VERIFIED";

  // Format MM:SS for 5-minute timer
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // SUCCESS CONFIRMATION SCREEN
  if (confirmedBooking) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] bg-neutral-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl w-full rounded-3xl bg-neutral-900/90 border border-emerald-500/40 p-8 shadow-[0_20px_60px_rgba(16,185,129,0.15)] text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Booking Confirmed & Locked
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Your Trip is Ready for Takeoff!
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2">
              Payment was completed via your ShiftDrive Digital Wallet. An automated inspection voucher has been issued.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-left space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-neutral-500">Booking Reference</span>
              <span className="font-mono font-bold text-white tracking-wider">
                {confirmedBooking.bookingId}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-neutral-500">Vehicle</span>
              <span className="font-semibold text-white">
                {vehicle?.make} {vehicle?.model}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-neutral-500">Pickup Station</span>
              <span className="font-medium text-white">{pickupHub?.name || "Pickup Hub"}</span>
            </div>

            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-neutral-500">Return Station</span>
              <span className="font-medium text-white">{dropoffHub?.name || "Return Hub"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Total Paid (ShiftDrive Wallet)</span>
              <span className="font-bold text-emerald-400 text-sm">
                ₹{parseFloat(confirmedBooking.total_price || estimatedTotal).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
            >
              Return to Home
            </Link>
            <Link
              href="/fleet"
              className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors shadow-md"
            >
              Explore More Cars
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white font-sans py-10 px-4 sm:px-6 lg:px-8">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-emerald-500/10 to-transparent blur-[140px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative">
        {/* Breadcrumb & Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
              <Link href="/fleet" className="hover:text-emerald-400 transition-colors">
                Fleet
              </Link>
              <ChevronRight className="w-3 h-3 text-neutral-600" />
              <span className="text-white">Secure Checkout</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>Checkout & Vehicle Hold</span>
              <Lock className="w-5 h-5 text-emerald-400" />
            </h1>
          </div>

          {/* Live 5-Minute Timer Badge */}
          {booking && (
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border ${
                isHoldExpired
                  ? "bg-red-950/40 border-red-800/60 text-red-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <Clock className={`w-4 h-4 ${isHoldExpired ? "" : "animate-spin"}`} />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {isHoldExpired ? "Hold Expired" : "5-Min Inventory Lock"}
                </span>
                <span className="text-sm font-mono font-extrabold">
                  {secondsRemaining !== null ? formatTimer(secondsRemaining) : "05:00"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Hold Expired Alert */}
        {isHoldExpired && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                Your 5-minute inventory hold has expired. Please re-lock the vehicle to complete payment.
              </span>
            </div>
            <button
              onClick={handleInitiateHold}
              disabled={initiatingHold}
              className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-400 transition-colors self-start sm:self-auto cursor-pointer"
            >
              {initiatingHold ? "Locking..." : "Re-lock Vehicle"}
            </button>
          </div>
        )}

        {/* Hold Initiation Error */}
        {holdError && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{holdError}</span>
            </div>
            <button
              onClick={handleInitiateHold}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-semibold cursor-pointer"
            >
              Retry Hold
            </button>
          </div>
        )}

        {/* Main Grid: Left Steps + Right Pricing Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Flow Steps */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Authentication Guard */}
            {!isAuthenticated && !authLoading && (
              <div className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Account Authentication Required</h3>
                    <p className="text-xs text-neutral-400">Please sign in or create an account to initiate your vehicle hold.</p>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <Link
                    href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/checkout")}`}
                    className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs text-center hover:bg-neutral-200 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-white font-semibold text-xs text-center hover:bg-neutral-700 transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}

            {/* Step 2: KYC Gate Verification */}
            <div className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isKycVerified
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                  }`}>
                    {isKycVerified ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Driving License & KYC Gate</span>
                      {isKycVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          VERIFIED
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Mandatory government regulation: driving license must be on file before vehicle checkout.
                    </p>
                  </div>
                </div>
              </div>

              {isKycVerified ? (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex items-center gap-3 text-xs text-emerald-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block">Driving License Verified</span>
                    <span className="text-[11px] text-emerald-400/80">
                      Your identity is verified. You are authorized to take handover of this vehicle.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Action Required: Upload Driving License</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Current Status: <strong className="text-amber-400 uppercase font-semibold">{user?.kyc_status || "UNVERIFIED"}</strong>. Upload a clear photo of your driving license to qualify for booking handover.
                    </p>
                  </div>

                  {kycMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400">
                      {kycMessage}
                    </div>
                  )}

                  {kycError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400">
                      {kycError}
                    </div>
                  )}

                  <form onSubmit={handleKycUpload} className="space-y-3">
                    <div className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-neutral-950/50">
                      <input
                        type="file"
                        accept="image/*"
                        id="kyc-upload-input"
                        onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label htmlFor="kyc-upload-input" className="cursor-pointer block">
                        <Upload className="w-6 h-6 text-neutral-500 mx-auto mb-1.5" />
                        <span className="text-xs text-neutral-300 font-semibold block">
                          {kycFile ? kycFile.name : "Choose Driving License Image (Front/Back)"}
                        </span>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          PNG, JPG, or WEBP up to 5MB
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingKyc || !kycFile}
                      className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {uploadingKyc ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading Document...</span>
                        </>
                      ) : (
                        <span>Upload for Verification</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Step 3: ShiftDrive Digital Wallet Payment */}
            <div className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">ShiftDrive Digital Wallet</h3>
                    <p className="text-xs text-neutral-400">
                      Trip payments are processed seamlessly via your dedicated balance.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                    Available Balance
                  </span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    ₹{walletBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {topupSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{topupSuccess}</span>
                </div>
              )}

              {/* Balance Assessment */}
              {walletBalance >= estimatedTotal ? (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Sufficient funds available in wallet to complete this reservation.</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400">
                    -₹{estimatedTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Balance short by ₹{neededAmount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-neutral-500 text-[11px]">Instant Mock Deposit</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={toppingUp}
                      onClick={() => handleTopup(neededAmount)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Exact ₹{neededAmount.toLocaleString("en-IN")}</span>
                    </button>
                    <button
                      type="button"
                      disabled={toppingUp}
                      onClick={() => handleTopup(2000)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      + ₹2,000
                    </button>
                    <button
                      type="button"
                      disabled={toppingUp}
                      onClick={() => handleTopup(5000)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      + ₹5,000
                    </button>
                  </div>
                </div>
              )}

              {/* Pay Error */}
              {payError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {/* Action Button */}
              <div>
                {!booking ? (
                  <button
                    type="button"
                    onClick={handleInitiateHold}
                    disabled={initiatingHold || !isAuthenticated}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {initiatingHold ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Locking Inventory for 5 Minutes...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Lock Vehicle & Start 5-Min Hold</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={
                      paying ||
                      isHoldExpired ||
                      walletBalance < estimatedTotal ||
                      !isKycVerified
                    }
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:brightness-110 text-black font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Deducting Wallet & Confirming...</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        <span>Confirm & Pay ₹{estimatedTotal.toLocaleString("en-IN")} from Wallet</span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-500 mt-3">
                  <span className="flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5 text-purple-400" /> 100% Wallet Refund on Cancel
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sanitized 2-Hour Buffer
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Reservation & Vehicle Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 overflow-hidden sticky top-24">
              {/* Vehicle Preview Card */}
              {loadingData ? (
                <div className="h-44 bg-neutral-800/40 animate-pulse"></div>
              ) : vehicle ? (
                <div>
                  <div className="relative h-48 w-full bg-neutral-950 overflow-hidden">
                    <img
                      src={
                        vehicle.gallery_urls?.[0] ||
                        "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-emerald-400 uppercase">
                      {vehicle.tag || vehicle.vehicle_class}
                    </div>
                  </div>

                  <div className="p-5 border-b border-neutral-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      {vehicle.make}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {vehicle.model}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-2">
                      <span>{vehicle.seats || 5} Seats</span>
                      <span>•</span>
                      <span>{vehicle.fuel_type || "Petrol"}</span>
                      <span>•</span>
                      <span>{vehicle.transmission || "Automatic"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-neutral-400 text-xs">
                  No vehicle selected.
                </div>
              )}

              {/* Station & Timing Info */}
              <div className="p-5 space-y-3.5 border-b border-neutral-800/80 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Pickup Station
                    </span>
                    <span className="font-semibold text-white">
                      {pickupHub?.name || "Selected Pickup Station"}
                    </span>
                    <span className="block text-[11px] text-neutral-400 mt-0.5">
                      {startTime ? new Date(startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Selected Date & Time"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Return Station
                    </span>
                    <span className="font-semibold text-white">
                      {dropoffHub?.name || pickupHub?.name || "Selected Return Station"}
                    </span>
                    <span className="block text-[11px] text-neutral-400 mt-0.5">
                      {endTime ? new Date(endTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Selected Date & Time"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="p-5 space-y-2.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Pricing Breakdown
                </span>

                <div className="flex justify-between items-center text-neutral-300">
                  <span>
                    Daily Rental (₹{baseDailyRate.toLocaleString("en-IN")} × {rentalDays} {rentalDays === 1 ? "day" : "days"})
                  </span>
                  <span className="font-medium text-white">
                    ₹{(baseDailyRate * rentalDays).toLocaleString("en-IN")}
                  </span>
                </div>

                {isOneWay && (
                  <div className="flex justify-between items-center text-blue-400">
                    <span>One-Way Relocation Fee</span>
                    <span className="font-medium">+ ₹500</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-neutral-400">
                  <span>Refundable Security Deposit</span>
                  <span className="text-emerald-400 font-medium">₹0 (Waived)</span>
                </div>

                <div className="flex justify-between items-center text-neutral-400">
                  <span>2-Hour Sanitation & Prep Buffer</span>
                  <span className="text-emerald-400 font-medium">Included (Free)</span>
                </div>

                <div className="border-t border-neutral-800 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Total Amount</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    ₹{estimatedTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-neutral-400 tracking-wide">
              Loading Secure Checkout...
            </p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
