"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import Pagination from "@/components/Pagination";
import {
  ArrowRightLeft,
  Building2,
  PlusCircle,
  Loader2,
  X,
  RefreshCw,
  Car,
  Search,
  Play,
  Check,
} from "lucide-react";

import { useSearchParams } from "next/navigation";

export default function ManagerTransfersPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [allHubsList, setAllHubsList] = useState([]);

  // Filter & Pagination
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 6,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    destination_hub_id: "",
    vehicle_id: "",
    driver_name: "",
    driver_phone: "",
    reason: "Fleet Rebalancing",
    immediate_transit: false,
  });
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Resolve Station Hub
  const resolveStationHub = useCallback(async () => {
    try {
      const res = await api.get("/hubs");
      if (res.data?.success) {
        const hubs = res.data.data || [];
        setAllHubsList(hubs);

        let target = null;
        const requestedId = user?.role === "SUPERADMIN" ? searchParams?.get("hubId") : null;
        if (requestedId) {
          target = hubs.find((h) => h.hubId === requestedId);
        }
        if (!target) {
          if (user?.role === "HUB_ADMIN") {
            const userIdentifier = user?.userId || user?.id;
            const userEmail = user?.email?.toLowerCase().trim();
            target = hubs.find((h) => {
              const idMatch = userIdentifier && (h.manager_id === userIdentifier || h.Manager?.userId === userIdentifier);
              const emailMatch = userEmail && h.Manager?.email?.toLowerCase().trim() === userEmail;
              return idMatch || emailMatch;
            }) || hubs[0];
          } else {
            target = hubs[0];
          }
        }

        if (target) {
          setCurrentHub(target);
          setSelectedHubId(target.hubId);
        }
      }
    } catch (err) {
      console.error("Failed to load hubs:", err);
    }
  }, [user, searchParams]);

  // Fetch Station Transfers with status & pagination
  const fetchTransfers = useCallback(async () => {
    if (!selectedHubId) return;
    setLoadingTransfers(true);
    try {
      const params = {
        hubId: selectedHubId,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        limit,
      };
      const res = await api.get("/hub-admin/transfers", { params });
      if (res.data?.success) {
        setTransfers(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to load transfers:", err);
    } finally {
      setLoadingTransfers(false);
    }
  }, [selectedHubId, statusFilter, debouncedSearch, page, limit]);

  // Fetch Available Vehicles for Transfer
  const fetchAvailableVehicles = useCallback(async () => {
    if (!selectedHubId) return;
    try {
      const res = await api.get(`/vehicles/hub/${selectedHubId}`);
      if (res.data?.success) {
        const vehicles = res.data.data || [];
        setAvailableVehicles(vehicles.filter((v) => v.status === "ACTIVE"));
      }
    } catch (err) {
      console.error("Failed to load vehicles:", err);
    }
  }, [selectedHubId]);

  useEffect(() => {
    if (isAuthenticated) {
      resolveStationHub();
    }
  }, [isAuthenticated, resolveStationHub]);

  useEffect(() => {
    if (selectedHubId) {
      fetchTransfers();
      fetchAvailableVehicles();
    }
  }, [selectedHubId, fetchTransfers, fetchAvailableVehicles]);

  useEffect(() => {
    const handleSuperadminHubChange = (e) => {
      if (e.detail) {
        setSelectedHubId(e.detail);
        const match = allHubsList.find((h) => h.hubId === e.detail);
        if (match) setCurrentHub(match);
      }
    };
    window.addEventListener("superadmin-hub-change", handleSuperadminHubChange);
    return () => window.removeEventListener("superadmin-hub-change", handleSuperadminHubChange);
  }, [allHubsList]);

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setSubmittingTransfer(true);
    try {
      const payload = {
        source_hub_id: selectedHubId,
        destination_hub_id: transferForm.destination_hub_id,
        vehicle_id: transferForm.vehicle_id,
        driver_name: transferForm.driver_name,
        driver_phone: transferForm.driver_phone,
        reason: transferForm.reason,
        immediate_transit: Boolean(transferForm.immediate_transit),
      };
      const res = await api.post("/hub-admin/transfers", payload);
      if (res.data?.success) {
        setShowTransferModal(false);
        setTransferForm({
          destination_hub_id: "",
          vehicle_id: "",
          driver_name: "",
          driver_phone: "",
          reason: "Fleet Rebalancing",
          immediate_transit: false,
        });
        fetchTransfers();
        fetchAvailableVehicles();
        alert("Transfer order initiated successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create transfer.");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleUpdateTransferStatus = async (transferId, action) => {
    try {
      const res = await api.patch(`/hub-admin/transfers/${transferId}/${action}`, {});
      if (res.data?.success) {
        fetchTransfers();
        fetchAvailableVehicles();
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} transfer.`);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="text-xs text-neutral-400 font-medium">Loading Transfer Logs...</span>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Station: {currentHub?.name || "Assigned Station"}</span>
            <span>•</span>
            <span className="text-neutral-400">{currentHub?.city}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Inter-Hub Deadhead Fleet Transfers
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Rebalance station fleet allocations, shift surplus inventory, or relocate damaged vehicles to maintenance hubs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              fetchAvailableVehicles();
              setShowTransferModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Initiate Transfer</span>
          </button>

          <button
            type="button"
            onClick={fetchTransfers}
            disabled={loadingTransfers}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
            title="Refresh Transfers"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTransfers ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transfer, vehicle, driver, route..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["ALL", "PENDING", "IN_TRANSIT", "COMPLETED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${statusFilter === st
                  ? "bg-white text-black shadow-md"
                  : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
            >
              {st === "ALL" ? "All Transfers" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Transfers Cards Grid */}
      {loadingTransfers ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400" />
          <p>Scanning inter-hub transfer logs...</p>
        </div>
      ) : transfers.length === 0 ? (
        <div className="py-20 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <ArrowRightLeft className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No Fleet Transfers On Record</p>
          <p className="text-xs text-neutral-500">All station vehicles are stationed at home base.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {transfers.map((item) => {
            const isOrigin = !selectedHubId || item.source_hub_id === selectedHubId || user?.role === "SUPERADMIN";
            const isDestination = !selectedHubId || item.destination_hub_id === selectedHubId || user?.role === "SUPERADMIN";
            const isOutgoing = selectedHubId && item.source_hub_id === selectedHubId;
            const isIncoming = selectedHubId && item.destination_hub_id === selectedHubId;

            return (
              <div
                key={item.transferId}
                className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                        Transfer #{item.transferId.slice(0, 8)}
                      </span>
                      {isOutgoing && (
                        <span className="text-[9px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.5 rounded">
                          Outgoing
                        </span>
                      )}
                      {isIncoming && (
                        <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                          Incoming
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.status === "COMPLETED"
                          ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                          : item.status === "IN_TRANSIT"
                            ? "bg-blue-950/60 border border-blue-800 text-blue-400 animate-pulse"
                            : "bg-amber-950/60 border border-amber-800 text-amber-400"
                        }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-11 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.Vehicle?.gallery_urls && item.Vehicle.gallery_urls.length > 0 ? (
                        <img
                          src={item.Vehicle.gallery_urls[0]}
                          alt={`${item.Vehicle?.make} ${item.Vehicle?.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Car className="w-5 h-5 text-neutral-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {item.Vehicle?.make} {item.Vehicle?.model}
                      </h4>
                      <span className="font-mono text-xs text-neutral-400">
                        {item.Vehicle?.plate_number}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>Route:</span>
                      <span className="text-white font-medium">
                        {item.SourceHub?.name || "Origin Station"} → {item.DestinationHub?.name || "Destination Station"}
                      </span>
                    </div>
                    {item.driver_name && (
                      <div className="flex justify-between text-neutral-400">
                        <span>Driver:</span>
                        <span className="text-neutral-200">{item.driver_name}</span>
                      </div>
                    )}
                    {item.reason && (
                      <div className="flex justify-between text-neutral-400">
                        <span>Reason:</span>
                        <span className="text-neutral-300 italic">{item.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-800">
                  {(item.status === "PENDING" || item.status === "REQUESTED") && (
                    <>
                      {isOrigin ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateTransferStatus(item.transferId, "start")}
                          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Dispatch & Start Transit</span>
                        </button>
                      ) : (
                        <div className="flex-1 py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-[11px] text-neutral-400 font-medium">
                          Awaiting origin dispatch
                        </div>
                      )}
                    </>
                  )}

                  {item.status === "IN_TRANSIT" && (
                    <>
                      {isDestination ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateTransferStatus(item.transferId, "complete")}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm Station Arrival</span>
                        </button>
                      ) : (
                        <div className="flex-1 py-2 px-3 rounded-xl bg-blue-950/30 border border-blue-900/40 text-center text-[11px] text-blue-300 font-medium">
                          En route to destination
                        </div>
                      )}
                    </>
                  )}

                  {isOrigin && item.status !== "COMPLETED" && item.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateTransferStatus(item.transferId, "cancel")}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-neutral-400 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loadingTransfers && pagination.totalItems > 0 && (
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
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </div>
      )}

      {/* INITIATE FLEET TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Initiate Fleet Transfer</h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Destination Station Hub *</label>
                <select
                  required
                  value={transferForm.destination_hub_id}
                  onChange={(e) => setTransferForm({ ...transferForm, destination_hub_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="">-- Choose Destination --</option>
                  {allHubsList
                    .filter((h) => h.hubId !== selectedHubId)
                    .map((h) => (
                      <option key={h.hubId} value={h.hubId}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Select Vehicle to Deadhead *</label>
                <select
                  required
                  value={transferForm.vehicle_id}
                  onChange={(e) => setTransferForm({ ...transferForm, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {availableVehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.make} {v.model} ({v.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Driver Name</label>
                <input
                  type="text"
                  value={transferForm.driver_name}
                  onChange={(e) => setTransferForm({ ...transferForm, driver_name: e.target.value })}
                  placeholder="e.g. Ramesh Singh"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Driver Phone</label>
                <input
                  type="tel"
                  value={transferForm.driver_phone}
                  onChange={(e) => setTransferForm({ ...transferForm, driver_phone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Reason for Transfer</label>
                <input
                  type="text"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  placeholder="e.g. Weekend Surge Support"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={transferForm.immediate_transit || false}
                  onChange={(e) => setTransferForm({ ...transferForm, immediate_transit: e.target.checked })}
                  className="rounded bg-neutral-900 border-neutral-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-white font-semibold block text-xs">Dispatch Immediately (Start Transit Now)</span>
                  <span className="text-neutral-400 block text-[10px]">Sets status directly to IN_TRANSIT and marks car IN_USE</span>
                </div>
              </label>

              <button
                type="submit"
                disabled={submittingTransfer}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer mt-2"
              >
                {submittingTransfer ? "Creating Order..." : "Dispatch Transfer Order"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
