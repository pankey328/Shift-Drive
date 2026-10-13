"use client";

import React, { useState } from "react";
import api from "@/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function SetupPasswordPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/setup-password", { newPassword });
      setSuccess(res.data?.message || "Permanent password configured successfully! Redirecting...");

      if (user) {
        const updatedUser = { ...user, requires_password_change: false };
        login(localStorage.getItem("token"), updatedUser);
      }

      setTimeout(() => {
        if (user?.role === "HUB_ADMIN") {
          router.push("/manager");
        } else if (user?.role === "SUPERADMIN") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }, 1500);
    } catch (err) {
      console.error("Setup Password Error:", err);
      setError(err.response?.data?.message || "Failed to set password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center bg-neutral-950 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden py-12">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="relative w-full max-w-[420px] bg-neutral-900/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.5)] p-6 sm:p-8 border border-neutral-800 transition-all duration-500 z-10">
        <div className="text-center mb-6 mt-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Permanent Password Setup
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 font-light">
            You are logged in with temporary credentials. Set a permanent password to secure your branch manager account.
          </p>
        </div>

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-emerald-400 text-xs font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-800/40 text-center animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-red-400 text-xs font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
              New Permanent Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none border-neutral-800 focus:border-emerald-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
              Confirm Permanent Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none border-neutral-800 focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-xl shadow-lg hover:bg-neutral-200 transition-all active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving Password...</span>
              </>
            ) : (
              "Save & Continue to Desk"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
