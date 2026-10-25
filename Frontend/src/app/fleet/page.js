"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/api";
import Pagination from "@/components/Pagination";
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Fuel,
  Users,
  Search,
  SlidersHorizontal,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Crosshair,
  Loader2,
  Navigation,
} from "lucide-react";

function FleetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Query Parameters
  const paramPickupHub = searchParams.get("pickupHubId") || "";
  const paramDropoffHub = searchParams.get("dropoffHubId") || "";
  const paramStartTime = searchParams.get("startTime") || "";
  const paramEndTime = searchParams.get("endTime") || "";
  const paramCategory = searchParams.get("category") || "ALL";
  const highlightedVehicleId = searchParams.get("vehicleId") || "";

  // Hubs State
  const [hubs, setHubs] = useState([]);
  const [loadingHubs, setLoadingHubs] = useState(true);

  // Search Filter Bar Form
  const [pickupHubId, setPickupHubId] = useState(paramPickupHub);
  const [dropoffHubId, setDropoffHubId] = useState(paramDropoffHub);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("18:00");

  // Filtering & Sorting
  const [selectedCategory, setSelectedCategory] = useState(paramCategory);
  const [selectedFuel, setSelectedFuel] = useState("ALL");
  const [selectedTransmission, setSelectedTransmission] = useState("ALL");
  const [sortBy, setSortBy] = useState("RECOMMENDED");
  const [searchQuery, setSearchQuery] = useState("");

  // Data & Loading States
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [searchError, setSearchError] = useState("");

  // Parse default or URL dates
  useEffect(() => {
    if (paramStartTime) {
      const [pDate, pTime] = paramStartTime.split("T");
      if (pDate) setPickupDate(pDate);
      if (pTime) setPickupTime(pTime.slice(0, 5));
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPickupDate(tomorrow.toISOString().split("T")[0]);
    }

    if (paramEndTime) {
      const [dDate, dTime] = paramEndTime.split("T");
      if (dDate) setDropoffDate(dDate);
      if (dTime) setDropoffTime(dTime.slice(0, 5));
    } else {
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 3);
      setDropoffDate(dayAfter.toISOString().split("T")[0]);
    }
  }, [paramStartTime, paramEndTime]);

  // Location & Proximity State
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState("");

  const detectNearestHubs = (showError = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      if (showError)
        setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingUser(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        try {
          const res = await api.get(`/hubs?lat=${latitude}&lng=${longitude}`);
          if (res.data?.data && Array.isArray(res.data.data)) {
            setHubs(res.data.data);
            if (!paramPickupHub && res.data.data.length > 0) {
              const nearestHubId = res.data.data[0].hubId;
              setPickupHubId(nearestHubId);
              setDropoffHubId(nearestHubId);
              // Auto-trigger search for nearest hub if dates available
              const sDate =
                pickupDate || new Date().toISOString().split("T")[0];
              const sTime = `${sDate}T${pickupTime || "10:00"}:00`;
              const dDate =
                dropoffDate || new Date().toISOString().split("T")[0];
              const eTime = `${dDate}T${dropoffTime || "18:00"}:00`;
              fetchFleet(nearestHubId, sTime, eTime);
            }
          }
        } catch (err) {
          console.error("Proximity hubs fetch error:", err);
        } finally {
          setLocatingUser(false);
        }
      },
      (err) => {
        if (showError) {
          setLocationError(
            "Location permission denied. Showing all standard hubs.",
          );
        }
        setLocatingUser(false);
      },
      { timeout: 7000 },
    );
  };

  // Fetch active hubs
  useEffect(() => {
    const fetchHubs = async () => {
      try {
        const res = await api.get("/hubs");
        if (res.data?.data && Array.isArray(res.data.data)) {
          setHubs(res.data.data);
          if (!pickupHubId && !paramPickupHub && res.data.data.length > 0) {
            setPickupHubId(res.data.data[0].hubId);
            setDropoffHubId(res.data.data[0].hubId);
          }
        }
      } catch (err) {
        console.warn("Could not load hubs:", err.message);
      } finally {
        setLoadingHubs(false);
      }
    };

    fetchHubs();
    if (!paramPickupHub) {
      detectNearestHubs(false);
    }
  }, []);

  // Fetch vehicles based on search criteria
  const fetchFleet = async (hubId, sTime, eTime) => {
    setLoadingVehicles(true);
    setSearchError("");

    try {
      if (hubId && sTime && eTime) {
        // Search available fleet for station & duration with 2-hr safety buffer
        const res = await api.get(`/vehicles/hub/${hubId}/search`, {
          params: { startTime: sTime, endTime: eTime },
        });

        if (res.data?.data) {
          setVehicles(res.data.data);
        }
      } else {
        // fetch general active fleet
        const res = await api.get("/vehicles");
        if (res.data?.data) {
          setVehicles(res.data.data);
        }
      }
    } catch (err) {
      console.warn("Search fleet error:", err.response?.data || err.message);
      setSearchError(
        err.response?.data?.message ||
          "Could not check vehicle availability for the selected station and time.",
      );
      // fetch all active vehicles
      try {
        const fallbackRes = await api.get("/vehicles");
        if (fallbackRes.data?.data) {
          setVehicles(fallbackRes.data.data);
        }
      } catch (e) {
        setVehicles([]);
      }
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    const sTime =
      pickupDate && pickupTime ? `${pickupDate}T${pickupTime}:00` : "";
    const eTime =
      dropoffDate && dropoffTime ? `${dropoffDate}T${dropoffTime}:00` : "";

    fetchFleet(pickupHubId || paramPickupHub, sTime, eTime);
  }, [pickupHubId, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  // Handle Search Bar submission
  const handleUpdateSearch = (e) => {
    e.preventDefault();
    setSearchError("");

    if (!pickupHubId) {
      setSearchError("Please select a pickup hub.");
      return;
    }

    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      setSearchError("Please specify all pickup and dropoff dates and times.");
      return;
    }

    const startDateTime = `${pickupDate}T${pickupTime}:00`;
    const endDateTime = `${dropoffDate}T${dropoffTime}:00`;

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setSearchError("Dropoff time must be strictly after pickup time.");
      return;
    }

    const params = new URLSearchParams({
      pickupHubId,
      dropoffHubId: dropoffHubId || pickupHubId,
      startTime: startDateTime,
      endTime: endDateTime,
      category: selectedCategory,
    });

    router.replace(`/fleet?${params.toString()}`);
    fetchFleet(pickupHubId, startDateTime, endDateTime);
  };

  // Calculate rental duration in days for pricing estimation
  const rentalDays = useMemo(() => {
    if (!pickupDate || !dropoffDate) return 2;
    const start = new Date(`${pickupDate}T${pickupTime || "10:00"}:00`);
    const end = new Date(`${dropoffDate}T${dropoffTime || "18:00"}:00`);
    const diffHours = (end - start) / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(diffHours / 24));
  }, [pickupDate, pickupTime, dropoffDate, dropoffTime]);

  const isOneWay = pickupHubId && dropoffHubId && pickupHubId !== dropoffHubId;

  // Selected Hub Details
  const selectedPickupHub = hubs.find((h) => h.hubId === pickupHubId);

  // Filter and Sort Vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((car) => {
        // Category filter
        if (
          selectedCategory !== "ALL" &&
          car.vehicle_class !== selectedCategory
        ) {
          return false;
        }

        // Fuel filter
        if (selectedFuel !== "ALL") {
          const carFuel = (car.fuel_type || car.fuel || "").toLowerCase();
          if (!carFuel.includes(selectedFuel.toLowerCase())) return false;
        }

        // Transmission filter
        if (selectedTransmission !== "ALL") {
          const carTrans = (car.transmission || "").toLowerCase();
          if (!carTrans.includes(selectedTransmission.toLowerCase()))
            return false;
        }

        // Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchMake = (car.make || "").toLowerCase().includes(q);
          const matchModel = (car.model || "").toLowerCase().includes(q);
          const matchTag = (car.tag || "").toLowerCase().includes(q);
          if (!matchMake && !matchModel && !matchTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const rateA = parseFloat(a.base_daily_rate || a.rate || 0);
        const rateB = parseFloat(b.base_daily_rate || b.rate || 0);

        if (sortBy === "PRICE_ASC") return rateA - rateB;
        if (sortBy === "PRICE_DESC") return rateB - rateA;
        if (sortBy === "SEATS_DESC") return (b.seats || 5) - (a.seats || 5);
        return 0;
      });
  }, [
    vehicles,
    selectedCategory,
    selectedFuel,
    selectedTransmission,
    sortBy,
    searchQuery,
  ]);

  // Pagination for catalog
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    setPage(1);
  }, [
    selectedCategory,
    selectedFuel,
    selectedTransmission,
    sortBy,
    searchQuery,
    pickupHubId,
  ]);

  const totalItems = filteredVehicles.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredVehicles.slice(start, start + limit);
  }, [filteredVehicles, page, limit]);

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white font-sans pb-24">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-[140px] pointer-events-none"></div>

      {/* Top Banner & Header */}
      <div className="border-b border-neutral-900 bg-neutral-950/60 backdrop-blur-xl pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sanitized Fleet • 2-Hour Buffer Gated</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Available Fleet Catalog
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 font-light mt-0.5">
                Every vehicle includes a mandatory 2-hour pre-trip safety
                buffer, clean inspection certification, and 100% wallet refund
                guarantee.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Instant KYC Verification</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                <RotateCcw className="w-4 h-4 text-purple-400" />
                <span>Zero Cancellation Fee</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Trip Filter Widget */}
      <div className="sticky top-20 z-40 bg-neutral-950/95 backdrop-blur-2xl border-b border-neutral-800 shadow-xl py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={handleUpdateSearch}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            {/* Pickup Hub */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Pickup
                  Station
                </label>
                <button
                  type="button"
                  onClick={() => detectNearestHubs(true)}
                  disabled={locatingUser}
                  className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  {locatingUser ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Crosshair className="w-3 h-3" />
                  )}
                  <span>
                    {userLocation ? "Recalculate Nearest" : "Near Me"}
                  </span>
                </button>
              </div>
              <select
                value={pickupHubId}
                onChange={(e) => setPickupHubId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={loadingHubs}
              >
                {hubs.map((h) => (
                  <option key={h.hubId} value={h.hubId}>
                    {h.name} ({h.city})
                    {h.distance_km !== undefined && h.distance_km !== null
                      ? ` — ${h.distance_km} km away`
                      : ""}
                  </option>
                ))}
              </select>
              {userLocation &&
                hubs.length > 0 &&
                hubs[0].distance_km !== undefined &&
                hubs[0].distance_km !== null && (
                  <p className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-medium">
                    <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>
                      Nearest: {hubs[0].name} ({hubs[0].distance_km} km away)
                    </span>
                  </p>
                )}
            </div>

            {/* Dropoff Hub */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Return Station
              </label>
              <select
                value={dropoffHubId}
                onChange={(e) => setDropoffHubId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                disabled={loadingHubs}
              >
                {hubs.map((h) => (
                  <option key={h.hubId} value={h.hubId}>
                    {h.name} ({h.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Pickup Date & Time */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Pickup
                Time
              </label>
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-2.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-24 px-2 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Dropoff Date & Time */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Dropoff Time
              </label>
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  className="w-full px-2.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="time"
                  value={dropoffTime}
                  onChange={(e) => setDropoffTime(e.target.value)}
                  className="w-24 px-2 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Search Submit Button */}
            <div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Check Availability</span>
              </button>
            </div>
          </form>

          {/* Sub-bar Status notices */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-800/60 text-xs">
            <div className="flex items-center gap-4 text-neutral-400">
              <span>
                Rental Duration:{" "}
                <strong className="text-white font-semibold">
                  {rentalDays} {rentalDays === 1 ? "Day" : "Days"}
                </strong>
              </span>

              {isOneWay && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px]">
                  + ₹500 One-Way Relocation Included
                </span>
              )}

              {selectedPickupHub && (
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <Clock className="w-3 h-3 text-neutral-400" /> Station Hours:{" "}
                  {selectedPickupHub.opening_time?.slice(0, 5)} -{" "}
                  {selectedPickupHub.closing_time?.slice(0, 5)}
                </span>
              )}
            </div>

            {searchError && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Filters + Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Filter Pills and Controls Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["ALL", "LUXURY", "SUV", "SEDAN", "HATCHBACK"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-white text-black shadow-md"
                    : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Filter Selectors & Search Box */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search make or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 w-44 sm:w-56"
              />
            </div>

            {/* Fuel Filter */}
            <select
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-neutral-700 cursor-pointer"
            >
              <option value="ALL">All Fuel Types</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Electric">Electric</option>
            </select>

            {/* Transmission Filter */}
            <select
              value={selectedTransmission}
              onChange={(e) => setSelectedTransmission(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-neutral-700 cursor-pointer"
            >
              <option value="ALL">All Transmissions</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-neutral-700 cursor-pointer"
            >
              <option value="RECOMMENDED">Recommended</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="SEATS_DESC">Most Seats</option>
            </select>
          </div>
        </div>

        {/* Results Counter and Summary */}
        <div className="flex items-center justify-between text-xs text-neutral-400 py-4">
          <div>
            Showing{" "}
            <strong className="text-white font-semibold">
              {filteredVehicles.length}
            </strong>{" "}
            available {filteredVehicles.length === 1 ? "vehicle" : "vehicles"}
            {selectedPickupHub ? ` at ${selectedPickupHub.name}` : ""}
          </div>
          {(selectedCategory !== "ALL" ||
            selectedFuel !== "ALL" ||
            selectedTransmission !== "ALL" ||
            searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedFuel("ALL");
                setSelectedTransmission("ALL");
                setSearchQuery("");
              }}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Vehicle Cards Grid */}
        {loadingVehicles ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-96 rounded-3xl bg-neutral-900/40 border border-neutral-800 animate-pulse flex flex-col justify-between p-5"
              >
                <div className="h-44 bg-neutral-800/50 rounded-2xl"></div>
                <div className="space-y-2 mt-4">
                  <div className="h-4 w-2/3 bg-neutral-800/50 rounded"></div>
                  <div className="h-3 w-1/2 bg-neutral-800/50 rounded"></div>
                </div>
                <div className="h-10 bg-neutral-800/50 rounded-xl mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-3xl bg-neutral-900/30 border border-neutral-800/80 max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800/60 border border-neutral-700 flex items-center justify-center mx-auto mb-4 text-neutral-500">
              <Car className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">
              No Vehicles Available Matching Your Filters
            </h3>
            <p className="text-xs text-neutral-400 mt-1.5 max-w-md mx-auto">
              Try adjusting your category, fuel type, or dates to find vehicles
              ready for dispatch.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedFuel("ALL");
                setSelectedTransmission("ALL");
                setSearchQuery("");
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
            {paginatedVehicles.map((car) => {
              const carId = car.vehicleId || car.id;
              const carImage =
                (car.gallery_urls && car.gallery_urls[0]) ||
                car.image ||
                "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80";
              const dailyRate = parseFloat(
                car.base_daily_rate || car.rate || 0,
              );
              const totalEstimate =
                dailyRate * rentalDays + (isOneWay ? 500 : 0);
              const carTag = car.tag || car.vehicle_class || "Available";
              const carSeats = car.seats || 5;
              const carFuel = car.fuel_type || car.fuel || "Petrol";
              const carTransmission = car.transmission || "Automatic";
              const isHighlighted = carId === highlightedVehicleId;

              // Booking redirect URL
              const startDateTime =
                pickupDate && pickupTime
                  ? `${pickupDate}T${pickupTime}:00`
                  : "";
              const endDateTime =
                dropoffDate && dropoffTime
                  ? `${dropoffDate}T${dropoffTime}:00`
                  : "";

              const checkoutParams = new URLSearchParams({
                vehicleId: carId,
                pickupHubId: pickupHubId || car.current_hub_id || "",
                dropoffHubId:
                  dropoffHubId || pickupHubId || car.current_hub_id || "",
                startTime: startDateTime,
                endTime: endDateTime,
              });

              return (
                <div
                  key={carId}
                  className={`group rounded-3xl bg-neutral-900/60 border overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                    isHighlighted
                      ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50"
                      : "border-neutral-800/80 hover:border-emerald-500/40 hover:shadow-[0_10px_30px_rgba(16,185,129,0.1)]"
                  }`}
                >
                  <div>
                    {/* Image Banner */}
                    <div className="relative h-48 w-full overflow-hidden bg-neutral-950">
                      <img
                        src={carImage}
                        alt={`${car.make} ${car.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {carTag}
                      </div>

                      <div className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded-md bg-neutral-950/80 backdrop-blur-md border border-neutral-800 text-[10px] text-neutral-300">
                        {car.vehicle_class}
                      </div>
                    </div>

                    {/* Details Body */}
                    <div className="p-5 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          {car.make}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {car.model}
                        </h3>
                      </div>

                      {/* Specs Row */}
                      <div className="flex items-center gap-3 text-xs text-neutral-400 py-2 border-y border-neutral-800/60">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-neutral-500" />
                          {carSeats} Seats
                        </span>
                        <span className="flex items-center gap-1">
                          <Fuel className="w-3.5 h-3.5 text-neutral-500" />
                          {carFuel}
                        </span>
                        <span className="text-[11px] font-medium text-emerald-400/90 ml-auto">
                          {carTransmission}
                        </span>
                      </div>

                      {/* Station Badge */}
                      {car.CurrentHub && (
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                          <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">
                            {car.CurrentHub.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer with Price & Action */}
                  <div className="p-5 pt-0 space-y-3">
                    <div className="flex items-end justify-between border-t border-neutral-800/60 pt-3">
                      <div>
                        <span className="text-[11px] text-neutral-400">
                          Daily Rate
                        </span>
                        <p className="text-base font-bold text-white">
                          ₹{dailyRate.toLocaleString("en-IN")}
                          <span className="text-xs font-normal text-neutral-400">
                            /day
                          </span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500">
                          Est. Total ({rentalDays}{" "}
                          {rentalDays === 1 ? "day" : "days"})
                        </span>
                        <p className="text-sm font-semibold text-emerald-400">
                          ₹{totalEstimate.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/checkout?${checkoutParams.toString()}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-black/40 group-hover:bg-emerald-400 group-hover:text-black cursor-pointer"
                    >
                      <span>Proceed to Book</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loadingVehicles && totalItems > 0 && (
          <div className="mt-8">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={(newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 380, behavior: "smooth" });
              }}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              pageSizeOptions={[6, 12, 24, 48]}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function FleetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-neutral-400 tracking-wide">
              Loading ShiftDrive Fleet...
            </p>
          </div>
        </div>
      }
    >
      <FleetContent />
    </Suspense>
  );
}
