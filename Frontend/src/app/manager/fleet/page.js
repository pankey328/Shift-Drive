"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import {
  Car,
  Building2,
  RefreshCw,
  ArrowRightLeft,
  Loader2,
  AlertTriangle,
  X,
  PlusCircle,
  User,
  Phone,
  Mail,
  Clock,
  Calendar,
  ShieldCheck,
  MapPin,
  FileText,
  CheckCircle2,
  Wrench,
  Upload,
  Fuel,
  Armchair,
  IndianRupee,
} from "lucide-react";

export default function ManagerFleetPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [lotVehicles, setLotVehicles] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [fleetFilter, setFleetFilter] = useState("ALL");
  const [allHubsList, setAllHubsList] = useState([]);
  const [updatingVehicleId, setUpdatingVehicleId] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Active Trip Dossier Modal State
  const [selectedTripDossier, setSelectedTripDossier] = useState(null);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    destination_hub_id: "",
    vehicle_id: "",
    driver_name: "",
    driver_phone: "",
    reason: "Fleet Rebalancing",
  });
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Add Vehicle to Lot Modal State
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [addVehicleForm, setAddVehicleForm] = useState({
    make: "",
    model: "",
    vehicle_class: "SEDAN",
    plate_number: "",
    base_daily_rate: "",
    seats: "5",
    fuel_type: "Petrol",
    transmission: "Automatic",
  });
  const [vehicleImages, setVehicleImages] = useState([]);
  const [submittingVehicle, setSubmittingVehicle] = useState(false);
  const [addVehicleError, setAddVehicleError] = useState("");
  const [addVehicleSuccess, setAddVehicleSuccess] = useState("");

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

  // Fetch Station Fleet Vehicles
  const fetchStationFleet = useCallback(async () => {
    if (!selectedHubId) return;
    setLoadingFleet(true);
    try {
      const res = await api.get(`/vehicles/hub/${selectedHubId}`);
      if (res.data?.success) {
        setLotVehicles(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load station fleet:", err);
    } finally {
      setLoadingFleet(false);
    }
  }, [selectedHubId]);

  useEffect(() => {
    const handleSuperadminHubChange = (e) => {
      if (e.detail) {
        setSelectedHubId(e.detail);
        const found = allHubsList.find((h) => h.hubId === e.detail);
        if (found) setCurrentHub(found);
      }
    };
    window.addEventListener("superadmin-hub-change", handleSuperadminHubChange);
    return () => window.removeEventListener("superadmin-hub-change", handleSuperadminHubChange);
  }, [allHubsList]);

  useEffect(() => {
    if (isAuthenticated) {
      resolveStationHub();
    }
  }, [isAuthenticated, resolveStationHub]);

  useEffect(() => {
    if (selectedHubId) {
      fetchStationFleet();
    }
  }, [selectedHubId, fetchStationFleet]);

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
        fetchStationFleet();
        alert("Transfer order dispatched successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to initiate transfer.");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleUpdateVehicleStatus = async (vehicleId, newStatus) => {
    setUpdatingVehicleId(vehicleId);
    try {
      const res = await api.patch(`/vehicles/${vehicleId}/status`, { status: newStatus });
      if (res.data?.success) {
        await fetchStationFleet();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update vehicle status.");
    } finally {
      setUpdatingVehicleId(null);
    }
  };

  // Add New Vehicle to Lot Handler
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setAddVehicleError("");
    setAddVehicleSuccess("");

    if (
      !addVehicleForm.make.trim() ||
      !addVehicleForm.model.trim() ||
      !addVehicleForm.plate_number.trim() ||
      !addVehicleForm.base_daily_rate
    ) {
      setAddVehicleError("Make, Model, License Plate Number, and Daily Rate are required.");
      return;
    }

    setSubmittingVehicle(true);
    try {
      const payload = {
        make: addVehicleForm.make.trim(),
        model: addVehicleForm.model.trim(),
        vehicle_class: addVehicleForm.vehicle_class,
        plate_number: addVehicleForm.plate_number.trim().toUpperCase(),
        base_daily_rate: parseFloat(addVehicleForm.base_daily_rate),
        seats: parseInt(addVehicleForm.seats, 10) || 5,
        fuel_type: addVehicleForm.fuel_type,
        transmission: addVehicleForm.transmission,
        current_hub_id: selectedHubId || currentHub?.hubId,
      };

      const res = await api.post("/vehicles", payload);
      if (res.data?.success) {
        const newCar = res.data.data;
        const newVehicleId = newCar?.vehicleId;

        // Upload gallery images if any were selected
        if (vehicleImages.length > 0 && newVehicleId) {
          const formData = new FormData();
          vehicleImages.forEach((img) => formData.append("images", img));
          await api.post(`/vehicles/${newVehicleId}/images`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }

        setAddVehicleSuccess(
          `Vehicle ${payload.make} ${payload.model} (${payload.plate_number}) successfully registered on lot!`
        );

        setTimeout(() => {
          setShowAddVehicleModal(false);
          setAddVehicleForm({
            make: "",
            model: "",
            vehicle_class: "SEDAN",
            plate_number: "",
            base_daily_rate: "",
            seats: "5",
            fuel_type: "Petrol",
            transmission: "Automatic",
          });
          setVehicleImages([]);
          setAddVehicleSuccess("");
          fetchStationFleet();
        }, 1400);
      }
    } catch (err) {
      setAddVehicleError(
        err.response?.data?.message || "Failed to onboard new vehicle to station lot."
      );
    } finally {
      setSubmittingVehicle(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="text-xs text-neutral-400 font-medium">Scanning Lot Inventory...</span>
      </div>
    );
  }

  const filteredVehicles = lotVehicles.filter((v) => {
    if (fleetFilter === "ALL") return true;
    return v.status === fleetFilter;
  });

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
            Station Lot Fleet Inventory
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Real-time lot inventory tracking, sanitized ready-to-rent status, and maintenance bay management.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchStationFleet}
            disabled={loadingFleet}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
            title="Refresh Fleet Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loadingFleet ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddVehicleModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Vehicle to Lot</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { label: "All Station Fleet", value: "ALL" },
            { label: "Ready on Lot", value: "ACTIVE" },
            { label: "In-Use on Road", value: "IN_USE" },
            { label: "Maintenance / Buffer", value: "MAINTENANCE" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFleetFilter(tab.value)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${fleetFilter === tab.value
                ? "bg-white text-black font-bold shadow-md"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-neutral-400 font-medium">
          Showing {filteredVehicles.length} of {lotVehicles.length} total station vehicle(s)
        </span>
      </div>

      {/* Fleet Cards Grid */}
      {loadingFleet ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400" />
          <p>Scanning physical station lot inventory...</p>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="py-20 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <Car className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No Vehicles In This Category</p>
          <p className="text-xs text-neutral-500">Lot inventory is clear for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((car) => (
            <div
              key={car.vehicleId}
              className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                    {car.vehicle_class || "STANDARD"}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${car.status === "ACTIVE"
                      ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                      : car.status === "IN_USE"
                        ? "bg-blue-950/60 border border-blue-800 text-blue-400"
                        : "bg-amber-950/60 border border-amber-800 text-amber-400"
                      }`}
                  >
                    {car.status === "ACTIVE" ? "READY ON LOT" : car.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    {car.make} {car.model}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-neutral-300">
                    {car.plate_number}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Daily Rate</span>
                    <span className="font-semibold text-white">
                      ₹{parseFloat(car.base_daily_rate).toLocaleString("en-IN")}/day
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Transmission</span>
                    <span className="font-semibold text-white">{car.transmission || "AUTOMATIC"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Fuel Type</span>
                    <span className="font-semibold text-white">{car.fuel_type || "PETROL"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Seating</span>
                    <span className="font-semibold text-white">{car.seats || 5} Seats</span>
                  </div>
                </div>
              </div>

              {car.status === "ACTIVE" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferForm((prev) => ({ ...prev, vehicle_id: car.vehicleId }));
                      setShowTransferModal(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                    <span>Deadhead Transfer</span>
                  </button>
                  <button
                    type="button"
                    title="Send to Maintenance Bay (Servicing / Cleaning)"
                    disabled={updatingVehicleId === car.vehicleId}
                    onClick={() => {
                      if (confirm(`Move ${car.make} ${car.model} (${car.plate_number}) to Maintenance Bay for servicing or detailing?`)) {
                        handleUpdateVehicleStatus(car.vehicleId, "MAINTENANCE");
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-amber-950/60 hover:text-amber-400 hover:border-amber-700/60 text-neutral-400 text-xs font-semibold transition-all cursor-pointer border border-neutral-700 flex items-center gap-1.5"
                  >
                    {updatingVehicleId === car.vehicleId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wrench className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Bay</span>
                  </button>
                </div>
              )}

              {car.status === "MAINTENANCE" && (
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Station Maintenance Bay: Servicing or damage repair in progress.</span>
                  </div>
                  <button
                    type="button"
                    disabled={updatingVehicleId === car.vehicleId}
                    onClick={() => handleUpdateVehicleStatus(car.vehicleId, "ACTIVE")}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {updatingVehicleId === car.vehicleId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Complete Maintenance (Mark Ready on Lot)</span>
                  </button>
                </div>
              )}

              {car.status === "IN_USE" && (
                <div className="space-y-2">
                  <div
                    onClick={() => setSelectedTripDossier({ car, trip: car.Bookings?.[0] })}
                    className="p-3 rounded-2xl bg-blue-950/40 border border-blue-800/60 cursor-pointer hover:bg-blue-900/30 transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span>{car.Bookings?.[0]?.Customer?.name || "Active Renter"}</span>
                      </span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                        {car.Bookings?.[0]?.Customer?.phone || "On Trip"}
                      </span>
                    </div>
                    {car.Bookings?.[0] && (
                      <div className="flex justify-between items-center text-[10px] text-neutral-400 pt-0.5">
                        <span>Scheduled Return:</span>
                        <span className="text-white font-medium">
                          {new Date(car.Bookings[0].end_time).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-blue-400 font-semibold group-hover:text-blue-300">
                      <span>Assigned Trip Dossier</span>
                      <span className="underline">View Ride Details &rarr;</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTripDossier({ car, trip: car.Bookings?.[0] })}
                    className="w-full py-2.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Driver & Trip Details</span>
                  </button>
                </div>
              )}
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
                  placeholder="e.g. Surplus Lot Rebalancing"
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

      {/* ACTIVE RIDE & DRIVER DOSSIER MODAL */}
      {selectedTripDossier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Driver & Ride Dossier</h3>
                  <p className="text-xs text-neutral-400">
                    {selectedTripDossier.car?.make} {selectedTripDossier.car?.model} •{" "}
                    <span className="font-mono text-neutral-200">{selectedTripDossier.car?.plate_number}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripDossier(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedTripDossier.trip ? (
              <div className="space-y-4">
                {/* Driver Credentials Card */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Customer & Verified Driver
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                      <ShieldCheck className="w-3 h-3" />
                      <span>KYC VERIFIED</span>
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Full Name</span>
                      <span className="text-white font-bold text-sm">
                        {selectedTripDossier.trip.Customer?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Contact Number</span>
                      <a
                        href={`tel:${selectedTripDossier.trip.Customer?.phone}`}
                        className="text-blue-400 hover:underline font-mono font-semibold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{selectedTripDossier.trip.Customer?.phone || "N/A"}</span>
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Email Address</span>
                      <a
                        href={`mailto:${selectedTripDossier.trip.Customer?.email}`}
                        className="text-neutral-300 hover:underline flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3 text-neutral-500" />
                        <span>{selectedTripDossier.trip.Customer?.email || "N/A"}</span>
                      </a>
                    </div>
                    {selectedTripDossier.trip.Customer?.kyc_document_url && (
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[11px]">
                        <span className="text-neutral-400">Driving License / Doc</span>
                        <span className="font-mono text-emerald-400 font-medium">
                          {selectedTripDossier.trip.Customer?.kyc_document_url}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rental Particulars */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Rental Particulars & Schedule
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                      <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        Departure Time
                      </span>
                      <span className="font-semibold text-white block">
                        {new Date(selectedTripDossier.trip.start_time).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        From: {selectedTripDossier.trip.PickupHub?.name || "Station Hub"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                      <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        Due Return Time
                      </span>
                      <span className="font-semibold text-white block">
                        {new Date(selectedTripDossier.trip.end_time).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        To: {selectedTripDossier.trip.DropoffHub?.name || "Station Hub"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Booking Reference</span>
                    <span className="font-mono font-bold text-neutral-200">
                      #{selectedTripDossier.trip.bookingId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Trip Fare & Deposit</span>
                    <span className="text-emerald-400 font-extrabold text-sm">
                      ₹{parseFloat(selectedTripDossier.trip.total_price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {selectedTripDossier.trip.incident_notes && (
                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                      <span className="text-[10px] text-neutral-500 font-semibold block mb-0.5">Desk / POS Notes:</span>
                      <p>{selectedTripDossier.trip.incident_notes}</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3 pt-2">
                  <a
                    href={`tel:${selectedTripDossier.trip.Customer?.phone}`}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Driver Directly</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedTripDossier(null)}
                    className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-neutral-200">Vehicle Marked In Use</p>
                <p>This car is on an active trip. Details are being synchronized from the dispatch desk.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD VEHICLE TO LOT MODAL */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Vehicle to Station Lot</h3>
                  <p className="text-xs text-neutral-400">
                    Register a new fleet asset stationed at {currentHub?.name || "this Hub"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVehicleModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addVehicleError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{addVehicleError}</span>
              </div>
            )}

            {addVehicleSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{addVehicleSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Make / Manufacturer <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyundai, Tata, Mahindra"
                    value={addVehicleForm.make}
                    onChange={(e) => setAddVehicleForm({ ...addVehicleForm, make: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Model & Trim <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Creta SX, Harrier XZ+"
                    value={addVehicleForm.model}
                    onChange={(e) => setAddVehicleForm({ ...addVehicleForm, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    License Plate Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RJ14-CR-9999"
                    value={addVehicleForm.plate_number}
                    onChange={(e) => setAddVehicleForm({ ...addVehicleForm, plate_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white uppercase font-mono placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Base Daily Rate (₹/day) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    placeholder="e.g. 2500"
                    value={addVehicleForm.base_daily_rate}
                    onChange={(e) => setAddVehicleForm({ ...addVehicleForm, base_daily_rate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Vehicle Category</label>
                  <select
                    value={addVehicleForm.vehicle_class}
                    onChange={(e) => setAddVehicleForm({ ...addVehicleForm, vehicle_class: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="HATCHBACK">HATCHBACK</option>
                    <option value="SEDAN">SEDAN</option>
                    <option value="SUV">SUV</option>
                    <option value="LUXURY">LUXURY</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Fuel Type</label>
                  <select
                    value={addVehicleForm.fuel_type}
                    onChange={(e) => setAddVehicleForm({ ...addVehicleForm, fuel_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Transmission</label>
                  <select
                    value={addVehicleForm.transmission}
                    onChange={(e) => setAddVehicleForm({ ...addVehicleForm, transmission: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
              </div>

              {/* Station Hub Assignment */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">Assigned Station Hub</label>
                <div className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-white">{currentHub?.name || "Assigned Station"}</span>
                    <span className="text-neutral-500">({currentHub?.city})</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Lot Stationed</span>
                </div>
              </div>

              {/* Photos Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Vehicle Gallery Photos (Up to 5 images)
                </label>
                <div className="p-4 rounded-2xl border-2 border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-center space-y-2 cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setVehicleImages(Array.from(e.target.files || []).slice(0, 5))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-neutral-500 mx-auto" />
                  <p className="text-xs text-neutral-400">
                    {vehicleImages.length > 0
                      ? `${vehicleImages.length} image(s) selected for upload`
                      : "Drag & drop or tap to select car photos"}
                  </p>
                  <p className="text-[10px] text-neutral-600">Front, Rear, Side angles recommended</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  disabled={submittingVehicle}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVehicle}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingVehicle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Onboarding Vehicle...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Onboard Vehicle to Lot</span>
                    </>
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
