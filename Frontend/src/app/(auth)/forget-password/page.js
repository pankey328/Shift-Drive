"use client";

import React, { useState } from "react";
import api from "@/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    otp: "",
    newpassword: "",
    confirmpassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const sendOtp = async (e) => {
    e.preventDefault();
    let err = {};
    setError({});
    setSuccessMessage("");

    if (!form.email.trim()) {
      err.email = "Email is required";
    }

    if (Object.keys(err).length > 0) {
      setError(err);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/forget", {
        email: form.email.toLowerCase().trim(),
      });

      setSuccessMessage(res.data?.message || "Recovery code sent successfully to your email!");
      setOtpSent(true);
    } catch (err) {
      console.error("Forget Password Error:", err);
      setError({
        form: err.response?.data?.message || "Error sending recovery code. Please check your email.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    let err = {};
    setError({});
    setSuccessMessage("");

    if (!form.otp.trim()) err.otp = "6-digit OTP is required";
    if (!form.newpassword) err.newpassword = "New password is required";
    if (form.newpassword && form.newpassword.length < 6) {
      err.newpassword = "Password must be at least 6 characters";
    }
    if (!form.confirmpassword) {
      err.confirmpassword = "Confirm password is required";
    }

    if (
      form.newpassword &&
      form.confirmpassword &&
      form.newpassword !== form.confirmpassword
    ) {
      err.confirmpassword = "Passwords must be the same";
    }

    if (Object.keys(err).length > 0) {
      setError(err);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/verify-forget", {
        email: form.email.toLowerCase().trim(),
        otp: form.otp.trim(),
        newpassword: form.newpassword,
        confirmpassword: form.confirmpassword,
      });

      setSuccessMessage(
        res.data?.message || "Password changed successfully! Redirecting to login...",
      );
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error("Reset Password Error:", err);
      setError({
        form: err.response?.data?.message || "Error resetting password. Check your OTP and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center bg-neutral-950 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden py-12">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="relative w-full max-w-[420px] bg-neutral-900/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.5)] p-6 sm:p-8 border border-neutral-800 transition-all duration-500 z-10">
        {/* Heading Section */}
        <div className="text-center mb-5 mt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Account Recovery
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {!otpSent ? "Reset Password" : "New Password"}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 font-light">
            {!otpSent
              ? "Enter your email to receive a secure recovery code."
              : "Create a secure new password for your account."}
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-emerald-400 text-xs font-medium">
              {successMessage}
            </p>
          </div>
        )}

        {error.form && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-800/40 text-center animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-red-400 text-xs font-medium">
              {error.form}
            </p>
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={sendOtp} noValidate className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                  error.email
                    ? "border-red-800 bg-red-950/20 text-red-200"
                    : "border-neutral-800 focus:border-emerald-500"
                }`}
              />
              {error.email && (
                <p className="text-red-400 text-[10px] font-medium mt-1 ml-1">
                  {error.email}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !form.email}
              className="w-full bg-white text-black font-semibold py-3.5 rounded-xl shadow-lg hover:bg-neutral-200 transition-all active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending Recovery Code...</span>
                </>
              ) : (
                "Send Recovery Code"
              )}
            </button>

            <div className="text-center mt-4 pt-4 border-t border-neutral-800">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={resetPassword} noValidate className="space-y-3">
            {/* Code Sent To Display */}
            <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-3 text-center mb-3">
              <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mb-1">
                Code Sent To
              </p>
              <p className="text-sm font-semibold text-white">
                {form.email}
              </p>
            </div>

            {/* OTP Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1 text-center">
                6-Digit Secure Code
              </label>
              <input
                type="text"
                maxLength="6"
                placeholder="••••••"
                value={form.otp}
                onChange={(e) => setForm({ ...form, otp: e.target.value })}
                className={`w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-xl rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-600 focus:outline-none transition-colors ${
                  error.otp
                    ? "border-red-800 bg-red-950/20 text-red-200"
                    : "border-neutral-800 focus:border-emerald-500"
                }`}
              />
              {error.otp && (
                <p className="text-red-400 text-[10px] font-medium mt-1 text-center">
                  {error.otp}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={form.newpassword}
                  onChange={(e) =>
                    setForm({ ...form, newpassword: e.target.value })
                  }
                  className={`w-full px-4 py-3 pr-11 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                    error.newpassword
                      ? "border-red-800 bg-red-950/20 text-red-200"
                      : "border-neutral-800 focus:border-emerald-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {error.newpassword && (
                <p className="text-red-400 text-[10px] font-medium mt-1 ml-1">
                  {error.newpassword}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={form.confirmpassword}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      confirmpassword: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-3 pr-11 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                    error.confirmpassword
                      ? "border-red-800 bg-red-950/20 text-red-200"
                      : "border-neutral-800 focus:border-emerald-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {error.confirmpassword && (
                <p className="text-red-400 text-[10px] font-medium mt-1 ml-1">
                  {error.confirmpassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-3.5 rounded-xl shadow-lg hover:bg-neutral-200 transition-all active:scale-[0.98] mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                "Update Password"
              )}
            </button>

            <div className="text-center mt-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setForm({
                    ...form,
                    otp: "",
                    newpassword: "",
                    confirmpassword: "",
                  });
                  setError({});
                  setSuccessMessage("");
                }}
                className="text-xs sm:text-sm font-medium text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Use a different email address
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
