"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useDispatch } from "react-redux";
import { updateUser } from "@/redux/slices/authSlice";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronRight,
  ArrowLeft,
  XCircle,
  Sparkles,
  Info,
  Car,
} from "lucide-react";

function KycContent() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();

  const [kycStatus, setKycStatus] = useState("UNVERIFIED");
  const [documentUrl, setDocumentUrl] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Fetch Fresh User Profile
  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await api.get("/auth/me");
      if (res.data?.user) {
        dispatch(updateUser(res.data.user));
        setKycStatus(res.data.user.kyc_status || "UNVERIFIED");
        setDocumentUrl(res.data.user.kyc_document_url || "");
      }
    } catch (err) {
      console.warn("Could not fetch user profile:", err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  // Handle File Selection with Image Preview
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit KYC Document
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please choose a valid driving license image.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("documents", selectedFile);

      const res = await api.post("/auth/kyc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        setUploadSuccess(res.data.message || "Document uploaded successfully! Under review.");
        setKycStatus("PENDING");
        if (res.data.kyc_document_url) {
          setDocumentUrl(res.data.kyc_document_url);
        }
        dispatch(updateUser({ kyc_status: "PENDING", kyc_document_url: res.data.kyc_document_url }));
        setSelectedFile(null);
        setFilePreview(null);
        await fetchProfile();
      }
    } catch (err) {
      console.error("KYC Upload error:", err.response?.data || err.message);
      setUploadError(err.response?.data?.message || "Failed to upload KYC document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // RESTRICTION / EXEMPTION FOR STAFF ACCOUNTS
  if (user?.role && user.role !== "CUSTOMER") {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-neutral-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-emerald-500/30 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Staff Portal Exemption
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              KYC Not Required for Staff
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
              As a {user.role === "SUPERADMIN" ? "Superadmin" : "Station Manager"}, your administrative account is exempt from consumer driving license verification.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-left space-y-2 text-xs">
            <p className="text-neutral-300 font-semibold">
              Looking to review customer driving licenses?
            </p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Customer license uploads are audited and verified through the operations desk in the management dashboard.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href={user.role === "SUPERADMIN" ? "/admin/kyc" : "/manager"}
              className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all shadow-md"
            >
              {user.role === "SUPERADMIN" ? "Open KYC Audits Desk" : "Open Station Desk"}
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                <Link href="/" className="hover:text-emerald-400 transition-colors">
                  Home
                </Link>
                <ChevronRight className="w-3 h-3 text-neutral-600" />
                <Link href="/trips" className="hover:text-emerald-400 transition-colors">
                  Dashboard
                </Link>
                <ChevronRight className="w-3 h-3 text-neutral-600" />
                <span className="text-white">KYC Verification</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <span>Driving License & Identity Gate</span>
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 font-light mt-0.5">
                Mandatory compliance verification required for booking authorization and key handovers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/trips"
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>My Dashboard</span>
              </Link>
              <Link
                href="/fleet"
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-md shadow-black/40"
              >
                <span>Browse Fleet</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Status Card & Upload Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Real-time Status Card */}
            <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Current Verification State
                </span>

                {kycStatus === "VERIFIED" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified & Approved
                  </span>
                )}

                {kycStatus === "PENDING" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    <Clock className="w-4 h-4 animate-spin" />
                    Under Verification
                  </span>
                )}

                {kycStatus === "UNVERIFIED" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Action Required
                  </span>
                )}

                {kycStatus === "REJECTED" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-bold">
                    <XCircle className="w-4 h-4" />
                    Document Rejected
                  </span>
                )}
              </div>

              {/* Status Explanation */}
              {kycStatus === "VERIFIED" && (
                <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-2 text-xs text-emerald-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Eligible for Instant Handover</span>
                  </div>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                    Your driving license has been authenticated. You can book any luxury or standard vehicle across all ShiftDrive hubs with zero checkout delays.
                  </p>
                </div>
              )}

              {kycStatus === "PENDING" && (
                <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-2 text-xs text-amber-300">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Clock className="w-5 h-5" />
                    <span>Review in Progress</span>
                  </div>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                    Your license document was received. Station dispatch managers will verify the details against government databases shortly.
                  </p>
                </div>
              )}

              {kycStatus === "REJECTED" && (
                <div className="p-5 rounded-2xl bg-red-950/20 border border-red-800/40 space-y-2 text-xs text-red-300">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Verification Unsuccessful</span>
                  </div>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                    The uploaded document could not be verified (e.g. blurred image, expired license, or obscured corners). Please upload a clear photo to proceed.
                  </p>
                </div>
              )}

              {kycStatus === "UNVERIFIED" && (
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs text-neutral-400">
                  <p className="leading-relaxed">
                    Under Indian motor vehicle rental laws, a valid Driving License is strictly required before reserving and taking physical handover of a self-drive vehicle.
                  </p>
                </div>
              )}

              {/* Upload Form (Shown if not VERIFIED or if customer wants to re-upload) */}
              {kycStatus !== "VERIFIED" && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Upload Driving License</span>
                  </h3>

                  {uploadSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{uploadSuccess}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUploadSubmit} className="space-y-4">
                    {/* File Dropzone */}
                    <div className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-neutral-950/50 relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="kyc-file-input"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="kyc-file-input" className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                        <span className="text-xs text-neutral-200 font-semibold block">
                          {selectedFile ? selectedFile.name : "Click to select Driving License photo"}
                        </span>
                        <span className="text-[11px] text-neutral-500 block mt-1">
                          PNG, JPG, or WEBP up to 5MB (Front and back must be legible)
                        </span>
                      </label>
                    </div>

                    {/* Preview if chosen */}
                    {filePreview && (
                      <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 p-2 max-h-56 flex items-center justify-center">
                        <img
                          src={filePreview}
                          alt="Document Preview"
                          className="max-h-52 object-contain rounded-xl"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={uploading || !selectedFile}
                      className="w-full py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading Document to Secure Storage...</span>
                        </>
                      ) : (
                        <span>Submit for Verification</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Uploaded Document Preview & Verification Guidelines */}
          <div className="lg:col-span-5 space-y-6">
            {/* Current Document on File Card */}
            {documentUrl && (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Document On File
                </span>
                <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 h-52 flex items-center justify-center">
                  <img
                    src={documentUrl}
                    alt="Current KYC License"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono text-emerald-400 border border-white/10">
                    {kycStatus}
                  </div>
                </div>
              </div>
            )}

            {/* Compliance Guidelines */}
            <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-400" />
                <span>Verification Guidelines</span>
              </h3>

              <div className="space-y-2.5 text-neutral-400 text-[11px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Ensure your full legal name and license number are sharply visible.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Document must have a valid expiration date (expired licenses cannot be accepted).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Avoid flashlight glare or reflections obscuring text and portrait.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>All 4 edges of the physical card should be framed inside the photo.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function KycPage() {
  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "HUB_ADMIN", "SUPERADMIN"]}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-neutral-400 tracking-wide">
                Loading KYC Verification Gate...
              </p>
            </div>
          </div>
        }
      >
        <KycContent />
      </Suspense>
    </ProtectedRoute>
  );
}
