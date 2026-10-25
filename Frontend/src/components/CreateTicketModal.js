"use client";

import React, { useState } from "react";
import api from "@/api";
import {
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Mail,
  ShieldCheck,
  FileText,
  LifeBuoy,
} from "lucide-react";

export default function CreateTicketModal({
  isOpen,
  onClose,
  initialSubject = "",
  initialCategory = "GENERAL",
  onTicketCreated = null,
}) {
  const [category, setCategory] = useState(initialCategory);
  const [subject, setSubject] = useState(initialSubject);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [bookingId, setBookingId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdTicket, setCreatedTicket] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError("Please provide a subject and detailed description.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/support/tickets", {
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        booking_id: bookingId.trim() || undefined,
      });

      if (res.data?.success && res.data?.data) {
        setCreatedTicket(res.data.data);
        if (onTicketCreated) onTicketCreated(res.data.data);
      }
    } catch (err) {
      console.error("Support ticket error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to submit support ticket. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubject("");
    setDescription("");
    setCategory("GENERAL");
    setError("");
    setCreatedTicket(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Create Support Ticket</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                  AI Instant Resolution
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                ShiftDrive AI will analyze your issue and provide an instant verified resolution.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success View with AI Resolution */}
        {createdTicket ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block text-sm">
                  Ticket #{createdTicket.ticketId.slice(0, 8)} Created Successfully
                </strong>
                <p className="text-emerald-300/90 text-[11px] mt-0.5">
                  A copy of this AI resolution and ticket confirmation has been dispatched to your registered email address.
                </p>
              </div>
            </div>

            {/* AI Resolution Box */}
            <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-neutral-800/80 pb-2.5">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ShiftDrive AI Verified Resolution</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Engine: {createdTicket.ai_provider_used || "ShiftDrive Core"}
                </span>
              </div>
              <div className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line font-sans">
                {createdTicket.ai_response}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Issue Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                  required
                >
                  <option value="GENERAL">General Inquiry</option>
                  <option value="BILLING_REFUND">Billing, Deposit &amp; Wallet Refund</option>
                  <option value="VEHICLE_ISSUE">Vehicle Condition &amp; On-Road Support</option>
                  <option value="BOOKING_CHANGE">Booking Schedule &amp; Modifications</option>
                  <option value="KYC_VERIFICATION">KYC &amp; Driving License Verification</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="LOW">Low (General Query)</option>
                  <option value="MEDIUM">Medium (Standard)</option>
                  <option value="HIGH">High (Active Trip)</option>
                  <option value="URGENT">Urgent (Immediate Support)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your inquiry (e.g. Wallet refund status)..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Booking Reference (Optional)
              </label>
              <input
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="Paste UUID / Booking Ref if related to a specific trip..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Detailed Description <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the issue or question in detail. Mention stations, dates, or payment details if applicable..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl p-3 text-white outline-none resize-none"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !subject.trim() || !description.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing &amp; Formulating Resolution...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Instant AI Resolution</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
