"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/api";
import Pagination from "@/components/Pagination";
import {
  LifeBuoy,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ExternalLink,
  MessageSquare,
  User,
  Mail,
  Phone,
  Send,
  Loader2,
  RefreshCw,
  Tag,
  ShieldAlert,
} from "lucide-react";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 12,
  });

  // Action / Inspection Modal State
  const [activeTicket, setActiveTicket] = useState(null);
  const [newStatus, setNewStatus] = useState("OPEN");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/support/admin/tickets", {
        params: {
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          category: categoryFilter !== "ALL" ? categoryFilter : undefined,
          priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
          search: search.trim() || undefined,
          page,
          limit,
        },
      });

      if (res.data?.data) {
        setTickets(res.data.data);
      }
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.warn("Could not load admin support tickets:", err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, search, page, limit]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenTicketModal = (ticket) => {
    setActiveTicket(ticket);
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority);
    setAdminNotes(ticket.admin_notes || "");
    setSaveSuccess("");
    setSaveError("");
  };

  const handleSaveTicketUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!activeTicket) return;

    setSavingNotes(true);
    setSaveSuccess("");
    setSaveError("");

    try {
      const res = await api.put(`/support/admin/tickets/${activeTicket.ticketId}`, {
        status: newStatus,
        priority: newPriority,
        admin_notes: adminNotes.trim(),
      });

      if (res.data?.success) {
        setSaveSuccess("Ticket updated and notification email sent to customer!");
        await fetchTickets();
        setTimeout(() => {
          setActiveTicket(null);
          setSaveSuccess("");
        }, 1500);
      }
    } catch (err) {
      console.error("Update ticket error:", err);
      setSaveError(err.response?.data?.message || "Failed to update ticket.");
    } finally {
      setSavingNotes(false);
    }
  };

  // Metrics
  const totalCount = pagination.totalItems;
  const aiResolvedCount = tickets.filter((t) => t.status === "AI_RESOLVED").length;
  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const escalatedCount = tickets.filter((t) => t.status === "ESCALATED").length;

  const renderStatusBadge = (status) => {
    switch (status) {
      case "AI_RESOLVED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI Resolved
          </span>
        );
      case "OPEN":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Under Review
          </span>
        );
      case "ESCALATED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Escalated
          </span>
        );
      case "CLOSED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Superadmin Operations</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            AI Support Helpdesk &amp; Ticket Governance
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Audit AI-generated resolutions, escalate on-road incidents, and manage customer inquiries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTickets()}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Desk</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Total Tickets
          </span>
          <span className="text-xl font-extrabold text-white font-mono block">
            {totalCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI Resolved
          </span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono block">
            {aiResolvedCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
          <span className="text-xl font-extrabold text-amber-400 font-mono block">
            {openCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Escalated to Station
          </span>
          <span className="text-xl font-extrabold text-purple-400 font-mono block">
            {escalatedCount}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search subject or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-white outline-none placeholder-neutral-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-300 outline-none text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="AI_RESOLVED">AI Resolved</option>
            <option value="OPEN">Under Review</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-300 outline-none text-xs"
          >
            <option value="ALL">All Categories</option>
            <option value="BILLING_REFUND">Billing &amp; Refund</option>
            <option value="VEHICLE_ISSUE">Vehicle Issue</option>
            <option value="BOOKING_CHANGE">Booking Change</option>
            <option value="KYC_VERIFICATION">KYC &amp; DL</option>
            <option value="GENERAL">General</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-300 outline-none text-xs"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-neutral-950/60 border border-neutral-800/60 animate-pulse"
              ></div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-2 text-neutral-500 text-xs">
            <LifeBuoy className="w-8 h-8 mx-auto text-neutral-600" />
            <p className="font-semibold text-neutral-400">No support tickets match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-[10px] uppercase tracking-wider text-neutral-400 border-b border-neutral-800 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">AI Engine</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {tickets.map((t) => (
                  <tr
                    key={t.ticketId}
                    className="hover:bg-neutral-950/50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">
                          {t.subject}
                        </span>
                        <span className="font-mono text-[10px] text-neutral-500">
                          #{t.ticketId.slice(0, 8)} • {new Date(t.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-neutral-200 block">
                          {t.Customer?.name || "Customer"}
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          {t.Customer?.email || "N/A"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-semibold text-neutral-300">
                        {t.category.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase ${
                          t.priority === "URGENT"
                            ? "text-red-400"
                            : t.priority === "HIGH"
                            ? "text-amber-400"
                            : "text-neutral-400"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">{renderStatusBadge(t.status)}</td>

                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono text-neutral-400">
                        {t.ai_provider_used || "ShiftDrive Core"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenTicketModal(t)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Review &amp; Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.totalItems > 0 && (
          <div className="p-4 border-t border-neutral-800">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* TICKET REVIEW & UPDATE MODAL */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Review Ticket #{activeTicket.ticketId.slice(0, 8)}</span>
                  {renderStatusBadge(activeTicket.status)}
                </h3>
                <span className="text-xs text-neutral-400 block mt-0.5">
                  Subject: <strong className="text-white">{activeTicket.subject}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Customer Contact Card */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Customer</span>
                <span className="font-semibold text-white">{activeTicket.Customer?.name || "Guest"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Email</span>
                <span className="text-neutral-300">{activeTicket.Customer?.email || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Phone</span>
                <span className="text-neutral-300 font-mono">{activeTicket.Customer?.phone || "N/A"}</span>
              </div>
            </div>

            {/* Issue Description */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                Customer's Issue Description:
              </span>
              <p className="text-neutral-200 leading-relaxed whitespace-pre-line">
                {activeTicket.description}
              </p>
            </div>

            {/* AI Generated Resolution */}
            {activeTicket.ai_response && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ShiftDrive AI Formulated Resolution:</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Provider: {activeTicket.ai_provider_used || "ShiftDrive Core"}
                  </span>
                </div>
                <p className="text-neutral-200 leading-relaxed whitespace-pre-line">
                  {activeTicket.ai_response}
                </p>
              </div>
            )}

            {/* Form for Status Update & Admin Notes */}
            <form onSubmit={handleSaveTicketUpdate} className="space-y-4 text-xs pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Update Ticket Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="AI_RESOLVED">AI Resolved</option>
                    <option value="OPEN">Under Review</option>
                    <option value="ESCALATED">Escalated to Station</option>
                    <option value="CLOSED">Closed &amp; Complete</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Staff Resolution Notes (Sent to Customer upon save)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Mention actions taken (e.g. station hub notified, wallet refunded, booking modified)..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold hover:bg-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingNotes}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {savingNotes ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save &amp; Notify Customer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
