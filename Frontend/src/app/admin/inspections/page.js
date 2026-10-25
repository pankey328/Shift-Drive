"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/api";
import Link from "next/link";
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Car,
  Calendar,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  ZoomIn,
  Camera,
  Layers,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  FileText,
} from "lucide-react";
import Pagination from "@/components/Pagination";

export default function SuperadminInspectionsPage() {
  const [inspections, setInspections] = useState([]);
  const [summary, setSummary] = useState({
    total_inspections: 0,
    damages_flagged: 0,
    total_penalties_fined: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, PRE_TRIP, POST_TRIP
  const [damageFilter, setDamageFilter] = useState("ALL"); // ALL, DAMAGED, CLEAN
  const [severityFilter, setSeverityFilter] = useState("ALL"); // ALL, MINOR, MAJOR, CRITICAL

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  // Debounce search (800ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Comparison Audit Drawer
  const [selectedBookingAudit, setSelectedBookingAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [activePhotoPreview, setActivePhotoPreview] = useState(null);

  // Fetch Inspections with backend filters & pagination
  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        damageOnly: damageFilter === "DAMAGED" ? true : undefined,
        severity: severityFilter !== "ALL" ? severityFilter : undefined,
      };

      const res = await api.get("/inspections/admin/all", { params });
      if (res.data?.success) {
        setInspections(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        } else {
          setPagination({
            totalItems: res.data.data?.length || 0,
            totalPages: 1,
            currentPage: 1,
            limit,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load inspections:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, typeFilter, damageFilter, severityFilter]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Open Comparison Drawer
  const handleOpenAudit = async (bookingId, fallbackInspection) => {
    setSelectedBookingAudit(fallbackInspection);
    setAuditLoading(true);
    setComparisonData(null);

    try {
      const res = await api.get(`/inspections/audit/comparison/${bookingId}`);
      if (res.data?.success) {
        setComparisonData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load inspection comparison:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Inspections list (filtered by backend)
  const filteredInspections = inspections;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Enterprise Fleet Operations
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span className="text-xs font-medium text-neutral-400">Phase 6</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5 mt-0.5">
            <ClipboardCheck className="w-7 h-7 text-purple-400" />
            Inspection Photo Audits & Quality Control Desk
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Audit Pre-Trip departure and Post-Trip return vehicle photo logs. Verify damage claims, inspect high-res photos, and prevent dispute discrepancies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchInspections}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-purple-400" /> Total Inspections
          </span>
          <p className="text-2xl font-black text-white">
            {summary.total_inspections || inspections.length}
          </p>
          <span className="text-[10px] text-neutral-500 block">Pre & Post trip audits on record</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs text-red-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Flagged Damages
          </span>
          <p className="text-2xl font-black text-red-400">
            {summary.damages_flagged || inspections.filter((i) => i.damage_flagged).length}
          </p>
          <span className="text-[10px] text-neutral-500 block">Requiring repair or damage penalty</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Clean Inspection Rate
          </span>
          <p className="text-2xl font-black text-emerald-400">
            {inspections.length > 0
              ? `${Math.round(
                  ((inspections.length - (summary.damages_flagged || 0)) /
                    inspections.length) *
                    100
                )}%`
              : "100%"}
          </p>
          <span className="text-[10px] text-neutral-500 block">Vehicles returned without defects</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Total Penalties Fined
          </span>
          <p className="text-2xl font-black text-amber-400">
            ₹{Number(summary.total_penalties_fined || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-neutral-500 block">Assessed across flagged returns</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by plate number, booking ID, customer name, inspector or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-medium cursor-pointer"
            >
              <option value="ALL">All Inspection Types</option>
              <option value="PRE_TRIP">Pre-Trip (Departure)</option>
              <option value="POST_TRIP">Post-Trip (Return)</option>
            </select>

            {/* Condition selector */}
            <select
              value={damageFilter}
              onChange={(e) => setDamageFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-medium cursor-pointer"
            >
              <option value="ALL">All Conditions</option>
              <option value="DAMAGED">Flagged Damaged Only</option>
              <option value="CLEAN">Clean Inspections</option>
            </select>

            {/* Severity selector */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-medium cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="MINOR">Minor (Scratches/Scuffs)</option>
              <option value="MAJOR">Major (Dents/Deep Paint)</option>
              <option value="CRITICAL">Critical (Collision/Glass)</option>
            </select>

            {(searchQuery ||
              typeFilter !== "ALL" ||
              damageFilter !== "ALL" ||
              severityFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("ALL");
                  setDamageFilter("ALL");
                  setSeverityFilter("ALL");
                }}
                className="px-2.5 py-2 text-xs text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Inspection Ledger Table */}
      {loading ? (
        <div className="py-20 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 font-medium">
            Loading inspection photo records and quality control logs...
          </p>
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="py-20 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <ClipboardCheck className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Inspections Found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            No inspection logs matching the selected filters were located. Adjust your search parameters to view other inspection records.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 uppercase tracking-wider text-[10px] font-bold border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3.5">Vehicle & Specs</th>
                <th className="px-4 py-3.5">Audit Stage</th>
                <th className="px-4 py-3.5">Inspection Photos</th>
                <th className="px-4 py-3.5">Damage & Severity</th>
                <th className="px-4 py-3.5">Inspector / Hub Staff</th>
                <th className="px-4 py-3.5">Customer & Trip Ref</th>
                <th className="px-5 py-3.5 text-right">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredInspections.map((insp) => {
                const photos = Array.isArray(insp.photo_urls) ? insp.photo_urls : [];
                const vehicle = insp.booking?.vehicle;
                const customer = insp.booking?.customer;

                return (
                  <tr key={insp.inspectionId} className="hover:bg-neutral-800/30 transition-colors">
                    {/* Vehicle */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {vehicle?.gallery_urls?.[0] ? (
                            <img
                              src={vehicle.gallery_urls[0]}
                              alt={vehicle.model}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Car className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-white block">
                            {vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle Trip"}
                          </span>
                          <span className="font-mono text-[10px] text-purple-300 font-semibold uppercase">
                            {vehicle?.plate_number || "NO-PLATE"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Audit Stage */}
                    <td className="px-4 py-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 uppercase tracking-wider ${
                          insp.type === "PRE_TRIP"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : "bg-purple-500/10 border-purple-500/30 text-purple-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            insp.type === "PRE_TRIP" ? "bg-blue-400" : "bg-purple-400"
                          }`}
                        />
                        <span>{insp.type === "PRE_TRIP" ? "Departure Pre-Trip" : "Return Post-Trip"}</span>
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-1">
                        {new Date(insp.createdAt).toLocaleDateString()} &bull;{" "}
                        {new Date(insp.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    {/* Photos Preview */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {photos.slice(0, 3).map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoPreview(url)}
                            className="relative w-10 h-10 rounded-lg overflow-hidden border border-neutral-800 hover:border-purple-400 transition-colors group cursor-pointer"
                          >
                            <img
                              src={url}
                              alt={`Inspection ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </button>
                        ))}
                        {photos.length > 3 && (
                          <button
                            type="button"
                            onClick={() => handleOpenAudit(insp.booking?.bookingId, insp)}
                            className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400 hover:text-white cursor-pointer"
                          >
                            +{photos.length - 3}
                          </button>
                        )}
                        {photos.length === 0 && (
                          <span className="text-[11px] text-neutral-500 italic">No photos</span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        {photos.length} photo(s) on file
                      </span>
                    </td>

                    {/* Damage Flag & Severity */}
                    <td className="px-4 py-4">
                      {insp.damage_flagged ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/60 border border-red-800 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            {insp.damage_severity || "DAMAGE FLAGGED"}
                          </span>
                          {insp.penalty_fined > 0 && (
                            <span className="text-[11px] font-bold text-amber-400 block">
                              Fine: ₹{insp.penalty_fined.toLocaleString("en-IN")}
                            </span>
                          )}
                          {insp.notes && (
                            <p className="text-[11px] text-neutral-300 line-clamp-1 max-w-[180px]">
                              {insp.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/60 text-[10px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Clean / Passed
                          </span>
                          {insp.notes && (
                            <p className="text-[10px] text-neutral-500 line-clamp-1 max-w-[180px]">
                              {insp.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Inspector Staff */}
                    <td className="px-4 py-4">
                      <span className="font-semibold text-white block">
                        {insp.inspector?.name || "Station Hub Manager"}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono block">
                        {insp.inspector?.phone || insp.inspector?.email || "Staff ID"}
                      </span>
                    </td>

                    {/* Customer & Trip */}
                    <td className="px-4 py-4">
                      {insp.booking ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-white block">
                            {customer?.name || "Customer"}
                          </span>
                          <Link
                            href={`/admin/bookings?bookingId=${insp.booking.bookingId}`}
                            className="text-[10px] text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1"
                          >
                            <span>#{insp.booking.bookingId.slice(0, 8)}...</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-[11px]">Unlinked Trip</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenAudit(insp.booking?.bookingId, insp)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        <span>Compare Audit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Toolbar */}
          <div className="border-t border-neutral-800 px-4 bg-neutral-900/40">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              limit={pagination.limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: SIDE-BY-SIDE PRE-TRIP VS POST-TRIP AUDIT                         */}
      {/* ========================================================================= */}
      {selectedBookingAudit && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-end">
          <div className="w-full max-w-4xl h-full bg-neutral-900 border-l border-neutral-800 p-6 overflow-y-auto space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Quality Control & Damage Audit</h3>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Side-by-side departure vs return inspection comparison for Booking #
                  {selectedBookingAudit.booking?.bookingId || "Trip"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBookingAudit(null);
                  setComparisonData(null);
                }}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditLoading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs text-neutral-400">Loading side-by-side inspection records...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Discrepancy Callout Banner */}
                {comparisonData?.hasDamageDiscrepancy && (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-400">
                        Damage Discrepancy Detected on Vehicle Return
                      </h4>
                      <p className="text-xs text-neutral-300 mt-0.5">
                        Vehicle departed clean at departure but was flagged with{" "}
                        <strong className="text-red-300">
                          {comparisonData.postTrip?.damage_severity}
                        </strong>{" "}
                        damage upon return. Fine of ₹
                        {comparisonData.postTrip?.damage_severity === "CRITICAL"
                          ? "15,000"
                          : comparisonData.postTrip?.damage_severity === "MAJOR"
                          ? "5,000"
                          : "1,000"}{" "}
                        assessed to customer wallet.
                      </p>
                    </div>
                  </div>
                )}

                {/* Vehicle & Customer Trip Summary Strip */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">
                      Vehicle Under Audit
                    </span>
                    <span className="font-bold text-white block mt-0.5">
                      {selectedBookingAudit.booking?.vehicle?.make}{" "}
                      {selectedBookingAudit.booking?.vehicle?.model}
                    </span>
                    <span className="font-mono text-purple-400 text-[11px]">
                      {selectedBookingAudit.booking?.vehicle?.plate_number}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">
                      Renter / Customer
                    </span>
                    <span className="font-bold text-white block mt-0.5">
                      {selectedBookingAudit.booking?.customer?.name || "Customer"}
                    </span>
                    <span className="text-[11px] text-neutral-400 block font-mono">
                      {selectedBookingAudit.booking?.customer?.phone || selectedBookingAudit.booking?.customer?.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">
                      Master Trip Reference
                    </span>
                    <Link
                      href={`/admin/bookings?bookingId=${selectedBookingAudit.booking?.bookingId}`}
                      className="text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>View in Bookings Ledger</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Side-by-Side Comparison Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Pre-Trip */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-blue-900/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <h4 className="font-bold text-white text-xs">Pre-Trip Departure Inspection</h4>
                      </div>
                      <span className="text-[10px] text-blue-400 font-semibold uppercase">
                        {comparisonData?.preTrip ? "Logged" : "Pending"}
                      </span>
                    </div>

                    {comparisonData?.preTrip ? (
                      <div className="space-y-3">
                        <div className="text-[11px] text-neutral-400 space-y-0.5">
                          <p>
                            Inspector: <strong className="text-white">{comparisonData.preTrip.Inspector?.name || "Staff"}</strong>
                          </p>
                          <p>
                            Time: {new Date(comparisonData.preTrip.createdAt).toLocaleString()}
                          </p>
                          <p>
                            Status:{" "}
                            <span className="text-emerald-400 font-semibold">
                              {comparisonData.preTrip.damage_flagged ? "Flagged" : "Clean Dispatch"}
                            </span>
                          </p>
                        </div>

                        {/* Photos */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                            Departure Photos ({comparisonData.preTrip.photo_urls?.length || 0})
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {comparisonData.preTrip.photo_urls?.map((url, i) => (
                              <div
                                key={i}
                                onClick={() => setActivePhotoPreview(url)}
                                className="relative rounded-xl overflow-hidden border border-neutral-800 aspect-video group cursor-pointer"
                              >
                                <img
                                  src={url}
                                  alt={`Pre-trip ${i + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {comparisonData.preTrip.notes && (
                          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
                            <strong>Departure Notes:</strong> {comparisonData.preTrip.notes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-neutral-500">
                        No departure pre-trip inspection found on file for this booking.
                      </div>
                    )}
                  </div>

                  {/* Right Column: Post-Trip */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-purple-900/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <h4 className="font-bold text-white text-xs">Post-Trip Return Inspection</h4>
                      </div>
                      <span className="text-[10px] text-purple-400 font-semibold uppercase">
                        {comparisonData?.postTrip ? "Logged" : "Not Returned Yet"}
                      </span>
                    </div>

                    {comparisonData?.postTrip ? (
                      <div className="space-y-3">
                        <div className="text-[11px] text-neutral-400 space-y-0.5">
                          <p>
                            Inspector: <strong className="text-white">{comparisonData.postTrip.Inspector?.name || "Staff"}</strong>
                          </p>
                          <p>
                            Time: {new Date(comparisonData.postTrip.createdAt).toLocaleString()}
                          </p>
                          <p>
                            Status:{" "}
                            {comparisonData.postTrip.damage_flagged ? (
                              <span className="text-red-400 font-bold">
                                Damaged ({comparisonData.postTrip.damage_severity})
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold">Clean Return</span>
                            )}
                          </p>
                        </div>

                        {/* Photos */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                            Return Photos ({comparisonData.postTrip.photo_urls?.length || 0})
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {comparisonData.postTrip.photo_urls?.map((url, i) => (
                              <div
                                key={i}
                                onClick={() => setActivePhotoPreview(url)}
                                className="relative rounded-xl overflow-hidden border border-neutral-800 aspect-video group cursor-pointer"
                              >
                                <img
                                  src={url}
                                  alt={`Post-trip ${i + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {comparisonData.postTrip.notes && (
                          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
                            <strong>Return Notes:</strong> {comparisonData.postTrip.notes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-neutral-500">
                        Vehicle has not completed its return post-trip inspection yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIGHTBOX MODAL: FULL RESOLUTION PHOTO PREVIEW                             */}
      {/* ========================================================================= */}
      {activePhotoPreview && (
        <div
          onClick={() => setActivePhotoPreview(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-950">
            <img
              src={activePhotoPreview}
              alt="High Resolution Inspection Preview"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setActivePhotoPreview(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/80 text-white hover:text-red-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
