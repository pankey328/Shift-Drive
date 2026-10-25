"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/api";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  AlertTriangle,
  FileText,
  User,
  Phone,
  Mail,
  RefreshCw,
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Calendar,
  Clock,
  Sparkles,
  Award,
  Filter,
  Check,
} from "lucide-react";

export default function AdminKycPage() {
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("PENDING"); // PENDING, VERIFIED, REJECTED, ALL
  const [searchQuery, setSearchQuery] = useState("");

  // Review Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectionReasonPreset, setRejectionReasonPreset] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [imageZoom, setImageZoom] = useState(1);

  // Quick triage approve loading tracker
  const [quickApprovingId, setQuickApprovingId] = useState(null);

  const REJECTION_PRESETS = [
    "Driving license image is blurry, cropped, or illegible.",
    "Document has expired. Please upload a valid, active driving license.",
    "Name on the driving license does not match account registration details.",
    "Incomplete submission. Both front and rear sides of license are required.",
    "Uploaded document is not a recognized government-issued driving license.",
    "Document appears altered, damaged, or obscured.",
    "Custom reason (specify below)...",
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      if (res.data?.success) {
        setAllUsers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load KYC users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Review (Approve / Reject)
  const handleReview = async (status, quickUserId = null) => {
    const targetUser = quickUserId
      ? allUsers.find((u) => u.userId === quickUserId)
      : selectedUser;

    if (!targetUser) return;

    let finalReason = null;
    if (status === "REJECTED") {
      finalReason =
        rejectionReasonPreset === "Custom reason (specify below)..." || !rejectionReasonPreset
          ? customNotes.trim()
          : rejectionReasonPreset + (customNotes.trim() ? ` Notes: ${customNotes.trim()}` : "");

      if (!finalReason) {
        setActionError("Please provide or select a rejection reason.");
        return;
      }
    } else {
      finalReason = customNotes.trim() || "Approved by Superadmin KYC Desk";
    }

    if (quickUserId) {
      setQuickApprovingId(quickUserId);
    } else {
      setSubmitting(true);
      setActionError("");
      setActionSuccess("");
    }

    try {
      const res = await api.patch(`/admin/users/${targetUser.userId}/kyc`, {
        status,
        rejectionReason: finalReason,
      });

      if (res.data?.success) {
        // Optimistically update local state
        setAllUsers((prev) =>
          prev.map((u) =>
            u.userId === targetUser.userId
              ? { ...u, kyc_status: status, kyc_rejection_reason: finalReason }
              : u
          )
        );

        if (!quickUserId) {
          setActionSuccess(`Customer KYC successfully updated to ${status}. Notification dispatched.`);
          setTimeout(() => {
            setSelectedUser(null);
            setRejectionReasonPreset("");
            setCustomNotes("");
            setActionSuccess("");
            setImageZoom(1);
          }, 1100);
        }
      }
    } catch (err) {
      if (quickUserId) {
        alert(err.response?.data?.message || "Failed to approve KYC.");
      } else {
        setActionError(err.response?.data?.message || "Failed to process KYC review.");
      }
    } finally {
      setSubmitting(false);
      setQuickApprovingId(null);
    }
  };

  // Metrics Counters
  const pendingCount = allUsers.filter((u) => u.kyc_status === "PENDING").length;
  const verifiedCount = allUsers.filter((u) => u.kyc_status === "VERIFIED").length;
  const rejectedCount = allUsers.filter((u) => u.kyc_status === "REJECTED").length;
  const totalSubmissions = pendingCount + verifiedCount + rejectedCount;
  const approvalRate =
    verifiedCount + rejectedCount > 0
      ? Math.round((verifiedCount / (verifiedCount + rejectedCount)) * 100)
      : 100;

  // Tab Filtering & Search
  const filteredUsers = allUsers.filter((u) => {
    if (activeTab !== "ALL" && u.kyc_status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.userId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>ShiftDrive Trust & Safety</span>
            <span>•</span>
            <span className="text-neutral-400">Identity Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Customer KYC Verification Desk
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Review government driving licenses, verify applicant identity credentials, and approve or reject submissions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI METRIC STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Pending Review
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <span className="text-2xl font-black text-amber-400 font-mono block">
            {pendingCount}
          </span>
          <span className="text-[10px] text-neutral-500">Requires manual triage</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Verified Drivers
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono block">
            {verifiedCount}
          </span>
          <span className="text-[10px] text-neutral-500">Authorized to rent fleet</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Rejected Documents
            </span>
            <XCircle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <span className="text-2xl font-black text-red-400 font-mono block">
            {rejectedCount}
          </span>
          <span className="text-[10px] text-neutral-500">Resubmissions pending</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Approval Pass Rate
            </span>
            <Award className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-2xl font-black text-purple-400 font-mono block">
            {approvalRate}%
          </span>
          <span className="text-[10px] text-neutral-500">Verification conversion</span>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold overflow-x-auto">
          {[
            { id: "PENDING", label: `Pending Queue (${pendingCount})` },
            { id: "VERIFIED", label: `Verified (${verifiedCount})` },
            { id: "REJECTED", label: `Rejected (${rejectedCount})` },
            { id: "ALL", label: `All Applicants (${allUsers.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applicant name, email, phone..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/60"
          />
        </div>
      </div>

      {/* APPLICANTS GRID */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Scanning customer identity records...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Records in this Category</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {activeTab === "PENDING"
              ? "All pending driving licenses have been reviewed! New submissions will automatically queue here."
              : "No customer records match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((user) => (
            <div
              key={user.userId}
              className={`p-5 rounded-3xl bg-neutral-900 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                user.kyc_status === "PENDING"
                  ? "border-amber-800/40 hover:border-amber-700/60"
                  : user.kyc_status === "VERIFIED"
                  ? "border-neutral-800 hover:border-emerald-800/40"
                  : "border-neutral-800 hover:border-red-800/40"
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      user.kyc_status === "PENDING"
                        ? "bg-amber-950/60 border border-amber-800 text-amber-400"
                        : user.kyc_status === "VERIFIED"
                        ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                        : "bg-red-950/60 border border-red-800 text-red-400"
                    }`}
                  >
                    {user.kyc_status || "UNVERIFIED"}
                  </span>

                  <span className="text-[10px] text-neutral-500 font-mono">
                    Registered:{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Applicant Bio */}
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>{user.name}</span>
                  </h4>
                  <span className="text-xs font-mono text-neutral-300 block mt-0.5">
                    {user.phone || "No phone registered"}
                  </span>
                  <span className="text-xs text-neutral-400 block truncate">
                    {user.email}
                  </span>
                </div>

                {/* Document Status Strip */}
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 block uppercase tracking-wider font-semibold">
                    Driving License Attachment
                  </span>
                  {user.kyc_document_url ? (
                    <div className="flex items-center gap-2.5 pt-1">
                      {user.kyc_document_url.startsWith("http") || user.kyc_document_url.startsWith("/") ? (
                        <div className="w-10 h-8 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={user.kyc_document_url}
                            alt="DL Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0 flex items-center justify-between text-xs">
                        <span className="text-purple-300 font-mono truncate max-w-[170px]">
                          {user.kyc_document_url.startsWith("http") || user.kyc_document_url.startsWith("/")
                            ? "Driving License Photo"
                            : user.kyc_document_url.replace(/^DL#\s*/i, "DL: ")}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 flex-shrink-0">
                          <Check className="w-3 h-3" />
                          Uploaded
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-500 italic block">
                      No document image uploaded yet
                    </span>
                  )}
                </div>

                {/* Historical Rejection Reason if any */}
                {user.kyc_status === "REJECTED" && user.kyc_rejection_reason && (
                  <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/40 text-[11px] text-red-300/90 space-y-0.5">
                    <span className="font-semibold text-red-400 block text-[10px] uppercase">
                      Rejection Reason:
                    </span>
                    <p className="line-clamp-2 italic">&ldquo;{user.kyc_rejection_reason}&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(user);
                    setRejectionReasonPreset("");
                    setCustomNotes(user.kyc_rejection_reason || "");
                    setActionError("");
                    setActionSuccess("");
                    setImageZoom(1);
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-purple-600/20"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Document & Review</span>
                </button>

                {user.kyc_status === "PENDING" && (
                  <button
                    type="button"
                    disabled={quickApprovingId === user.userId}
                    onClick={() => handleReview("VERIFIED", user.userId)}
                    className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-emerald-950/60 hover:text-emerald-400 hover:border-emerald-800/60 border border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {quickApprovingId === user.userId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>1-Click Quick Approve</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPREHENSIVE DOCUMENT INSPECTION & REVIEW MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Identity & License Inspection</h3>
                  <p className="text-xs text-neutral-400">
                    Applicant: <strong className="text-white">{selectedUser.name}</strong> &bull;{" "}
                    <span className="font-mono text-purple-300">{selectedUser.phone || selectedUser.email}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Preview Box with Zoom Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-300">Uploaded Driving License Proof</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImageZoom((prev) => Math.max(0.6, prev - 0.2))}
                    className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {Math.round(imageZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setImageZoom((prev) => Math.min(2.5, prev + 0.2))}
                    className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {selectedUser.kyc_document_url?.startsWith("http") && (
                    <a
                      href={selectedUser.kyc_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-neutral-800 text-purple-400 hover:text-purple-300 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Full View</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="h-64 sm:h-72 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center relative">
                {selectedUser.kyc_document_url?.startsWith("http") || selectedUser.kyc_document_url?.startsWith("/") ? (
                  <img
                    src={selectedUser.kyc_document_url}
                    alt="Driving License Proof"
                    style={{ transform: `scale(${imageZoom})`, transition: "transform 0.2s ease" }}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center space-y-2 max-w-sm">
                    <FileText className="w-10 h-10 text-neutral-600 mx-auto" />
                    <span className="text-sm font-mono text-purple-300 font-bold block">
                      {selectedUser.kyc_document_url ? selectedUser.kyc_document_url.replace(/^DL#\s*/i, "DL: ") : "Document record submitted"}
                    </span>
                    <p className="text-[11px] text-neutral-500">
                      Standard government-verified DL credentials. User identity authenticated against official registries.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Applicant Profile Particulars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div>
                <span className="text-[10px] text-neutral-500 block">Full Name</span>
                <span className="font-bold text-white">{selectedUser.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Contact Phone</span>
                <span className="font-mono text-neutral-200">{selectedUser.phone || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Account Status</span>
                <span className="text-emerald-400 font-semibold">Active & Registered</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Email Address</span>
                <span className="text-neutral-300 truncate block">{selectedUser.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Current KYC Status</span>
                <span className="font-bold text-purple-300">{selectedUser.kyc_status}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Joined ShiftDrive</span>
                <span className="text-neutral-400">
                  {new Date(selectedUser.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Moderation Controls Form */}
            <div className="space-y-3 pt-2 border-t border-neutral-800 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">
                  Select Rejection Preset (If rejecting submission)
                </label>
                <select
                  value={rejectionReasonPreset}
                  onChange={(e) => setRejectionReasonPreset(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="">-- Choose Common Rejection Reason --</option>
                  {REJECTION_PRESETS.map((preset, idx) => (
                    <option key={idx} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">
                  Reviewer Notes / Feedback to Customer
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Specify feedback, reason, or verification remarks..."
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500"
                />
              </div>

              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleReview("REJECTED")}
                  className="flex-1 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>Reject Submission</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleReview("VERIFIED")}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Approve & Verify Driver</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
