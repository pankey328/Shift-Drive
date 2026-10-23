"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/api";
import Link from "next/link";
import {
  Car,
  Search,
  PlusCircle,
  RefreshCw,
  Loader2,
  Building2,
  ArrowRightLeft,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  TrendingUp,
  Tag,
  Fuel,
  SlidersHorizontal,
  ChevronDown,
  Edit3,
  Image as ImageIcon,
  ShieldAlert,
  IndianRupee,
  Layers,
  ArrowRight,
  Upload,
  Trash2,
} from "lucide-react";

export default function SuperadminFleetPage() {
  const [vehicles, setVehicles] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHubFilter, setSelectedHubFilter] = useState("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  // Add Vehicle Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    make: "",
    model: "",
    plate_number: "",
    vehicle_class: "SUV",
    base_daily_rate: "",
    current_hub_id: "",
    seats: 5,
    fuel_type: "Petrol",
    transmission: "Automatic",
  });
  const [vehicleImages, setVehicleImages] = useState([]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  // Vehicle Gallery Modal
  const [galleryVehicle, setGalleryVehicle] = useState(null);
  const [newGalleryFiles, setNewGalleryFiles] = useState([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [gallerySuccess, setGallerySuccess] = useState("");

  // Transfer Vehicle Modal
  const [transferVehicle, setTransferVehicle] = useState(null);
  const [targetHubId, setTargetHubId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");

  // Change Status / Maintenance Modal
  const [statusVehicle, setStatusVehicle] = useState(null);
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [serviceCategory, setServiceCategory] = useState("Routine Inspection");
  const [serviceNotes, setServiceNotes] = useState("");
  const [mechanicAssigned, setMechanicAssigned] = useState("");
  const [estimatedReadyDate, setEstimatedReadyDate] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

  // Edit Vehicle Modal
  const [editVehicle, setEditVehicle] = useState(null);
  const [editForm, setEditForm] = useState({
    make: "",
    model: "",
    base_daily_rate: "",
    vehicle_class: "SUV",
    seats: 5,
    fuel_type: "Petrol",
    transmission: "Automatic",
  });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Fetch all fleet & hubs
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fleetRes, hubsRes] = await Promise.all([
        api.get("/vehicles", { params: { status: "ALL" } }),
        api.get("/hubs"),
      ]);

      if (fleetRes.data?.success) {
        setVehicles(fleetRes.data.data || []);
      }
      if (hubsRes.data?.success) {
        const loadedHubs = hubsRes.data.data || [];
        setHubs(loadedHubs);
        if (loadedHubs.length > 0 && !addForm.current_hub_id) {
          setAddForm((prev) => ({ ...prev, current_hub_id: loadedHubs[0].hubId }));
        }
      }
    } catch (err) {
      console.error("Failed to load enterprise fleet:", err);
    } finally {
      setLoading(false);
    }
  }, [addForm.current_hub_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    setAddSuccess("");

    try {
      const payload = {
        make: addForm.make.trim(),
        model: addForm.model.trim(),
        plate_number: addForm.plate_number.trim().toUpperCase(),
        vehicle_class: addForm.vehicle_class,
        base_daily_rate: parseFloat(addForm.base_daily_rate),
        current_hub_id: addForm.current_hub_id,
        seats: parseInt(addForm.seats, 10) || 5,
        fuel_type: addForm.fuel_type,
        transmission: addForm.transmission,
      };

      const res = await api.post("/vehicles", payload);
      if (res.data?.success) {
        const newVehicleId = res.data.data?.vehicleId;

        // Upload gallery images if any were chosen
        if (vehicleImages.length > 0 && newVehicleId) {
          const formData = new FormData();
          vehicleImages.forEach((img) => formData.append("images", img));
          try {
            await api.post(`/vehicles/${newVehicleId}/images`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } catch (uploadErr) {
            console.error("Failed to upload vehicle photos:", uploadErr);
          }
        }

        setAddSuccess(
          `Vehicle "${payload.make} ${payload.model}" provisioned successfully${vehicleImages.length > 0 ? ` with ${vehicleImages.length} photo(s)` : ""
          }!`
        );
        setTimeout(() => {
          setShowAddModal(false);
          setAddSuccess("");
          setVehicleImages([]);
          setAddForm({
            make: "",
            model: "",
            plate_number: "",
            vehicle_class: "SUV",
            base_daily_rate: "",
            current_hub_id: hubs[0]?.hubId || "",
            seats: 5,
            fuel_type: "Petrol",
            transmission: "Automatic",
          });
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setAddError(err.response?.data?.message || "Failed to add vehicle to fleet.");
    } finally {
      setAdding(false);
    }
  };

  const handleUploadNewGallery = async (e) => {
    e.preventDefault();
    if (!galleryVehicle || newGalleryFiles.length === 0) return;

    setUploadingGallery(true);
    setGalleryError("");
    setGallerySuccess("");

    try {
      const formData = new FormData();
      newGalleryFiles.forEach((file) => formData.append("images", file));

      const res = await api.post(`/vehicles/${galleryVehicle.vehicleId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        setGallerySuccess(`${newGalleryFiles.length} photo(s) uploaded successfully!`);
        setNewGalleryFiles([]);
        const updatedVehicle = res.data.data;
        setGalleryVehicle(updatedVehicle);
        setVehicles((prev) =>
          prev.map((v) => (v.vehicleId === updatedVehicle.vehicleId ? updatedVehicle : v))
        );
      }
    } catch (err) {
      setGalleryError(err.response?.data?.message || "Failed to upload vehicle photos.");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleRemoveGalleryImage = async (imgUrl) => {
    if (!galleryVehicle) return;
    try {
      const remainingUrls = (galleryVehicle.gallery_urls || []).filter((u) => u !== imgUrl);
      const res = await api.put(`/vehicles/${galleryVehicle.vehicleId}`, {
        gallery_urls: remainingUrls,
      });
      if (res.data?.success) {
        const updated = res.data.data;
        setGalleryVehicle(updated);
        setVehicles((prev) =>
          prev.map((v) => (v.vehicleId === updated.vehicleId ? updated : v))
        );
      }
    } catch (err) {
      setGalleryError(err.response?.data?.message || "Failed to remove vehicle photo.");
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferVehicle || !targetHubId) return;

    if (transferVehicle.current_hub_id === targetHubId) {
      setTransferError("Vehicle is already stationed at this target hub.");
      return;
    }

    setTransferring(true);
    setTransferError("");
    setTransferSuccess("");

    try {
      const res = await api.patch(`/vehicles/${transferVehicle.vehicleId}/transfer`, {
        targetHubId,
      });

      if (res.data?.success) {
        setTransferSuccess(res.data.message || "Vehicle transferred successfully.");
        setTimeout(() => {
          setTransferVehicle(null);
          setTransferSuccess("");
          setTargetHubId("");
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setTransferError(err.response?.data?.message || "Failed to complete inter-hub transfer.");
    } finally {
      setTransferring(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusVehicle) return;

    setUpdatingStatus(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const payload = {
        status: newStatus,
        service_category: newStatus === "MAINTENANCE" ? serviceCategory : null,
        service_notes: newStatus === "MAINTENANCE" ? serviceNotes : null,
        mechanic_assigned: newStatus === "MAINTENANCE" ? mechanicAssigned : null,
        estimated_ready_date:
          newStatus === "MAINTENANCE" && estimatedReadyDate ? estimatedReadyDate : null,
      };

      const res = await api.patch(`/vehicles/${statusVehicle.vehicleId}/status`, payload);
      if (res.data?.success) {
        setStatusSuccess(res.data.message || `Status updated to ${newStatus}.`);
        setTimeout(() => {
          setStatusVehicle(null);
          setStatusSuccess("");
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setStatusError(err.response?.data?.message || "Failed to update vehicle status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEditVehicle = async (e) => {
    e.preventDefault();
    if (!editVehicle) return;

    setEditing(true);
    setEditError("");
    setEditSuccess("");

    try {
      const payload = {
        make: editForm.make.trim(),
        model: editForm.model.trim(),
        base_daily_rate: parseFloat(editForm.base_daily_rate),
        vehicle_class: editForm.vehicle_class,
        seats: parseInt(editForm.seats, 10),
        fuel_type: editForm.fuel_type,
        transmission: editForm.transmission,
      };

      const res = await api.put(`/vehicles/${editVehicle.vehicleId}`, payload);
      if (res.data?.success) {
        setEditSuccess("Vehicle specs updated successfully.");
        setTimeout(() => {
          setEditVehicle(null);
          setEditSuccess("");
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update vehicle details.");
    } finally {
      setEditing(false);
    }
  };

  // Filtered list
  const filteredVehicles = vehicles.filter((v) => {
    const matchesHub = selectedHubFilter === "ALL" || v.current_hub_id === selectedHubFilter;
    const matchesClass = selectedClassFilter === "ALL" || v.vehicle_class === selectedClassFilter;
    const matchesStatus = selectedStatusFilter === "ALL" || v.status === selectedStatusFilter;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      v.plate_number?.toLowerCase().includes(query) ||
      v.model?.toLowerCase().includes(query) ||
      v.make?.toLowerCase().includes(query) ||
      v.CurrentHub?.name?.toLowerCase().includes(query) ||
      v.CurrentHub?.city?.toLowerCase().includes(query);

    return matchesHub && matchesClass && matchesStatus && matchesSearch;
  });

  // KPI calculations
  const totalFleetCount = vehicles.length;
  const readyCount = vehicles.filter((v) => v.status === "ACTIVE").length;
  const onTripCount = vehicles.filter((v) => v.status === "IN_USE").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "MAINTENANCE").length;
  const retiredCount = vehicles.filter((v) => v.status === "RETIRED").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Car className="w-4 h-4" />
            <span>Master Fleet Architecture</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Global Fleet Catalog & Inter-Hub Transfers
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Provision enterprise vehicles, monitor fleet deployment across hubs, rebalance inventory, and manage vehicle lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Fleet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setAddError("");
              setAddSuccess("");
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision New Vehicle</span>
          </button>
        </div>
      </div>

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Total Fleet</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalFleetCount}</div>
          <p className="text-[10px] text-neutral-500">Across {hubs.length} active station hubs</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Ready on Lot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{readyCount}</div>
          <p className="text-[10px] text-neutral-500">
            {totalFleetCount > 0 ? Math.round((readyCount / totalFleetCount) * 100) : 0}% available
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>On Road (In-Use)</span>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-blue-400">{onTripCount}</div>
          <p className="text-[10px] text-neutral-500">Live active customer trips</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>In Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{maintenanceCount}</div>
          <p className="text-[10px] text-neutral-500">Bay work order in progress</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Retired Fleet</span>
            <span className="w-2 h-2 rounded-full bg-neutral-600" />
          </div>
          <div className="text-2xl font-black text-neutral-400">{retiredCount}</div>
          <p className="text-[10px] text-neutral-500">Decommissioned vehicles</p>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search make, model, plate, hub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Hub Filter */}
          <div className="relative">
            <select
              value={selectedHubFilter}
              onChange={(e) => setSelectedHubFilter(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-purple-500 cursor-pointer pr-8"
            >
              <option value="ALL">All Station Hubs ({hubs.length})</option>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>
                  {h.name} ({h.city})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-purple-500 cursor-pointer pr-8"
            >
              <option value="ALL">All Vehicle Classes</option>
              <option value="SUV">SUV</option>
              <option value="SEDAN">Sedan</option>
              <option value="HATCHBACK">Hatchback</option>
              <option value="LUXURY">Luxury</option>
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-purple-500 cursor-pointer pr-8"
            >
              <option value="ALL">All Statuses ({totalFleetCount})</option>
              <option value="ACTIVE">Ready on Lot ({readyCount})</option>
              <option value="IN_USE">On Road ({onTripCount})</option>
              <option value="MAINTENANCE">Maintenance Bay ({maintenanceCount})</option>
              <option value="RETIRED">Retired ({retiredCount})</option>
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Active Filter Badges */}
        {(selectedHubFilter !== "ALL" ||
          selectedClassFilter !== "ALL" ||
          selectedStatusFilter !== "ALL" ||
          searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-800 text-[11px] text-neutral-400">
              <span>Filtered by:</span>
              {selectedHubFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Hub: {hubs.find((h) => h.hubId === selectedHubFilter)?.name || selectedHubFilter}
                </span>
              )}
              {selectedClassFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Class: {selectedClassFilter}
                </span>
              )}
              {selectedStatusFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Status: {selectedStatusFilter}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedHubFilter("ALL");
                  setSelectedClassFilter("ALL");
                  setSelectedStatusFilter("ALL");
                  setSearchQuery("");
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer ml-1"
              >
                Reset Filters
              </button>
            </div>
          )}
      </div>

      {/* Fleet Table */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Loading global fleet catalog...</p>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <Car className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No Vehicles Match Your Filter</p>
          <p className="text-xs text-neutral-500">
            Try adjusting your search query, hub, or category filter, or provision a new vehicle.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-neutral-800 bg-neutral-900 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3.5">Vehicle & Class</th>
                <th className="px-4 py-3.5">License Plate</th>
                <th className="px-4 py-3.5">Current Station Hub</th>
                <th className="px-4 py-3.5">Rate / Specs</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Active Assignment</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredVehicles.map((vehicle) => {
                const activeBooking =
                  vehicle.Bookings && vehicle.Bookings.length > 0
                    ? vehicle.Bookings[0]
                    : null;

                return (
                  <tr key={vehicle.vehicleId} className="hover:bg-neutral-800/30 transition-colors">
                    {/* Make & Model */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center text-neutral-400 font-bold flex-shrink-0">
                          {vehicle.gallery_urls && vehicle.gallery_urls.length > 0 ? (
                            <img
                              src={vehicle.gallery_urls[0]}
                              alt={`${vehicle.make} ${vehicle.model}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Car className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {vehicle.vehicle_class || "SEDAN"}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              {vehicle.seats} Seats &bull; {vehicle.fuel_type || "Petrol"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Plate */}
                    <td className="px-4 py-4">
                      <span className="font-mono font-bold text-white px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
                        {vehicle.plate_number}
                      </span>
                    </td>

                    {/* Station Hub */}
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">
                            {vehicle.CurrentHub?.name || "Unassigned Station"}
                          </span>
                          <span className="text-[10px] text-neutral-400 block">
                            {vehicle.CurrentHub?.city || "Unknown City"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Pricing & Transmission */}
                    <td className="px-4 py-4">
                      <div className="font-bold text-white text-sm">
                        ₹{Number(vehicle.base_daily_rate || 0).toLocaleString("en-IN")}
                        <span className="text-[10px] text-neutral-500 font-normal"> /day</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {vehicle.transmission || "Automatic"}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border inline-flex items-center gap-1.5 ${vehicle.status === "ACTIVE"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : vehicle.status === "IN_USE"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : vehicle.status === "MAINTENANCE"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-neutral-800 border-neutral-700 text-neutral-400"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${vehicle.status === "ACTIVE"
                            ? "bg-emerald-400"
                            : vehicle.status === "IN_USE"
                              ? "bg-blue-400 animate-pulse"
                              : vehicle.status === "MAINTENANCE"
                                ? "bg-amber-400"
                                : "bg-neutral-500"
                            }`}
                        />
                        <span>
                          {vehicle.status === "ACTIVE"
                            ? "Ready on Lot"
                            : vehicle.status === "IN_USE"
                              ? "On Road"
                              : vehicle.status === "MAINTENANCE"
                                ? "In Bay"
                                : "Retired"}
                        </span>
                      </span>
                    </td>

                    {/* Active Assignment / Driver */}
                    <td className="px-4 py-4">
                      {activeBooking ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block">
                            {activeBooking.Customer?.name || "Customer"}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono block">
                            {activeBooking.Customer?.phone || activeBooking.Customer?.email}
                          </span>
                          <span className="text-[10px] text-blue-400 font-semibold block">
                            Active Rental
                          </span>
                        </div>
                      ) : vehicle.status === "MAINTENANCE" ? (
                        <div className="text-[11px] text-amber-400 space-y-0.5">
                          <span className="font-semibold block">
                            {vehicle.service_category || "In Maintenance"}
                          </span>
                          {vehicle.mechanic_assigned && (
                            <span className="text-[10px] text-neutral-400 block">
                              Tech: {vehicle.mechanic_assigned}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-[11px]">Parked & Available</span>
                      )}
                    </td>

                    {/* Action Controls */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Transfer Hub button */}
                        <button
                          type="button"
                          onClick={() => {
                            setTransferVehicle(vehicle);
                            setTargetHubId("");
                            setTransferError("");
                            setTransferSuccess("");
                          }}
                          disabled={vehicle.status === "IN_USE"}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${vehicle.status === "IN_USE"
                            ? "bg-neutral-950 text-neutral-600 cursor-not-allowed"
                            : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white"
                            }`}
                          title={
                            vehicle.status === "IN_USE"
                              ? "Cannot transfer while vehicle is currently in an active trip"
                              : "Transfer Vehicle to Another Station Hub"
                          }
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                        </button>

                        {/* Status button */}
                        <button
                          type="button"
                          onClick={() => {
                            setStatusVehicle(vehicle);
                            setNewStatus(vehicle.status);
                            setServiceCategory(vehicle.service_category || "Routine Inspection");
                            setServiceNotes(vehicle.service_notes || "");
                            setMechanicAssigned(vehicle.mechanic_assigned || "");
                            setEstimatedReadyDate(
                              vehicle.estimated_ready_date
                                ? new Date(vehicle.estimated_ready_date).toISOString().slice(0, 10)
                                : ""
                            );
                            setStatusError("");
                            setStatusSuccess("");
                          }}
                          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all cursor-pointer"
                          title="Change Status / Service Bay"
                        >
                          <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        {/* Photo Gallery button */}
                        <button
                          type="button"
                          onClick={() => {
                            setGalleryVehicle(vehicle);
                            setNewGalleryFiles([]);
                            setGalleryError("");
                            setGallerySuccess("");
                          }}
                          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all cursor-pointer"
                          title={`Manage Vehicle Photos (${vehicle.gallery_urls?.length || 0})`}
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {/* Edit details button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditVehicle(vehicle);
                            setEditForm({
                              make: vehicle.make,
                              model: vehicle.model,
                              base_daily_rate: vehicle.base_daily_rate,
                              vehicle_class: vehicle.vehicle_class || "SUV",
                              seats: vehicle.seats || 5,
                              fuel_type: vehicle.fuel_type || "Petrol",
                              transmission: vehicle.transmission || "Automatic",
                            });
                            setEditError("");
                            setEditSuccess("");
                          }}
                          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all cursor-pointer"
                          title="Edit Vehicle Specs & Rate"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-neutral-300" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD VEHICLE TO ENTERPRISE FLEET                                  */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Provision New Vehicle into Fleet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Make (Brand) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata, Mahindra, Hyundai"
                    value={addForm.make}
                    onChange={(e) => setAddForm({ ...addForm, make: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nexon EV Max, Scorpio-N"
                    value={addForm.model}
                    onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">License Plate *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RJ-14-AB-1234"
                    value={addForm.plate_number}
                    onChange={(e) => setAddForm({ ...addForm, plate_number: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Vehicle Class *</label>
                  <select
                    value={addForm.vehicle_class}
                    onChange={(e) => setAddForm({ ...addForm, vehicle_class: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="SUV">SUV</option>
                    <option value="SEDAN">Sedan</option>
                    <option value="HATCHBACK">Hatchback</option>
                    <option value="LUXURY">Luxury</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Base Daily Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="500"
                    placeholder="e.g. 3500"
                    value={addForm.base_daily_rate}
                    onChange={(e) => setAddForm({ ...addForm, base_daily_rate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Station Hub Allocation *</label>
                  <select
                    required
                    value={addForm.current_hub_id}
                    onChange={(e) => setAddForm({ ...addForm, current_hub_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="">-- Choose Station Hub --</option>
                    {hubs.map((hub) => (
                      <option key={hub.hubId} value={hub.hubId}>
                        {hub.name} ({hub.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Seating Capacity</label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={addForm.seats}
                    onChange={(e) => setAddForm({ ...addForm, seats: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Fuel Type</label>
                  <select
                    value={addForm.fuel_type}
                    onChange={(e) => setAddForm({ ...addForm, fuel_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="EV">Electric (EV)</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Transmission</label>
                  <select
                    value={addForm.transmission}
                    onChange={(e) => setAddForm({ ...addForm, transmission: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
              </div>

              {/* Photo Upload Zone */}
              <div className="space-y-1.5 pt-1">
                <label className="text-neutral-300 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    Vehicle Gallery Photos (Up to 5 images)
                  </span>
                  <span className="text-[10px] text-neutral-500 font-normal">Optional</span>
                </label>
                <div className="border border-dashed border-neutral-700 hover:border-purple-500/60 transition-colors rounded-2xl p-3 text-center bg-neutral-950/60 cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(0, 5);
                      setVehicleImages(files);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 text-neutral-400">
                    <Upload className="w-5 h-5 text-neutral-500" />
                    <p className="text-[11px] font-medium text-neutral-300">
                      {vehicleImages.length > 0
                        ? `${vehicleImages.length} image(s) selected for upload`
                        : "Click or drag vehicle photos here"}
                    </p>
                    <p className="text-[10px] text-neutral-500">PNG, JPG, WebP up to 5MB each (Max 5 photos)</p>
                  </div>
                </div>

                {vehicleImages.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                    {vehicleImages.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative w-14 h-12 rounded-lg overflow-hidden border border-neutral-700 flex-shrink-0 group"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`preview ${idx}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setVehicleImages(vehicleImages.filter((_, i) => i !== idx))
                          }
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {addSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {addSuccess}
                </div>
              )}

              {addError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {addError}
                </div>
              )}

              <button
                type="submit"
                disabled={adding}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer mt-2"
              >
                {adding ? "Provisioning Vehicle..." : "Add Vehicle to Master Fleet"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INTER-HUB DEADHEADING VEHICLE TRANSFER                           */}
      {/* ========================================================================= */}
      {transferVehicle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Inter-Hub Vehicle Relocation</h3>
              </div>
              <button
                type="button"
                onClick={() => setTransferVehicle(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    {transferVehicle.make} {transferVehicle.model}
                  </span>
                  <span className="font-mono text-purple-300 font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-[11px]">
                    {transferVehicle.plate_number}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                  <span>Origin Station:</span>
                  <strong className="text-neutral-200">
                    {transferVehicle.CurrentHub?.name || "Unassigned"} (
                    {transferVehicle.CurrentHub?.city})
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">
                  Select Target Destination Hub *
                </label>
                <select
                  required
                  value={targetHubId}
                  onChange={(e) => setTargetHubId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="">-- Choose Destination Station Hub --</option>
                  {hubs
                    .filter((h) => h.hubId !== transferVehicle.current_hub_id)
                    .map((hub) => (
                      <option key={hub.hubId} value={hub.hubId}>
                        {hub.name} ({hub.city}) &bull; {hub.capacity} Bays
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-[11px] text-purple-300">
                Deadheading rebalance moves this vehicle&apos;s lot bay allocation and makes it
                available for dispatch at the destination station immediately.
              </div>

              {transferSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {transferSuccess}
                </div>
              )}

              {transferError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {transferError}
                </div>
              )}

              <button
                type="submit"
                disabled={transferring || !targetHubId}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {transferring ? "Transferring Fleet..." : "Confirm Inter-Hub Relocation"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: STATUS / MAINTENANCE WORK ORDER                                  */}
      {/* ========================================================================= */}
      {statusVehicle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Vehicle Status & Maintenance</h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusVehicle(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="font-bold text-white">
                  {statusVehicle.make} {statusVehicle.model} ({statusVehicle.plate_number})
                </span>
                <span className="text-[11px] text-neutral-400 block">
                  Current Status:{" "}
                  <strong className="text-purple-400">{statusVehicle.status}</strong>
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold block">Set New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE (Ready on Lot for Booking)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Bay Servicing / Work Order)</option>
                  <option value="RETIRED">RETIRED (Decommissioned from Active Operations)</option>
                </select>
              </div>

              {/* Maintenance fields if selected */}
              {newStatus === "MAINTENANCE" && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-semibold block">Service Category</label>
                    <input
                      type="text"
                      value={serviceCategory}
                      onChange={(e) => setServiceCategory(e.target.value)}
                      placeholder="e.g. Brake Overhaul, Scheduled 10K Service"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-semibold block">
                      Assigned Mechanic / Vendor
                    </label>
                    <input
                      type="text"
                      value={mechanicAssigned}
                      onChange={(e) => setMechanicAssigned(e.target.value)}
                      placeholder="e.g. FastTrack Auto Services"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-semibold block">
                      Estimated Completion Date
                    </label>
                    <input
                      type="date"
                      value={estimatedReadyDate}
                      onChange={(e) => setEstimatedReadyDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-semibold block">
                      Work Order Notes
                    </label>
                    <textarea
                      rows={2}
                      value={serviceNotes}
                      onChange={(e) => setServiceNotes(e.target.value)}
                      placeholder="Details on defect or repair requirements..."
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white"
                    />
                  </div>
                </div>
              )}

              {statusSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {statusSuccess}
                </div>
              )}

              {statusError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {statusError}
                </div>
              )}

              <button
                type="submit"
                disabled={updatingStatus}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
              >
                {updatingStatus ? "Saving Status..." : "Update Vehicle Status"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT VEHICLE SPECS & DAILY RATE                                  */}
      {/* ========================================================================= */}
      {editVehicle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Edit Vehicle Specs & Pricing</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditVehicle(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditVehicle} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">
                    {editVehicle.make} {editVehicle.model}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Station: {editVehicle.CurrentHub?.name || "Unassigned"}
                  </span>
                </div>
                <span className="font-mono font-bold text-purple-300 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                  {editVehicle.plate_number}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Base Daily Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editForm.base_daily_rate}
                    onChange={(e) => setEditForm({ ...editForm, base_daily_rate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Vehicle Class</label>
                  <select
                    value={editForm.vehicle_class}
                    onChange={(e) => setEditForm({ ...editForm, vehicle_class: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="SUV">SUV</option>
                    <option value="SEDAN">Sedan</option>
                    <option value="HATCHBACK">Hatchback</option>
                    <option value="LUXURY">Luxury</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Seats</label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={editForm.seats}
                    onChange={(e) => setEditForm({ ...editForm, seats: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Fuel Type</label>
                  <select
                    value={editForm.fuel_type}
                    onChange={(e) => setEditForm({ ...editForm, fuel_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="EV">Electric (EV)</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Transmission</label>
                  <select
                    value={editForm.transmission}
                    onChange={(e) => setEditForm({ ...editForm, transmission: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
              </div>

              {editSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {editSuccess}
                </div>
              )}

              {editError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {editError}
                </div>
              )}

              <button
                type="submit"
                disabled={editing}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
              >
                {editing ? "Saving Changes..." : "Save Vehicle Modifications"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: VEHICLE GALLERY MANAGEMENT                                      */}
      {/* ========================================================================= */}
      {galleryVehicle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {galleryVehicle.make} {galleryVehicle.model} Photos
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {galleryVehicle.plate_number} &bull; {galleryVehicle.gallery_urls?.length || 0} image(s) on file
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGalleryVehicle(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Images Grid */}
            <div className="space-y-2">
              <label className="text-neutral-300 font-semibold text-xs block">
                Current Vehicle Photos
              </label>
              {galleryVehicle.gallery_urls && galleryVehicle.gallery_urls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {galleryVehicle.gallery_urls.map((url, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden border border-neutral-800 group aspect-video bg-neutral-950"
                    >
                      <img
                        src={url}
                        alt={`${galleryVehicle.model} ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(url)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-950/80 border border-red-800/80 text-red-300 hover:bg-red-900 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove photo from vehicle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-purple-300">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-500">
                  No photos uploaded for this vehicle yet.
                </div>
              )}
            </div>

            {/* Upload Additional Images Form */}
            <form onSubmit={handleUploadNewGallery} className="space-y-3 pt-2 border-t border-neutral-800">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold text-xs block">
                  Add More Photos
                </label>
                <div className="border border-dashed border-neutral-700 hover:border-blue-500/60 transition-colors rounded-2xl p-3 text-center bg-neutral-950/60 cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(0, 5);
                      setNewGalleryFiles(files);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 text-neutral-400">
                    <Upload className="w-5 h-5 text-blue-400" />
                    <p className="text-[11px] font-medium text-neutral-300">
                      {newGalleryFiles.length > 0
                        ? `${newGalleryFiles.length} new photo(s) selected`
                        : "Click to select additional photos"}
                    </p>
                    <p className="text-[10px] text-neutral-500">Auto-compressed and uploaded to Cloudinary</p>
                  </div>
                </div>
              </div>

              {gallerySuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {gallerySuccess}
                </div>
              )}

              {galleryError && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {galleryError}
                </div>
              )}

              <button
                type="submit"
                disabled={uploadingGallery || newGalleryFiles.length === 0}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {uploadingGallery ? "Uploading Photos to Cloudinary..." : "Upload Selected Photos"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
