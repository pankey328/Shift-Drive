"use client";

import React, { useState } from "react";
import api from "@/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signInWithPopup } from "firebase/auth";
import { getAuthInstance } from "@/firebase/firebaseConfig";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { login } = useAuth();

  const handleRoleRedirect = (user, requiresPasswordChange) => {
    if (requiresPasswordChange) {
      router.push("/setup-password");
      return;
    }
    const role = user?.role;
    if (role === "SUPERADMIN") {
      router.push("/admin");
    } else if (role === "HUB_ADMIN") {
      router.push("/manager");
    } else {
      router.push("/");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError({});

    try {
      let obj = {};

      if (!loginForm.email.trim()) {
        obj.email = "Email is required";
      }
      if (!loginForm.password) {
        obj.password = "Password is required";
      }

      if (Object.keys(obj).length > 0) {
        setError(obj);
        return;
      }

      setLoading(true);

      const res = await api.post("/auth/login", {
        email: loginForm.email,
        password: loginForm.password,
      });

      if (res.data.token && res.data.user) {
        login(res.data.token, res.data.user);
        handleRoleRedirect(res.data.user, res.data.requires_password_change);
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError({
        form: err.response?.data?.message || err.message || "Login failed. Please verify credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError({});
      const { auth: currentAuth, googleProvider: currentGoogleProvider } = getAuthInstance();
      if (!currentAuth || !currentGoogleProvider) {
        throw new Error("Google sign-in is not configured yet. Please configure Firebase API keys in .env.local.");
      }
      const result = await signInWithPopup(currentAuth, currentGoogleProvider);
      const user = result.user;

      const res = await api.post("/auth/google", {
        name: user.displayName || "Google User",
        email: user.email,
        photo: user.photoURL,
        uid: user.uid,
      });

      if (res.data.token && res.data.user) {
        login(res.data.token, res.data.user);
        handleRoleRedirect(res.data.user, false);
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError({
        form: err.response?.data?.message || err.message || "Google sign-in was cancelled or failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center bg-neutral-950 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden py-12">
      {/* Background lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute -top-24 right-1/4 w-72 h-72 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative w-full max-w-[420px] bg-neutral-900/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.5)] p-6 sm:p-8 border border-neutral-800 transition-all duration-500 z-10">
        {/* Heading Section */}
        <div className="text-center mb-6 mt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ShiftDrive Mobility
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 font-light">
            Enter your credentials to access your fleet account.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm({ ...loginForm, email: e.target.value })
              }
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

          {/* Password Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5 mx-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Password
              </label>
              <Link
                href="/forget-password"
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                className={`w-full px-4 py-3 pr-11 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                  error.password
                    ? "border-red-800 bg-red-950/20 text-red-200"
                    : "border-neutral-800 focus:border-emerald-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
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

          {/* Global Form Error */}
          {error.form && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/40 text-center animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-red-400 text-xs font-medium">
                {error.form}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-xl shadow-lg hover:bg-neutral-200 transition-all active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1.5">
            <div className="h-px w-full bg-neutral-800"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 whitespace-nowrap">
              Or
            </span>
            <div className="h-px w-full bg-neutral-800"></div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-neutral-200 font-semibold py-3 rounded-xl flex items-center justify-center gap-3 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Footer Link */}
          <div className="text-center pt-2">
            <p className="text-xs sm:text-sm text-neutral-400">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
