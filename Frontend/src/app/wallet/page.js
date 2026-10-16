"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useDispatch } from "react-redux";
import { updateUser } from "@/redux/slices/authSlice";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Wallet,
  ShieldCheck,
  RotateCcw,
  Plus,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Clock,
  Sparkles,
  CreditCard,
  History,
} from "lucide-react";

function WalletContent() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();

  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Top-Up Form States
  const [toppingUp, setToppingUp] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [notice, setNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");

  // Ledger Filter: 'ALL', 'CREDIT', 'DEBIT'
  const [ledgerFilter, setLedgerFilter] = useState("ALL");

  // Fetch Wallet Data
  const fetchWalletData = async () => {
    try {
      setLoadingData(true);
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
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWalletData();
    }
  }, [isAuthenticated]);

  // Sync wallet balance from user state
  useEffect(() => {
    if (user?.wallet_balance !== undefined) {
      setWalletBalance(parseFloat(user.wallet_balance || 0));
    }
  }, [user?.wallet_balance]);

  // Handle Mock Deposit
  const handleDeposit = async (amountToAdd) => {
    const num = parseFloat(amountToAdd);
    if (!num || num <= 0) {
      setErrorNotice("Please enter a valid deposit amount greater than zero.");
      return;
    }

    setToppingUp(true);
    setNotice("");
    setErrorNotice("");

    try {
      const res = await api.post("/wallet/topup/mock", { amount: num });
      if (res.data?.success) {
        const newBal = parseFloat(res.data.data?.newBalance ?? (walletBalance + num));
        setWalletBalance(newBal);
        dispatch(updateUser({ wallet_balance: newBal }));
        setNotice(`₹${num.toLocaleString("en-IN")} deposited successfully into your ShiftDrive Wallet!`);
        setCustomAmount("");
        await fetchWalletData();
        setTimeout(() => setNotice(""), 4000);
      }
    } catch (err) {
      console.error("Top-up error:", err.response?.data || err.message);
      setErrorNotice(err.response?.data?.message || "Deposit request failed. Please wait a few seconds and try again.");
    } finally {
      setToppingUp(false);
    }
  };

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const isCredit = parseFloat(tx.amount) > 0;
      if (ledgerFilter === "CREDIT") return isCredit;
      if (ledgerFilter === "DEBIT") return !isCredit;
      return true;
    });
  }, [transactions, ledgerFilter]);

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white font-sans pb-24">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-[140px] pointer-events-none"></div>

      {/* Top Banner */}
      <div className="border-b border-neutral-900 bg-neutral-950/60 backdrop-blur-xl pt-8 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                <Link href="/" className="hover:text-emerald-400 transition-colors">
                  Home
                </Link>
                <ChevronRight className="w-3 h-3 text-neutral-600" />
                <Link href="/trips" className="hover:text-emerald-400 transition-colors">
                  My Trips
                </Link>
                <ChevronRight className="w-3 h-3 text-neutral-600" />
                <span className="text-white">Wallet</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <span>ShiftDrive Digital Wallet</span>
                <Wallet className="w-6 h-6 text-emerald-400" />
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 font-light mt-0.5">
                Instant 100% cancellation refunds, secure booking charges, and zero-fee deposits.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/trips"
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>My Bookings</span>
              </Link>
              <Link
                href="/fleet"
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-md shadow-black/40"
              >
                <span>Book Car</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Balance Card & Deposit Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* Balance Card */}
            <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Available Funds</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  Active
                </span>
              </div>

              <div>
                <span className="text-xs text-neutral-400">Current Balance</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                  ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 text-xs space-y-1 text-neutral-400">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  100% Instant Refund Gated
                </span>
                <p className="text-[11px] leading-relaxed">
                  Cancelled trips and security deposit releases are immediately credited back to this wallet without payment gateway processing delays.
                </p>
              </div>
            </div>

            {/* Instant Deposit Card */}
            <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Instant Mock Deposit</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Simulate adding funds directly to your ShiftDrive balance for testing.
                </p>
              </div>

              {notice && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              {errorNotice && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorNotice}</span>
                </div>
              )}

              {/* Preset Amount Pills */}
              <div className="grid grid-cols-3 gap-2">
                {[1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={toppingUp}
                    onClick={() => handleDeposit(amt)}
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
                  if (customAmount) handleDeposit(customAmount);
                }}
                className="space-y-3 pt-2"
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="Enter custom deposit amount..."
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={toppingUp || !customAmount}
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
            <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>Transaction Audit Ledger</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Real-time chronological log of deposits, booking payments, and refund credits.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px]">
                  {["ALL", "CREDIT", "DEBIT"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setLedgerFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        ledgerFilter === tab
                          ? "bg-white text-black shadow-sm"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {tab === "ALL" ? "All" : tab === "CREDIT" ? "Credits" : "Debits"}
                    </button>
                  ))}
                </div>
              </div>

              {loadingData ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-2xl bg-neutral-950/60 border border-neutral-800/60 animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-16 text-xs text-neutral-500 space-y-2">
                  <CreditCard className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p>No {ledgerFilter.toLowerCase()} transactions recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                  {filteredTransactions.map((tx) => {
                    const isCredit = parseFloat(tx.amount) > 0;
                    return (
                      <div
                        key={tx.transactionId || tx.id}
                        className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                              isCredit
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
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                              <span className="font-mono">
                                {new Date(tx.createdAt).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                              {tx.booking_id && (
                                <span className="font-mono text-neutral-400">
                                  Ref: {tx.booking_id.slice(0, 8)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isCredit ? "text-emerald-400" : "text-neutral-300"
                            }`}
                          >
                            {isCredit ? "+" : ""}
                            ₹{Math.abs(parseFloat(tx.amount)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="block text-[9px] text-neutral-500 uppercase tracking-wider font-mono">
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
      </main>
    </div>
  );
}

export default function WalletPage() {
  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "HUB_ADMIN", "SUPERADMIN"]}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-neutral-400 tracking-wide">
                Loading ShiftDrive Wallet...
              </p>
            </div>
          </div>
        }
      >
        <WalletContent />
      </Suspense>
    </ProtectedRoute>
  );
}
