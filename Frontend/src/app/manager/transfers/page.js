"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import {
  ArrowRightLeft,
  Building2,
  PlusCircle,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";

export default function ManagerTransfersPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [allHubsList, setAllHubsList] = useState([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    destination_hub_id: "",
    vehicle_id: "",
    driver_name: "",
    driver_phone: "",
    reason: "Fleet Rebalancing",
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
        if (user?.role === "HUB_ADMIN") {
          target = hubs.find((h) => h.manager_id === user.userId) || hubs[0];
        } else {
          target = hubs[0];
        }

        if (target) {
          setCurrentHub(target);
          setSelectedHubId(target.hubId);
        }
      }
    } catch (err) {
      console.error("Failed to load hubs:", err);
    }
  }, [user]);

  // Fetch Station Transfers
  const fetchTransfers = useCallback(async () => {
    if (!selectedHubId) return;
    setLoadingTransfers(true);
    try {
      const res = await api.get(`/hub-admin/transfers?hubId=${selectedHubId}`);
      if (res.data?.success) {
        setTransfers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load transfers:", err);
    } finally {
      setLoadingTransfers(false);
    }
  }, [selectedHubId]);

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
      };
      const res = await api.post("/hub-admin/transfers", payload);
      if (res.data?.success) {
        setShowTransferModal(false);
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
      const res = await api.patch(`/hub-admin/transfers/${transferId}/${action}`);
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
          {transfers.map((item) => (
            <div
              key={item.transferId}
              className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                    Transfer #{item.transferId.slice(0, 8)}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === "COMPLETED"
                        ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                        : item.status === "IN_TRANSIT"
                        ? "bg-blue-950/60 border border-blue-800 text-blue-400 animate-pulse"
                        : "bg-amber-950/60 border border-amber-800 text-amber-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">
                    {item.Vehicle?.make} {item.Vehicle?.model}
                  </h4>
                  <span className="font-mono text-xs text-neutral-400">
                    {item.Vehicle?.plate_number}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Route:</span>
                    <span className="text-white font-medium">
                      {item.SourceHub?.city || "Origin"} → {item.DestinationHub?.city || "Destination"}
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
                {item.status === "REQUESTED" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateTransferStatus(item.transferId, "start")}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer"
                  >
                    Start Transit
                  </button>
                )}
                {item.status === "IN_TRANSIT" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateTransferStatus(item.transferId, "complete")}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer"
                  >
                    Confirm Station Arrival
                  </button>
                )}
                {item.status !== "COMPLETED" && item.status !== "CANCELLED" && (
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
          ))}
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
