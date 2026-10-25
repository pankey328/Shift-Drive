"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Pagination from "@/components/Pagination";
import CreateTicketModal from "@/components/CreateTicketModal";
import {
  LifeBuoy,
  Plus,
  Sparkles,
  PhoneCall,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  FileText,
  Loader2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

function SupportPageContent() {
  const { user, isAuthenticated } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/support/my-tickets", {
        params: {
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          category: categoryFilter !== "ALL" ? categoryFilter : undefined,
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
      console.warn("Could not load support tickets:", err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, page, limit]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
  }, [isAuthenticated, fetchTickets]);

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
            <AlertTriangle className="w-3 h-3" /> Station Escalated
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

  // RESTRICTION FOR STAFF ACCOUNTS
  if (user?.role && user.role !== "CUSTOMER") {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-neutral-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-emerald-500/30 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <LifeBuoy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Staff Account Notice
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Customer Support Only
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
              As a {user.role === "SUPERADMIN" ? "Superadmin" : "Station Manager"}, customer inquiries and AI resolutions are managed through central platform operations.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-left space-y-2 text-xs">
            <p className="text-neutral-300 font-semibold">
              Looking for support ticket management?
            </p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {user.role === "SUPERADMIN"
                ? "View, audit, escalate, and resolve all customer support queries from the Superadmin Support Desk."
                : "Manage vehicle incidents, lost & found, and roadside issues directly on your Station Operations Desk."}
            </p>
          </div>

          <div>
            <Link
              href={user.role === "SUPERADMIN" ? "/admin/support" : "/manager"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg shadow-white/10"
            >
              <span>{user.role === "SUPERADMIN" ? "Go to Superadmin Support Desk" : "Return to Station Manager Desk"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white font-sans pb-24">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-[140px] pointer-events-none"></div>

      {/* Top Banner */}
      <div className="border-b border-neutral-900 bg-neutral-950/60 backdrop-blur-xl pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>24/7 AI-Powered Support Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Customer Support &amp; Helpdesk
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 font-light mt-0.5">
                Submit queries, receive instant AI-verified resolutions, or escalate directly to our station hub managers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Support Ticket</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <PhoneCall className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Emergency Hotline</h2>
            <p className="text-xs text-neutral-400">
              Direct dispatch assistance for road incidents and key handovers.
            </p>
            <a
              href="tel:18007443837"
              className="text-xs font-mono font-bold text-emerald-400 hover:underline block pt-1"
            >
              1800-SHIFT-DRIVE (Toll Free)
            </a>
          </div>

          <div className="p-5 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Email Helpdesk</h2>
            <p className="text-xs text-neutral-400">
              For billing reconciliations, invoice queries, and feedback.
            </p>
            <a
              href="mailto:support@shiftdrive.com"
              className="text-xs font-mono font-bold text-blue-400 hover:underline block pt-1"
            >
              support@shiftdrive.com
            </a>
          </div>

          <div className="p-5 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Operating Window</h2>
            <p className="text-xs text-neutral-400">
              Station hubs and live vehicle handovers across all locations.
            </p>
            <span className="text-xs font-mono font-bold text-purple-400 block pt-1">
              06:00 AM – 11:00 PM (IST)
            </span>
          </div>
        </div>

        {/* Tickets Section */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>My Support Tickets &amp; Resolutions</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Track status, review instant AI resolutions, or access manager notes.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              {["ALL", "AI_RESOLVED", "OPEN", "ESCALATED", "CLOSED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-white text-black shadow-md"
                      : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  {st === "ALL"
                    ? "All"
                    : st === "AI_RESOLVED"
                    ? "AI Resolved"
                    : st === "OPEN"
                    ? "Under Review"
                    : st === "ESCALATED"
                    ? "Escalated"
                    : "Closed"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-neutral-950/60 border border-neutral-800/60 animate-pulse"
                ></div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <MessageSquare className="w-10 h-10 text-neutral-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Support Tickets Found</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                You do not have any open tickets in this filter. If you have an inquiry, our AI assistant is ready to help!
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors cursor-pointer"
              >
                Submit Your First Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const isExpanded = expandedTicketId === t.ticketId;
                return (
                  <div
                    key={t.ticketId}
                    className="rounded-2xl bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-colors overflow-hidden"
                  >
                    {/* Ticket Summary Row */}
                    <div
                      onClick={() => setExpandedTicketId(isExpanded ? null : t.ticketId)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 text-neutral-400">
                          <LifeBuoy className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs">
                              {t.subject}
                            </span>
                            <span className="font-mono text-[10px] text-neutral-500">
                              #{t.ticketId.slice(0, 8)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                            <span className="uppercase tracking-wider font-semibold text-neutral-500">
                              {t.category.replace(/_/g, " ")}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(t.createdAt).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {renderStatusBadge(t.status)}
                        <ChevronDown
                          className={`w-4 h-4 text-neutral-500 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expandable Details & AI Resolution */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-neutral-900 space-y-4 text-xs">
                        {/* Customer Problem */}
                        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Your Query Description:
                          </span>
                          <p className="text-neutral-200 leading-relaxed whitespace-pre-line">
                            {t.description}
                          </p>
                        </div>

                        {/* AI Resolution */}
                        {t.ai_response && (
                          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                            <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>ShiftDrive AI Instant Resolution:</span>
                              </span>
                              <span className="text-[9px] text-neutral-500 font-mono">
                                Verified Engine: {t.ai_provider_used || "ShiftDrive Core"}
                              </span>
                            </div>
                            <div className="text-neutral-200 leading-relaxed whitespace-pre-line">
                              {t.ai_response}
                            </div>
                          </div>
                        )}

                        {/* Admin / Staff Notes if any */}
                        {t.admin_notes && (
                          <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                              Support Desk / Staff Resolution Notes:
                            </span>
                            <p className="text-neutral-200 leading-relaxed whitespace-pre-line">
                              {t.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && pagination.totalItems > 0 && (
            <div className="pt-2">
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
      </main>

      {/* Ticket Modal */}
      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTicketCreated={() => {
          fetchTickets();
        }}
      />
    </div>
  );
}

export default function SupportPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400 text-xs">
            Loading Support Hub...
          </div>
        }
      >
        <SupportPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
