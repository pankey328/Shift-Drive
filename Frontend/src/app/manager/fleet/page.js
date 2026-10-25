"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import Pagination from "@/components/Pagination";
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
  Image as ImageIcon,
  Trash2,
  ArrowUpDown,
  Search,
  Gauge,
  TrendingUp,
  Zap,
  Sparkles,
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

  // Pagination, Sorting & Backend Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 6,
  });
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    active: 0,
    in_use: 0,
    maintenance: 0,
  });

  // Vehicle Class & Spec Filter State
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    suv: 0,
    sedan: 0,
    hatchback: 0,
    luxury: 0,
    ev: 0,
  });

  // Lot Capacity & Bay Utilization Gauge State
  const [lotMetrics, setLotMetrics] = useState({
    capacity: 20,
    occupiedBays: 0,
    freeBays: 20,
    occupancyPercentage: 0,
    dailyRevenuePotential: 0,
  });

  // Vehicle Gallery Modal State (View-Only for Hub Managers)
  const [galleryVehicle, setGalleryVehicle] = useState(null);

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
    immediate_transit: false,
  });
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Maintenance Bay Service Modal State
  const [serviceModalCar, setServiceModalCar] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    service_category: "PERIODIC_SERVICE",
    service_notes: "",
    estimated_ready_date: "",
    mechanic_assigned: "",
  });
  const [submittingService, setSubmittingService] = useState(false);

  // Debounce search query to reduce backend calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [fleetFilter, categoryFilter, selectedHubId, sortBy, sortOrder]);


  // Resolve Station Hub
  const resolveStationHub = useCallback(async () => {
    try {
      const res = await api.get("/hubs");
      if (res.data?.success) {
        const hubs = res.data.data || [];
        setAllHubsList(hubs);

        let target = null;
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

        if (target) {
          setCurrentHub(target);
          setSelectedHubId(target.hubId);
        }
      }
    } catch (err) {
      console.error("Failed to load hubs:", err);
    }
  }, [user]);

  // Fetch Station Fleet Vehicles with Backend Searching, Sorting, Filtering & Pagination
  const fetchStationFleet = useCallback(async () => {
    if (!selectedHubId) return;
    setLoadingFleet(true);
    try {
      const params = {
        status: fleetFilter !== "ALL" ? fleetFilter : undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        search: debouncedSearch.trim() || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: pageSize,
      };
      const res = await api.get(`/vehicles/hub/${selectedHubId}`, { params });
      if (res.data?.success) {
        setLotVehicles(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
        if (res.data.counts) {
          setStatusCounts(res.data.counts);
        }
        if (res.data.categoryCounts) {
          setCategoryCounts(res.data.categoryCounts);
        }
        if (res.data.lotMetrics) {
          setLotMetrics(res.data.lotMetrics);
        }
      }
    } catch (err) {
      console.error("Failed to load station fleet:", err);
    } finally {
      setLoadingFleet(false);
    }
  }, [selectedHubId, fleetFilter, categoryFilter, debouncedSearch, sortBy, sortOrder, currentPage, pageSize]);

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
        fetchStationFleet();
        alert("Transfer order dispatched successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to initiate transfer.");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleUpdateVehicleStatus = async (vehicleId, newStatus, serviceData = {}) => {
    setUpdatingVehicleId(vehicleId);
    try {
      const res = await api.patch(`/vehicles/${vehicleId}/status`, {
        status: newStatus,
        ...serviceData,
      });
      if (res.data?.success) {
        await fetchStationFleet();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update vehicle status.");
    } finally {
      setUpdatingVehicleId(null);
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceModalCar) return;
    setSubmittingService(true);
    try {
      await handleUpdateVehicleStatus(serviceModalCar.vehicleId, "MAINTENANCE", {
        service_category: serviceForm.service_category,
        service_notes: serviceForm.service_notes,
        estimated_ready_date: serviceForm.estimated_ready_date || null,
        mechanic_assigned: serviceForm.mechanic_assigned || null,
      });
      setServiceModalCar(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingService(false);
    }
  };

  const handleTriggerEmergencyHold = async (bookingId, notes) => {
    try {
      const res = await api.post(`/bookings/${bookingId}/emergency`, { notes });
      if (res.data?.success) {
        alert("Trip successfully placed on Emergency Hold. Late fees frozen and roadside incident logged on Action Desk.");
        setSelectedTripDossier(null);
        await fetchStationFleet();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to place booking on Emergency Hold.");
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

  const totalItems = pagination.totalItems || lotVehicles.length;
  const totalPages = pagination.totalPages || 1;
  const paginatedVehicles = lotVehicles;


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
        </div>
      </div>

      {/* LOT CAPACITY & BAY UTILIZATION GAUGE HEADER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Lot Capacity & Bay Utilization Gauge */}
        <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Lot Bay Occupancy
              </span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                lotMetrics.occupancyPercentage >= 90
                  ? "bg-red-950/60 border-red-800 text-red-400"
                  : lotMetrics.occupancyPercentage >= 75
                  ? "bg-amber-950/60 border-amber-800 text-amber-400"
                  : "bg-emerald-950/60 border-emerald-800 text-emerald-400"
              }`}
            >
              {lotMetrics.occupancyPercentage}% Utilized
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-white">
                {lotMetrics.occupiedBays} of {lotMetrics.capacity} Bays Occupied
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                {lotMetrics.freeBays} Open
              </span>
            </div>
            {/* Live Utilization Meter Bar */}
            <div className="w-full h-2.5 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  lotMetrics.occupancyPercentage >= 90
                    ? "bg-red-500"
                    : lotMetrics.occupancyPercentage >= 75
                    ? "bg-amber-400"
                    : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(lotMetrics.occupiedBays > 0 ? 6 : 0, lotMetrics.occupancyPercentage))}%`,
                }}
              />
            </div>
          </div>
          <span className="text-[11px] text-neutral-500 block">
            {lotMetrics.occupiedBays} vehicles currently on lot ({statusCounts.active || 0} ready, {statusCounts.maintenance || 0} in bay).
          </span>
        </div>

        {/* Total Daily Revenue Potential */}
        <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Daily Revenue Potential
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
              100% Station Fleet
            </span>
          </div>

          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono block">
              ₹{lotMetrics.dailyRevenuePotential.toLocaleString("en-IN")}
              <span className="text-xs text-neutral-400 font-sans font-normal ml-1">/ day</span>
            </span>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Gross daily tariff potential across all {statusCounts.all || lotVehicles.length} assigned station vehicles.
            </span>
          </div>
        </div>

        {/* Ready Dispatch & Turnaround Ratio */}
        <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Dispatch Readiness
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded-full">
              Live Fleet Status
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-base font-bold text-emerald-400 block font-mono">
                {statusCounts.active || 0}
              </span>
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Ready To Rent</span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-base font-bold text-blue-400 block font-mono">
                {statusCounts.in_use || 0}
              </span>
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Active Trips</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Vehicle Class / Spec Selector */}
      <div className="space-y-3">
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          {[
            { label: `All Statuses (${statusCounts.all ?? lotVehicles.length})`, value: "ALL" },
            { label: `Ready on Lot (${statusCounts.active ?? 0})`, value: "ACTIVE" },
            { label: `In-Use on Road (${statusCounts.in_use ?? 0})`, value: "IN_USE" },
            { label: `Maintenance / Bay (${statusCounts.maintenance ?? 0})`, value: "MAINTENANCE" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFleetFilter(tab.value)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                fleetFilter === tab.value
                  ? "bg-white text-black font-bold shadow-md"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Vehicle Class & Spec Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mr-1 flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Class:
          </span>
          {[
            { label: "All Specs", value: "ALL", count: categoryCounts.all },
            { label: "SUV", value: "SUV", count: categoryCounts.suv },
            { label: "Sedan", value: "SEDAN", count: categoryCounts.sedan },
            { label: "Hatchback", value: "HATCHBACK", count: categoryCounts.hatchback },
            { label: "EV (Electric)", value: "EV", count: categoryCounts.ev },
            { label: "Luxury", value: "LUXURY", count: categoryCounts.luxury },
          ].map((spec) => (
            <button
              key={spec.value}
              type="button"
              onClick={() => setCategoryFilter(spec.value)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === spec.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <span>{spec.label}</span>
              {spec.count !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    categoryFilter === spec.value
                      ? "bg-blue-700 text-white"
                      : "bg-neutral-900 text-neutral-500"
                  }`}
                >
                  {spec.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar, Sorting & Counter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search make, model, or plate..."
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

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortBy(field);
                setSortOrder(order);
                setCurrentPage(1);
              }}
              className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="createdAt-DESC">Newest Added First</option>
              <option value="createdAt-ASC">Oldest Added First</option>
              <option value="base_daily_rate-ASC">Daily Rate: Low to High</option>
              <option value="base_daily_rate-DESC">Daily Rate: High to Low</option>
              <option value="make-ASC">Make / Model (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-between md:justify-end">
          <span className="text-xs text-neutral-400 font-medium">
            Showing <strong className="text-white">{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>-
            <strong className="text-white">{Math.min(currentPage * pageSize, totalItems)}</strong> of{" "}
            <strong className="text-white">{totalItems}</strong> vehicle(s)
          </span>
        </div>
      </div>

      {/* Fleet Inventory Content */}
      {loadingFleet ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400" />
          <p>Scanning physical station lot inventory...</p>
        </div>
      ) : lotVehicles.length === 0 ? (
        <div className="py-20 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-3 p-6">
          <Car className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No Vehicles In This Category</p>
          <p className="text-xs text-neutral-500">
            {searchQuery
              ? `No station vehicles matched "${searchQuery}".`
              : "Lot inventory is clear for this filter."}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer"
            >
              Clear Search Query
            </button>
          )}
        </div>
      ) : (
        /* GRID CARDS VIEW WITH CAR PHOTO BANNER */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedVehicles.map((car) => (
            <div
              key={car.vehicleId}
              className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col justify-between shadow-sm hover:border-neutral-700 transition-all"
            >
              <div>
                {/* Car Photo Banner */}
                <div className="relative w-full h-44 bg-neutral-950 border-b border-neutral-800 overflow-hidden group">
                  {car.gallery_urls && car.gallery_urls.length > 0 ? (
                    <img
                      src={car.gallery_urls[0]}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-1.5">
                      <Car className="w-10 h-10 text-neutral-700" />
                      <span className="text-[11px] font-medium text-neutral-500">No Image Uploaded</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white border border-white/10">
                      {car.vehicle_class || "STANDARD"}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-sm ${
                        car.status === "ACTIVE"
                          ? "bg-emerald-950/80 border border-emerald-600 text-emerald-300"
                          : car.status === "IN_USE"
                          ? "bg-blue-950/80 border border-blue-600 text-blue-300"
                          : "bg-amber-950/80 border border-amber-600 text-amber-300"
                      }`}
                    >
                      {car.status === "ACTIVE" ? "READY ON LOT" : car.status}
                    </span>
                  </div>

                  {/* Bottom Photo Management Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setGalleryVehicle(car);
                      setNewGalleryFiles([]);
                      setGalleryError("");
                      setGallerySuccess("");
                    }}
                    className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-neutral-700 hover:border-blue-400 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all opacity-90 hover:opacity-100 cursor-pointer"
                    title="Manage vehicle photos"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{car.gallery_urls?.length || 0} Photos</span>
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {car.make} {car.model}
                      </h4>
                      <span className="font-mono text-xs font-semibold text-neutral-400">
                        {car.plate_number}
                      </span>
                    </div>
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
              </div>

              {/* Card Footer Actions */}
              <div className="p-5 pt-0">
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
                        setServiceModalCar(car);
                        setServiceForm({
                          service_category: "PERIODIC_SERVICE",
                          service_notes: "",
                          estimated_ready_date: "",
                          mechanic_assigned: "",
                        });
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
                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                          <Wrench className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span>Maintenance Bay Order</span>
                        </div>
                        {car.service_category && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            {car.service_category.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      {(car.mechanic_assigned || car.estimated_ready_date) && (
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-amber-800/20">
                          <div>
                            <span className="text-neutral-500 block text-[10px]">Assigned Tech</span>
                            <span className="text-neutral-200 font-medium">{car.mechanic_assigned || "Station Tech"}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[10px]">Est. Ready</span>
                            <span className="text-neutral-200 font-medium">
                              {car.estimated_ready_date
                                ? new Date(car.estimated_ready_date).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Standard Turnaround"}
                            </span>
                          </div>
                        </div>
                      )}

                      {car.service_notes && (
                        <p className="text-[11px] text-neutral-400 bg-neutral-950/80 p-2 rounded-xl border border-neutral-800 italic">
                          &ldquo;{car.service_notes}&rdquo;
                        </p>
                      )}
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
                    {car.Bookings?.[0]?.status === "EMERGENCY_HOLD" ? (
                      <div
                        onClick={() => setSelectedTripDossier({ car, trip: car.Bookings?.[0] })}
                        className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/80 cursor-pointer hover:bg-red-900/30 transition-all space-y-2 group shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                            <span>ROADSIDE SOS ACTIVE</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                            HOLD IN PROGRESS
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white">
                          <span className="font-semibold">{car.Bookings?.[0]?.Customer?.name || "Active Renter"}</span>
                          <span className="font-mono text-neutral-300 text-[11px]">{car.Bookings?.[0]?.Customer?.phone}</span>
                        </div>
                        {car.Bookings?.[0]?.incident_notes && (
                          <p className="text-[11px] text-red-200/90 italic bg-red-950/60 p-1.5 rounded-lg border border-red-900/50 line-clamp-2">
                            &ldquo;{car.Bookings[0].incident_notes}&rdquo;
                          </p>
                        )}
                        <div className="pt-0.5 flex items-center justify-between text-[10px] text-red-400 font-bold group-hover:text-red-300">
                          <span>Penalties Frozen</span>
                          <span className="underline">View & Resolve SOS &rarr;</span>
                        </div>
                      </div>
                    ) : (
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
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedTripDossier({ car, trip: car.Bookings?.[0] })}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg ${
                        car.Bookings?.[0]?.status === "EMERGENCY_HOLD"
                          ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20"
                          : "bg-blue-600/90 hover:bg-blue-500 text-white shadow-blue-600/20"
                      }`}
                    >
                      {car.Bookings?.[0]?.status === "EMERGENCY_HOLD" ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Manage Active Roadside Emergency</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Driver & Trip Details</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loadingFleet && lotVehicles.length > 0 && (
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            limit={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onLimitChange={(newLimit) => {
              setPageSize(newLimit);
              setCurrentPage(1);
            }}
            pageSizeOptions={[6, 9, 12, 24]}
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

            {/* Target Vehicle Preview */}
            {(() => {
              const targetCar = lotVehicles.find((v) => v.vehicleId === transferForm.vehicle_id);
              if (!targetCar) return null;
              return (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="w-14 h-10 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {targetCar.gallery_urls && targetCar.gallery_urls.length > 0 ? (
                      <img
                        src={targetCar.gallery_urls[0]}
                        alt={targetCar.model}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Car className="w-4 h-4 text-neutral-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white text-xs block truncate">
                      {targetCar.make} {targetCar.model}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400">
                      Plate: {targetCar.plate_number}
                    </span>
                  </div>
                </div>
              );
            })()}

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

      {/* ACTIVE RIDE & DRIVER DOSSIER MODAL */}
      {selectedTripDossier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  selectedTripDossier.trip?.status === "EMERGENCY_HOLD"
                    ? "bg-red-500/10 border border-red-500/30 text-red-400"
                    : "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                }`}>
                  {selectedTripDossier.trip?.status === "EMERGENCY_HOLD" ? (
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedTripDossier.trip?.status === "EMERGENCY_HOLD"
                      ? "Roadside SOS Trip Dossier"
                      : "Active Driver & Ride Dossier"}
                  </h3>
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
                {/* Emergency Hold Banner inside Dossier */}
                {selectedTripDossier.trip.status === "EMERGENCY_HOLD" && (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-bold text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                        <span>Roadside Emergency Hold Active</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 border border-red-800 text-red-400">
                        PENALTIES FROZEN
                      </span>
                    </div>
                    {selectedTripDossier.trip.incident_notes && (
                      <p className="text-[11px] text-red-200 bg-red-950/70 p-2.5 rounded-xl border border-red-900/50">
                        <strong>Reported Incident:</strong> &ldquo;{selectedTripDossier.trip.incident_notes}&rdquo;
                      </p>
                    )}
                  </div>
                )}

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
                      <span className="text-[10px] text-neutral-500 font-semibold block mb-0.5">Desk / Incident Notes:</span>
                      <p>{selectedTripDossier.trip.incident_notes}</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <a
                    href={`tel:${selectedTripDossier.trip.Customer?.phone}`}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Driver Directly</span>
                  </a>

                  {selectedTripDossier.trip.status === "EMERGENCY_HOLD" ? (
                    <a
                      href="/manager"
                      className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Resolve SOS on Action Desk</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const notes = prompt(
                          `Enter Roadside Emergency / Breakdown Notes for ${selectedTripDossier.car?.make} ${selectedTripDossier.car?.model} (Driver: ${selectedTripDossier.trip.Customer?.name}):`,
                          "Driver reported breakdown over phone. Roadside assistance dispatched."
                        );
                        if (notes !== null) {
                          handleTriggerEmergencyHold(selectedTripDossier.trip.bookingId, notes);
                        }
                      }}
                      className="py-3 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>Flag Emergency Hold</span>
                    </button>
                  )}

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

      {/* MAINTENANCE BAY WORK ORDER MODAL */}
      {serviceModalCar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Service Work Order</h3>
                  <p className="text-xs text-neutral-400">
                    {serviceModalCar.make} {serviceModalCar.model} &bull;{" "}
                    <span className="font-mono text-neutral-200">{serviceModalCar.plate_number}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setServiceModalCar(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleServiceSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Service Category *</label>
                <select
                  value={serviceForm.service_category}
                  onChange={(e) => setServiceForm({ ...serviceForm, service_category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="PERIODIC_SERVICE">Periodic Maintenance / Oil & Filter</option>
                  <option value="TIRE_PUNCTURE_WEAR">Tire Puncture / Alignment / Wear</option>
                  <option value="BODY_DENT_PAINT">Bodywork, Dent Repair & Touchup Paint</option>
                  <option value="DETAILING_DEEP_CLEAN">Deep Detailing & Sanitization Wash</option>
                  <option value="BRAKES_MECHANICAL">Brakes, Suspension & Steering</option>
                  <option value="ENGINE_ELECTRICAL">Engine, Battery & Electrical Systems</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Assigned Mechanic / Station Bay</label>
                <input
                  type="text"
                  value={serviceForm.mechanic_assigned}
                  onChange={(e) => setServiceForm({ ...serviceForm, mechanic_assigned: e.target.value })}
                  placeholder="e.g. Suresh (Bay 2)"
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Estimated Completion Date & Time</label>
                <input
                  type="datetime-local"
                  value={serviceForm.estimated_ready_date}
                  onChange={(e) => setServiceForm({ ...serviceForm, estimated_ready_date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Inspection / Work Order Notes</label>
                <textarea
                  rows={3}
                  value={serviceForm.service_notes}
                  onChange={(e) => setServiceForm({ ...serviceForm, service_notes: e.target.value })}
                  placeholder="Specify reason for service, replacement parts required, or customer drop-off report..."
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setServiceModalCar(null)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingService}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingService ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Moving to Bay...</span>
                    </>
                  ) : (
                    <>
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Dispatch to Maintenance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VEHICLE GALLERY PREVIEW (VIEW-ONLY FOR HUB MANAGERS)               */}
      {/* ========================================================================= */}
      {galleryVehicle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-semibold text-xs block">
                  Station Vehicle Photo Gallery
                </label>
                <span className="text-[10px] text-neutral-500 font-medium">
                  Official Superadmin Catalog Photos
                </span>
              </div>

              {galleryVehicle.gallery_urls && galleryVehicle.gallery_urls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  {galleryVehicle.gallery_urls.map((url, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden border border-neutral-800 aspect-video bg-neutral-950 group"
                    >
                      <img
                        src={url}
                        alt={`${galleryVehicle.model} ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-bold text-blue-300 border border-blue-400/30">
                          Primary Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
                  <Car className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="text-xs text-neutral-400 font-semibold">No catalog photos on file</p>
                  <p className="text-[10px] text-neutral-600">
                    Fleet photos are managed centrally by Corporate Superadmin.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setGalleryVehicle(null)}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
