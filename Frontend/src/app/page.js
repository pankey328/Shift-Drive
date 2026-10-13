"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/api";
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Fuel,
  Users,
  Search,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [hubs, setHubs] = useState([]);
  const [loadingHubs, setLoadingHubs] = useState(true);

  // Search Widget Form
  const [pickupHubId, setPickupHubId] = useState("");
  const [dropoffHubId, setDropoffHubId] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("18:00");
  const [searchError, setSearchError] = useState("");

  // Fleet category filter tab
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
    // Set default dates (tomorrow and day after)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);

    setPickupDate(tomorrow.toISOString().split("T")[0]);
    setDropoffDate(dayAfter.toISOString().split("T")[0]);

    // Fetch active hubs
    const fetchHubs = async () => {
      try {
        const res = await api.get("/hubs");
        if (res.data?.data && Array.isArray(res.data.data)) {
          setHubs(res.data.data);
          if (res.data.data.length > 0) {
            setPickupHubId(res.data.data[0].hubId);
            setDropoffHubId(res.data.data[0].hubId);
          }
        }
      } catch (err) {
        console.warn("Using fallback hub list:", err.message);
        // Fallback hubs
        const fallback = [
          {
            hubId: "hub-1",
            name: "Jaipur International Airport Hub",
            city: "Jaipur",
            address: "Terminal 2 Arrival Parking, Sanganer",
            opening_time: "06:00:00",
            closing_time: "23:59:00",
          },
          {
            hubId: "hub-2",
            name: "Pratap Nagar Transit Hub",
            city: "Jaipur",
            address: "Sector 8, Haldi Ghati Marg",
            opening_time: "07:00:00",
            closing_time: "22:00:00",
          },
          {
            hubId: "hub-3",
            name: "Malviya Nagar Hub",
            city: "Jaipur",
            address: "Near World Trade Park, JLN Marg",
            opening_time: "08:00:00",
            closing_time: "23:00:00",
          },
        ];
        setHubs(fallback);
        setPickupHubId(fallback[0].hubId);
        setDropoffHubId(fallback[0].hubId);
      } finally {
        setLoadingHubs(false);
      }
    };

    fetchHubs();
  }, []);

  const handleSearchFleet = (e) => {
    e.preventDefault();
    setSearchError("");

    if (!pickupHubId) {
      setSearchError("Please select a pickup hub station.");
      return;
    }

    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      setSearchError("Please specify pickup and dropoff dates and times.");
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
    });

    router.push(`/fleet?${params.toString()}`);
  };

  // Dynamic fleet state fetched 
  const [fleet, setFleet] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);

  useEffect(() => {
    // Fetch live fleet from backend API
    const fetchFleet = async () => {
      try {
        const res = await api.get("/vehicles");
        if (res.data?.data && Array.isArray(res.data.data)) {
          setFleet(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch fleet from backend:", err.message);
      } finally {
        setLoadingFleet(false);
      }
    };

    fetchFleet();
  }, []);

  const filteredFleet =
    selectedCategory === "ALL"
      ? fleet
      : fleet.filter((car) => car.vehicle_class === selectedCategory);


  return (
    <div className="relative min-h-screen bg-neutral-950 text-white overflow-hidden">
      {/* Background radial spotlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-emerald-500/15 via-blue-500/5 to-transparent blur-[140px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Next-Gen Enterprise Self-Drive Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Drive the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Exceptional.</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-400 font-light leading-relaxed">
            Curated premium vehicles with mandatory 2-hour sanitation safety buffers, instant wallet cancellations, and flexible station-to-airport handovers.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Instant KYC Gating
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> 5-Min Lock Guarantee
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
              <RotateCcw className="w-3.5 h-3.5 text-purple-400" /> 100% Wallet Refund
            </span>
          </div>
        </div>

        {/* Floating Interactive Booking Search Widget */}
        <div className="mt-12 max-w-4xl mx-auto rounded-3xl bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Book Rental Vehicle
              </span>
            </div>

            {pickupHubId !== dropoffHubId && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                + ₹500 One-Way Relocation Included
              </span>
            )}
          </div>

          {searchError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 text-center">
              {searchError}
            </div>
          )}

          <form onSubmit={handleSearchFleet} className="space-y-5">
            {/* Stations Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Hub */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Pickup Station
                </label>
                <select
                  value={pickupHubId}
                  onChange={(e) => setPickupHubId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  disabled={loadingHubs}
                >
                  {hubs.map((h) => (
                    <option key={h.hubId} value={h.hubId}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropoff Hub */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> Return Station
                </label>
                <select
                  value={dropoffHubId}
                  onChange={(e) => setDropoffHubId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  disabled={loadingHubs}
                >
                  {hubs.map((h) => (
                    <option key={h.hubId} value={h.hubId}>
                      {h.name} {h.hubId === pickupHubId ? "(Same Hub)" : "(One-Way Drop)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates & Times Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Pickup Date */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <Calendar className="w-3 h-3 text-emerald-400" /> Pickup Date
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Pickup Time */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-emerald-400" /> Pickup Time
                </label>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Dropoff Date */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <Calendar className="w-3 h-3 text-blue-400" /> Return Date
                </label>
                <input
                  type="date"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Dropoff Time */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-blue-400" /> Return Time
                </label>
                <input
                  type="time"
                  value={dropoffTime}
                  onChange={(e) => setDropoffTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-black" />
              <span>Search Available Fleet</span>
            </button>
          </form>
        </div>
      </section>

      {/* Fleet Catalog Showcase Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              ShiftDrive Fleet
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mt-1">
              Select Your Category
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-light">
              Maintained under rigorous fleet protocols and cleaned after every rental.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {["ALL", "LUXURY", "SUV", "SEDAN", "HATCHBACK"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-white text-black shadow-md"
                    : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cars Grid */}
        {loadingFleet ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-80 rounded-3xl bg-neutral-900/40 border border-neutral-800 animate-pulse flex flex-col justify-between p-5"
              >
                <div className="h-44 bg-neutral-800/50 rounded-2xl"></div>
                <div className="space-y-2 mt-4">
                  <div className="h-4 w-2/3 bg-neutral-800/50 rounded"></div>
                  <div className="h-3 w-1/2 bg-neutral-800/50 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredFleet.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-neutral-900/40 border border-neutral-800">
            <Car className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm">No vehicles available in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredFleet.map((car) => {
              const carId = car.vehicleId || car.id;
              const carImage =
                (car.gallery_urls && car.gallery_urls[0]) ||
                car.image ||
                "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80";
              const carRate = parseFloat(car.base_daily_rate || car.rate || 0);
              const carTag = car.tag || car.vehicle_class || "Available";
              const carSeats = car.seats || 5;
              const carFuel = car.fuel_type || car.fuel || "Petrol";
              const carTransmission = car.transmission || "Automatic";

              return (
                <div
                  key={carId}
                  className="group rounded-3xl bg-neutral-900/60 border border-neutral-800/80 overflow-hidden hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(16,185,129,0.1)] flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-neutral-950">
                      <img
                        src={carImage}
                        alt={`${car.make} ${car.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {carTag}
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          {car.make}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {car.model}
                        </h3>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-neutral-400 py-2 border-y border-neutral-800/60">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-neutral-500" />
                          {carSeats} Seats
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Fuel className="w-3.5 h-3.5 text-neutral-500" />
                          {carFuel}
                        </span>
                        <span className="text-[11px] font-medium text-emerald-400/90">
                          {carTransmission}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-neutral-400">Daily Rate</span>
                      <p className="text-lg font-bold text-white">
                        ₹{carRate.toLocaleString("en-IN")}
                        <span className="text-xs font-normal text-neutral-400">/day</span>
                      </p>
                    </div>

                    <Link
                      href={`/fleet?vehicleId=${carId}&pickupHubId=${pickupHubId || ""}&dropoffHubId=${dropoffHubId || ""}`}
                      className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-all flex items-center gap-1 shadow-md"
                    >
                      <span>Select</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* How ShiftDrive Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Frictionless Rentals
          </span>
          <h2 className="text-3xl font-bold text-white mt-1">
            How ShiftDrive Operates
          </h2>
          <p className="text-sm text-neutral-400 mt-1.5 font-light">
            Engineered to remove paperwork, key exchanges, and long airport counters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-white">Station Discovery</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Select pickup station and dates. Operating hours and 2-hour buffer safety are automatically computed.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-white">Instant KYC Verification</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Upload your driving license once. Our verification gate approves customer access before vehicle payment.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-white">5-Min Lock & Wallet Pay</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Your car is locked for 5 minutes during checkout to prevent double-booking. Confirm seamlessly from your wallet.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm">
              04
            </div>
            <h3 className="text-base font-bold text-white">Contactless Handover</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Hub manager verifies pre-trip photos with digital ledger. Drive away with peace of mind.
            </p>
          </div>
        </div>
      </section>

      {/* Hub Stations Directory Section */}
      <section id="hubs" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Network Operations
          </span>
          <h2 className="text-3xl font-bold text-white mt-1">
            Active Hub Stations
          </h2>
          <p className="text-sm text-neutral-400 mt-1.5 font-light">
            Convenient hubs located at transit nodes and commercial centers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hubs.map((hub) => (
            <div
              key={hub.hubId}
              className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-colors space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-white">{hub.name}</h4>
                  <p className="text-xs text-emerald-400 font-medium mt-0.5">{hub.city}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  Open
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-neutral-400">
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>{hub.address}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>
                    Hours: {hub.opening_time ? hub.opening_time.slice(0, 5) : "06:00"} -{" "}
                    {hub.closing_time ? hub.closing_time.slice(0, 5) : "23:00"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPickupHubId(hub.hubId);
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className="w-full py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Select As Pickup
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
