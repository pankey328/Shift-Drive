"use client";

import React, { useState } from "react";
import api from "@/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmpassword: "",
    otp: "",
  });
  const [error, setError] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // Send OTP
  const sendOtp = async (e) => {
    e.preventDefault();
    setError({});
    setSuccessMessage("");

    try {
      let obj = {};

      if (!signupForm.name.trim()) obj.name = "Full name is required";
      if (!signupForm.email.trim()) obj.email = "Email is required";
      if (!signupForm.password) obj.password = "Password is required";
      if (signupForm.password && signupForm.password.length < 6) {
        obj.password = "Password must be at least 6 characters";
      }

      if (!signupForm.confirmpassword) {
        obj.confirmpassword = "Confirm password is required";
      } else if (signupForm.password !== signupForm.confirmpassword) {
        obj.confirmpassword = "Passwords must be the same";
      }

      if (Object.keys(obj).length > 0) {
        setError(obj);
        return;
      }

      setLoading(true);

      const data = {
        name: signupForm.name.trim(),
        email: signupForm.email.toLowerCase().trim(),
        password: signupForm.password,
        role: "CUSTOMER",
      };

      const res = await api.post("/auth/send-otp", data);

      setSuccessMessage(
        res.data?.message || "OTP verification code sent to your email!"
      );
      setIsOtpSent(true);
    } catch (err) {
      console.error("Signup Send-OTP Error:", err);
      setError({
        form:
          err.response?.data?.message ||
          "Failed to send verification code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and Complete Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError({});
    setSuccessMessage("");

    if (!signupForm.otp.trim()) {
      setError({ otp: "6-digit OTP code is required" });
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/verify-otp", {
        email: signupForm.email.toLowerCase().trim(),
        otp: signupForm.otp.trim(),
      });

      setSuccessMessage(
        res.data?.message || "Account verified successfully! Redirecting to login..."
      );

      setSignupForm({
        name: "",
        email: "",
        password: "",
        confirmpassword: "",
        otp: "",
      });

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error("Verify OTP Error:", err);
      setError({
        form: err.response?.data?.message || "Invalid or expired OTP. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center bg-neutral-950 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden py-12">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="relative w-full max-w-[420px] bg-neutral-900/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.5)] p-6 sm:p-8 border border-neutral-800 transition-all duration-500 z-10">
        {/* Heading Section */}
        <div className="text-center mb-5 mt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ShiftDrive Onboarding
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isOtpSent ? "Verify Email" : "Create Account"}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 font-light">
            {isOtpSent
              ? "Enter the 6-digit verification code sent to your inbox."
              : "Register to unlock self-drive car bookings."}
          </p>
        </div>

        <form
          onSubmit={isOtpSent ? handleSubmit : sendOtp}
          noValidate
          className="space-y-3"
        >
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

          {!isOtpSent && (
            <>
              {/* Name Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={signupForm.name}
                  placeholder="e.g. Rahul Sharma"
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, name: e.target.value })
                  }
                  className={`w-full px-4 py-3 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                    error.name
                      ? "border-red-800 bg-red-950/20 text-red-200"
                      : "border-neutral-800 focus:border-emerald-500"
                  }`}
                  required
                />
                {error.name && (
                  <p className="text-red-400 text-[10px] font-medium mt-1 ml-1">
                    {error.name}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={signupForm.email}
                  placeholder="name@example.com"
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, email: e.target.value })
                  }
                  className={`w-full px-4 py-3 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                    error.email
                      ? "border-red-800 bg-red-950/20 text-red-200"
                      : "border-neutral-800 focus:border-emerald-500"
                  }`}
                  required
                />
                {error.email && (
                  <p className="text-red-400 text-[10px] font-medium mt-1 ml-1">
                    {error.email}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={signupForm.password}
                    placeholder="Create a strong password"
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, password: e.target.value })
                    }
                    className={`w-full px-4 py-3 pr-11 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                      error.password
                        ? "border-red-800 bg-red-950/20 text-red-200"
                        : "border-neutral-800 focus:border-emerald-500"
                    }`}
                    required
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

              {/* Confirm Password Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={signupForm.confirmpassword}
                    placeholder="Confirm your password"
                    onChange={(e) =>
                      setSignupForm({
                        ...signupForm,
                        confirmpassword: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 pr-11 rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                      error.confirmpassword
                        ? "border-red-800 bg-red-950/20 text-red-200"
                        : "border-neutral-800 focus:border-emerald-500"
                    }`}
                    required
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
            </>
          )}

          {isOtpSent && (
            <div className="space-y-4 py-2">
              {/* Display Target Email */}
              <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mb-1">
                  Code Sent To
                </p>
                <p className="text-sm font-semibold text-white">
                  {signupForm.email}
                </p>
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 ml-1 text-center">
                  6-Digit Secure Code
                </label>
                <input
                  type="text"
                  maxLength="6"
                  value={signupForm.otp}
                  placeholder="••••••"
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, otp: e.target.value })
                  }
                  className={`w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-xl rounded-xl border bg-neutral-950/60 text-white placeholder-neutral-600 focus:outline-none transition-colors ${
                    error.otp
                      ? "border-red-800 bg-red-950/20 text-red-200"
                      : "border-neutral-800 focus:border-emerald-500"
                  }`}
                  required
                />
                {error.otp && (
                  <p className="text-red-400 text-[10px] font-medium mt-1.5 text-center">
                    {error.otp}
                  </p>
                )}
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  Edit email address
                </button>
              </div>
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
                <span>{isOtpSent ? "Verifying..." : "Sending OTP..."}</span>
              </>
            ) : isOtpSent ? (
              "Verify & Sign Up"
            ) : (
              "Continue"
            )}
          </button>

          {!isOtpSent && (
            <div className="mt-4 pt-4 border-t border-neutral-800">
              <div className="text-center text-xs sm:text-sm">
                <span className="text-neutral-400">
                  Already have an account?{" "}
                </span>
                <Link
                  href="/login"
                  className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
