"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/api";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import {
  ArrowRightLeft,
  Building2,
  Car,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PlusCircle,
  X,
  Phone,
  User,
  ArrowRight,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Truck,
  Check,
  Ban,
  Navigation,
} from "lucide-react";

export default function SuperadminTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PENDING, IN_TRANSIT, COMPLETED, CANCELLED
  const [sourceHubFilter, setSourceHubFilter] = useState("ALL");
  const [destinationHubFilter, setDestinationHubFilter] = useState("ALL");

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
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // New Transfer Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    source_hub_id: "",
    destination_hub_id: "",
    vehicle_id: "",
    driver_name: "",
    driver_phone: "",
    reason: "Inventory rebalancing",
    immediate_transit: false,
  });
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // Action status loading
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch all transfers and station hubs
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        sourceHubId: sourceHubFilter !== "ALL" ? sourceHubFilter : undefined,
        destinationHubId: destinationHubFilter !== "ALL" ? destinationHubFilter : undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        limit,
      };

      const [transfersRes, hubsRes] = await Promise.all([
        api.get("/hub-admin/transfers", { params }),
        api.get("/hubs"),
      ]);

      if (transfersRes.data?.success) {
        setTransfers(transfersRes.data.data || []);
        if (transfersRes.data.pagination) {
          setPagination(transfersRes.data.pagination);
        }
      }
      if (hubsRes.data?.success) {
        setHubs(hubsRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load transfer ledger:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceHubFilter, destinationHubFilter, debouncedSearch, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load vehicles when source hub is selected in modal
  const handleSourceHubChange = async (hubId) => {
    setCreateForm((prev) => ({
      ...prev,
      source_hub_id: hubId,
      vehicle_id: "",
    }));
    if (!hubId) {
      setAvailableVehicles([]);
      return;
    }

    setLoadingVehicles(true);
    try {
      const res = await api.get(`/vehicles/hub/${hubId}`);
      if (res.data?.success) {
        const vehicles = res.data.data || [];
        setAvailableVehicles(vehicles.filter((v) => v.status === "ACTIVE"));
      }
    } catch (err) {
      console.error("Failed to fetch available vehicles:", err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Submit New Transfer
  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (createForm.source_hub_id === createForm.destination_hub_id) {
      setCreateError("Destination hub must be different from source hub.");
      return;
    }

    setSubmitting(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const res = await api.post("/hub-admin/transfers", createForm);
      if (res.data?.success) {
        setCreateSuccess("Inter-Hub fleet relocation dispatched successfully!");
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateSuccess("");
          setCreateForm({
            source_hub_id: "",
            destination_hub_id: "",
            vehicle_id: "",
            driver_name: "",
            driver_phone: "",
            reason: "Inventory rebalancing",
            immediate_transit: false,
          });
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to initiate transfer.");
    } finally {
      setSubmitting(false);
    }
  };

  // Dispatch / Start Transit
  const handleStartTransit = async (transferId) => {
    setActionLoadingId(transferId);
    try {
      const res = await api.patch(`/hub-admin/transfers/${transferId}/start`, {});
      if (res.data?.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start transit.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complete Transfer
  const handleCompleteTransfer = async (transferId) => {
    if (!confirm("Confirm vehicle arrival and complete this inter-hub relocation?")) return;
    setActionLoadingId(transferId);
    try {
      const res = await api.patch(`/hub-admin/transfers/${transferId}/complete`, {});
      if (res.data?.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to complete transfer.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel Transfer
  const handleCancelTransfer = async (transferId) => {
    if (!confirm("Are you sure you want to cancel this transfer? The vehicle will be restored to ACTIVE on its origin station lot.")) return;
    setActionLoadingId(transferId);
    try {
      const res = await api.patch(`/hub-admin/transfers/${transferId}/cancel`, {});
      if (res.data?.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel transfer.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const inTransit = transfers.filter((t) => t.status === "IN_TRANSIT").length;
    const pending = transfers.filter((t) => t.status === "PENDING").length;
    const completed = transfers.filter((t) => t.status === "COMPLETED").length;
    const cancelled = transfers.filter((t) => t.status === "CANCELLED").length;
    return { inTransit, pending, completed, cancelled, total: transfers.length };
  }, [transfers]);

  // Filtered List (backed by server search, filtering, and pagination)
  const filteredTransfers = transfers;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Fleet Logistics & Telemetry
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span className="text-xs font-medium text-neutral-400">Phase 9</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5 mt-0.5">
            <ArrowRightLeft className="w-7 h-7 text-purple-400" />
            Inter-Hub Logistics & Deadheading Transfer Ledger
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Dispatch, track, and reconcile vehicle relocations across stations nationwide. Prevent parking lot congestion and balance fleet supply.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setCreateError("");
              setCreateSuccess("");
            }}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Initiate Transfer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-400" /> In-Transit Vehicles
          </span>
          <p className="text-2xl font-black text-blue-400">{stats.inTransit}</p>
          <span className="text-[10px] text-neutral-500 block">Vehicles en-route between hubs</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Dispatch
          </span>
          <p className="text-2xl font-black text-amber-400">{stats.pending}</p>
          <span className="text-[10px] text-neutral-500 block">Awaiting driver assignment & transit</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed Relocations
          </span>
          <p className="text-2xl font-black text-emerald-400">{stats.completed}</p>
          <span className="text-[10px] text-neutral-500 block">Successfully delivered & checked-in</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs text-purple-400 font-medium flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" /> Total Platform Moves
          </span>
          <p className="text-2xl font-black text-white">{stats.total}</p>
          <span className="text-[10px] text-neutral-500 block">Historical transfer movements</span>
        </div>
      </div>

      {/* Multi-Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by license plate, car make/model, driver name, station hub or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_TRANSIT">In-Transit Only</option>
              <option value="PENDING">Pending Dispatch</option>
              <option value="COMPLETED">Completed Transfers</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Source Hub */}
            <select
              value={sourceHubFilter}
              onChange={(e) => {
                setSourceHubFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-medium cursor-pointer"
            >
              <option value="ALL">All Origin Hubs</option>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  Origin: {h.name}
                </option>
              ))}
            </select>

            {/* Destination Hub */}
            <select
              value={destinationHubFilter}
              onChange={(e) => {
                setDestinationHubFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-medium cursor-pointer"
            >
              <option value="ALL">All Destination Hubs</option>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  Dest: {h.name}
                </option>
              ))}
            </select>

            {(searchQuery ||
              statusFilter !== "ALL" ||
              sourceHubFilter !== "ALL" ||
              destinationHubFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setSourceHubFilter("ALL");
                    setDestinationHubFilter("ALL");
                    setPage(1);
                  }}
                  className="px-2.5 py-2 text-xs text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
                >
                  Reset
                </button>
              )}
          </div>
        </div>
      </div>

      {/* Main Transfer Table */}
      {loading ? (
        <div className="py-20 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 font-medium">Loading fleet transfer dispatch records...</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="py-20 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <ArrowRightLeft className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Transfer Records Found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            No inter-hub vehicle relocations matched your search and filter criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 uppercase tracking-wider text-[10px] font-bold border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3.5">Vehicle Under Transit</th>
                <th className="px-4 py-3.5">Relocation Route (Origin ➔ Destination)</th>
                <th className="px-4 py-3.5">Driver & Contact</th>
                <th className="px-4 py-3.5">Status & Stage</th>
                <th className="px-4 py-3.5">Dispatch Reason</th>
                <th className="px-5 py-3.5 text-right">Logistics Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredTransfers.map((t) => {
                const vehicle = t.Vehicle;
                const isLoading = actionLoadingId === t.transferId;

                return (
                  <tr key={t.transferId} className="hover:bg-neutral-800/30 transition-colors">
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
                            {vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle Relocation"}
                          </span>
                          <span className="font-mono text-[10px] text-purple-300 font-semibold uppercase">
                            {vehicle?.plate_number || "NO-PLATE"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-bold text-neutral-300">
                            {t.SourceHub?.name || "Origin Hub"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-800/60 text-[11px] font-bold text-purple-300">
                            {t.DestinationHub?.name || "Target Hub"}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block">
                          Initiated by {t.Initiator?.name || "Staff"} &bull; {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="px-4 py-4">
                      {t.driver_name ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-white block flex items-center gap-1.5">
                            <User className="w-3 h-3 text-purple-400" />
                            {t.driver_name}
                          </span>
                          {t.driver_phone && (
                            <span className="text-[10px] text-neutral-400 font-mono block flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-neutral-500" />
                              {t.driver_phone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px]">Unassigned driver</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 uppercase tracking-wider ${t.status === "IN_TRANSIT"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : t.status === "COMPLETED"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : t.status === "PENDING"
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-neutral-800 border-neutral-700 text-neutral-400"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${t.status === "IN_TRANSIT"
                              ? "bg-blue-400 animate-pulse"
                              : t.status === "COMPLETED"
                                ? "bg-emerald-400"
                                : t.status === "PENDING"
                                  ? "bg-amber-400"
                                  : "bg-neutral-500"
                            }`}
                        />
                        <span>
                          {t.status === "IN_TRANSIT"
                            ? "On Road (In Transit)"
                            : t.status === "COMPLETED"
                              ? "Delivered & Staged"
                              : t.status === "PENDING"
                                ? "Awaiting Dispatch"
                                : "Cancelled"}
                        </span>
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-4">
                      <span className="text-neutral-300 font-medium block">
                        {t.reason || "Inventory rebalance"}
                      </span>
                      {t.completed_at && (
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          Arrived: {new Date(t.completed_at).toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Controls */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleStartTransit(t.transferId)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900 border border-blue-800/80 text-blue-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                            title="Dispatch vehicle into transit"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Dispatch</span>
                          </button>
                        )}

                        {t.status === "IN_TRANSIT" && (
                          <button
                            type="button"
                            onClick={() => handleCompleteTransfer(t.transferId)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                            title="Confirm arrival at destination station lot"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Arrival</span>
                          </button>
                        )}

                        {(t.status === "PENDING" || t.status === "IN_TRANSIT") && (
                          <button
                            type="button"
                            onClick={() => handleCancelTransfer(t.transferId)}
                            disabled={isLoading}
                            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-neutral-400 cursor-pointer transition-all"
                            title="Cancel Relocation"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {t.status === "COMPLETED" && (
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                        )}

                        {t.status === "CANCELLED" && (
                          <span className="text-[11px] text-neutral-500">Void</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          {!loading && pagination.totalItems > 0 && (
            <div className="mt-4">
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
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          )}
        </>
      )}

      {/* MODAL: INITIATE INTER-HUB FLEET RELOCATION */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Initiate Inter-Hub Fleet Relocation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              {/* Station Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold block">Origin Station Hub *</label>
                  <select
                    required
                    value={createForm.source_hub_id}
                    onChange={(e) => handleSourceHubChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="">-- Choose Origin Station --</option>
                    {hubs.map((hub) => (
                      <option key={hub.hubId} value={hub.hubId}>
                        {hub.name} ({hub.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold block">Destination Station Hub *</label>
                  <select
                    required
                    value={createForm.destination_hub_id}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, destination_hub_id: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="">-- Choose Target Station --</option>
                    {hubs
                      .filter((h) => h.hubId !== createForm.source_hub_id)
                      .map((hub) => (
                        <option key={hub.hubId} value={hub.hubId}>
                          {hub.name} ({hub.city}) &bull; {hub.capacity} Bays
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold flex items-center justify-between">
                  <span>Select Vehicle to Relocate *</span>
                  {loadingVehicles && (
                    <span className="text-[10px] text-purple-400 flex items-center gap-1 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Querying station lot...
                    </span>
                  )}
                </label>
                <select
                  required
                  disabled={!createForm.source_hub_id || loadingVehicles}
                  value={createForm.vehicle_id}
                  onChange={(e) => setCreateForm({ ...createForm, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {!createForm.source_hub_id
                      ? "-- First Choose Origin Station Hub --"
                      : availableVehicles.length === 0
                        ? "-- No Ready Active Cars at this Hub --"
                        : "-- Choose Active Vehicle --"}
                  </option>
                  {availableVehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.make} {v.model} &bull; {v.plate_number} ({v.vehicle_class})
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold block">Assigned Transfer Driver</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={createForm.driver_name}
                    onChange={(e) => setCreateForm({ ...createForm, driver_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold block">Driver Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={createForm.driver_phone}
                    onChange={(e) => setCreateForm({ ...createForm, driver_phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 font-mono"
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">Relocation Reason</label>
                <select
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="Inventory rebalancing">Inventory rebalancing (Lot capacity equilibrium)</option>
                  <option value="Surge demand relocation">Surge demand relocation (High weekend booking volume)</option>
                  <option value="One-way trip fleet retrieval">One-way trip fleet retrieval</option>
                  <option value="Service depot transfer">Service depot / Maintenance bay transfer</option>
                </select>
              </div>

              {/* Immediate Transit Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.immediate_transit}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, immediate_transit: e.target.checked })
                  }
                  className="rounded border-neutral-700 text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="text-xs text-neutral-300">
                  Dispatch immediately (Flag vehicle as <strong>IN_TRANSIT</strong> upon creation)
                </span>
              </label>

              {createSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {createSuccess}
                </div>
              )}

              {createError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !createForm.source_hub_id || !createForm.vehicle_id || !createForm.destination_hub_id}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Initiating Fleet Relocation..." : "Confirm & Dispatch Vehicle"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
