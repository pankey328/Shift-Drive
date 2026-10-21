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
} from "lucide-react";

export default function AdminKycPage() {
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const fetchPendingKyc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users/kyc/pending");
      if (res.data?.success) {
        setPendingUsers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load pending KYC:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingKyc();
  }, [fetchPendingKyc]);

  const handleReview = async (status) => {
    if (!selectedUser) return;
    setSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await api.patch(`/admin/users/${selectedUser.userId}/kyc`, {
        status,
        rejectionReason: reviewNotes || (status === "VERIFIED" ? "Approved by Superadmin" : "Rejected by Superadmin"),
      });

      if (res.data?.success) {
        setActionSuccess(`User KYC successfully updated to ${status}.`);
        setTimeout(() => {
          setSelectedUser(null);
          setReviewNotes("");
          setActionSuccess("");
          fetchPendingKyc();
        }, 1200);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to process KYC review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Identity Governance</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Customer KYC Verification Desk
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Inspect uploaded driving licenses, verify applicant identity credentials, and approve or reject submissions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPendingKyc}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Loading pending KYC queue...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">KYC Verification Queue is Clear</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            All submitted customer driving licenses and identities have been processed. New submissions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingUsers.map((u) => (
            <div
              key={u.userId}
              className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    PENDING REVIEW
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    ID: {u.userId.slice(0, 8)}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{u.name}</h4>
                  <span className="text-xs text-neutral-400 font-mono block">{u.phone}</span>
                  <span className="text-xs text-neutral-500 block truncate">{u.email}</span>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 block">Submitted Document</span>
                  <span className="text-xs font-mono text-purple-300 font-semibold block truncate">
                    {u.kyc_document_url || "Document photo submitted"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedUser(u);
                  setReviewNotes("");
                  setActionError("");
                  setActionSuccess("");
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-purple-600/20"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Document & Review</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KYC REVIEW MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Review Customer Identity</h3>
                  <p className="text-xs text-neutral-400">
                    {selectedUser.name} &bull; <span className="font-mono">{selectedUser.phone}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Preview */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-300 block">
                Driving License / Identification Document
              </span>
              <div className="h-56 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center relative group">
                {selectedUser.kyc_document_url?.startsWith("http") ? (
                  <img
                    src={selectedUser.kyc_document_url}
                    alt="Driving License"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-4 text-center space-y-2">
                    <FileText className="w-8 h-8 text-neutral-600 mx-auto" />
                    <span className="text-xs font-mono text-purple-300 block">
                      {selectedUser.kyc_document_url || "Document record attached"}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      Uploaded during user profile onboarding
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Review Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">
                Decision Notes / Reason (Optional for approval, recommended for rejection)
              </label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. License verified, valid till 2030"
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs"
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

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleReview("REJECTED")}
                className="flex-1 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject KYC</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleReview("VERIFIED")}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Approve & Verify</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
