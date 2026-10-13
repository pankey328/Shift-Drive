"use client";

import React, { useState } from "react";
import api from "@/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [form, setForm] = useState({
    email: user?.email || "",
    password: "",
    newpassword: "",
    confirmpassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError({});
    setSuccessMessage("");

    let obj = {};
    if (!form.email.trim()) obj.email = "Email is required";
    if (!form.password) obj.password = "Current password is required";
    if (!form.newpassword) obj.newpassword = "New password is required";
    if (form.newpassword && form.newpassword.length < 6) {
      obj.newpassword = "Password must be at least 6 characters";
    }

    if (!form.confirmpassword) {
      obj.confirmpassword = "Confirm password is required";
    } else if (form.newpassword !== form.confirmpassword) {
      obj.confirmpassword = "Passwords must be the same";
    }

    if (Object.keys(obj).length > 0) {
      setError(obj);
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/reset", {
        email: form.email.toLowerCase().trim(),
        password: form.password,
        newpassword: form.newpassword,
        confirmpassword: form.confirmpassword,
      });

      setSuccessMessage(
        "Password changed successfully! Redirecting to login...",
      );

      logout();
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error("Reset Password Error:", err);
      setError({
        form:
          err.response?.data?.message ||
          "Failed to update password. Please check your current password.",
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
            Security Credentials
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Update Password
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 font-light">
            Secure your fleet profile with a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-emerald-400 text-xs font-medium">
                {successMessage}
              </p>
            </div>
          )}

          {error.form && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/40 text-center animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-red-400 text-xs font-medium">
                {error.form}
              </p>
            </div>
          )}

          {/* Email Input */}
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

          {/* Current Password Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`w-full px-4 py-3 pr-11 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                  error.password
                    ? "border-red-800 bg-red-950/20 text-red-200"
                    : "border-neutral-800 focus:border-emerald-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                tabIndex={-1}
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {error.password && (
              <p className="text-red-400 text-[10px] font-medium mt-1 ml-1">
                {error.password}
              </p>
            )}
          </div>

          {/* New Password Input */}
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

          {/* Confirm Password Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
              Confirm New Password
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
                <span>Saving Password...</span>
              </>
            ) : (
              "Save Password"
            )}
          </button>

          <div className="text-center mt-3 pt-3 border-t border-neutral-800">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-neutral-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel and return
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
