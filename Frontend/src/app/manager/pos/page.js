"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check,
  RefreshCw,
  Camera,
  UploadCloud,
  Trash2,
  Car,
  Search,
  UserCheck,
  Printer,
  Receipt,
  Clock,
  Calendar,
  CreditCard,
  Sparkles,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

export default function ManagerPosPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [allHubsList, setAllHubsList] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Customer Quick Lookup State
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");

  // POS Form
  const [posForm, setPosForm] = useState({
    name: "",
    phone: "",
    email: "",
    driving_license_number: "",
    vehicleId: "",
    start_time: "",
    end_time: "",
    dropoff_hub_id: "",
    payment_method: "CARD_SWIPE",
  });
  const [posSubmitting, setPosSubmitting] = useState(false);
  const [posError, setPosError] = useState("");
  const [posSuccess, setPosSuccess] = useState(null);

  // Pre-Trip Inspection Photos & Checklist
  const [preTripFiles, setPreTripFiles] = useState([]);
  const [preTripNotes, setPreTripNotes] = useState("");
  const [damageFlagged, setDamageFlagged] = useState(false);
  const [damageSeverity, setDamageSeverity] = useState("MINOR");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePhotoSelect = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setPreTripFiles((prev) => [...prev, ...selected].slice(0, 10));
    }
  };

  const removePhoto = (index) => {
    setPreTripFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick Note Helper Tags
  const addQuickNoteTag = (tag) => {
    setPreTripNotes((prev) => {
      if (!prev) return tag;
      if (prev.includes(tag)) return prev;
      return `${prev} | ${tag}`;
    });
  };

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
          target =
            hubs.find((h) => {
              const idMatch =
                userIdentifier &&
                (h.manager_id === userIdentifier ||
                  h.Manager?.userId === userIdentifier);
              const emailMatch =
                userEmail &&
                h.Manager?.email?.toLowerCase().trim() === userEmail;
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

  // Fetch Available Vehicles on Lot
  const fetchAvailableVehicles = useCallback(async () => {
    if (!selectedHubId) return;
    setLoadingVehicles(true);
    try {
      const res = await api.get(`/vehicles/hub/${selectedHubId}`);
      if (res.data?.success) {
        const vehicles = res.data.data || [];
        setAvailableVehicles(vehicles.filter((v) => v.status === "ACTIVE"));
      }
    } catch (err) {
      console.error("Failed to fetch available vehicles:", err);
    } finally {
      setLoadingVehicles(false);
    }
  }, [selectedHubId]);

  useEffect(() => {
    if (isAuthenticated) {
      resolveStationHub();
      setPosForm((prev) => ({
        ...prev,
        start_time: prev.start_time || new Date().toISOString().slice(0, 16),
        end_time:
          prev.end_time ||
          new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16),
      }));
    }
  }, [isAuthenticated, resolveStationHub]);

  useEffect(() => {
    if (selectedHubId) {
      fetchAvailableVehicles();
    }
  }, [selectedHubId, fetchAvailableVehicles]);

  // Quick Customer Lookup by Contact (Phone / Email / Name)
  const handleCustomerLookup = async () => {
    if (!lookupQuery.trim()) return;
    setLookingUp(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const res = await api.get(
        `/hub-admin/pos/customer-lookup?query=${encodeURIComponent(
          lookupQuery.trim()
        )}`
      );
      if (res.data?.success && res.data.data) {
        const found = res.data.data;
        setLookupResult(found);
        setPosForm((prev) => ({
          ...prev,
          name: found.name || prev.name,
          phone: found.phone || prev.phone,
          email:
            found.email && !found.email.includes("@shiftdrive.local")
              ? found.email
              : prev.email,
          driving_license_number: found.kyc_document_url
            ? found.kyc_document_url.replace(/^DL#\s*/i, "")
            : prev.driving_license_number,
        }));
      }
    } catch (err) {
      setLookupError(
        err.response?.data?.message ||
          "No registered customer profile found with this contact. An instant walk-in guest account will be auto-provisioned."
      );
    } finally {
      setLookingUp(false);
    }
  };

  const handleClearCustomer = () => {
    setLookupResult(null);
    setLookupQuery("");
    setLookupError("");
    setPosForm((prev) => ({
      ...prev,
      name: "",
      phone: "",
      email: "",
      driving_license_number: "",
    }));
  };

  // Selected Vehicle Object
  const selectedVehicle = useMemo(() => {
    return availableVehicles.find((v) => v.vehicleId === posForm.vehicleId) || null;
  }, [availableVehicles, posForm.vehicleId]);

  // Live Fare & Schedule Calculation
  const calculation = useMemo(() => {
    if (!posForm.start_time || !posForm.end_time || !selectedVehicle) {
      return null;
    }
    const start = new Date(posForm.start_time);
    const end = new Date(posForm.end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const diffMs = end.getTime() - start.getTime();
    const totalHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const dailyRate = parseFloat(selectedVehicle.base_daily_rate) || 0;
    const rentalSubtotal = days * dailyRate;
    const securityDeposit = 2000; // Refundable security deposit
    const totalPayable = rentalSubtotal + securityDeposit;

    return {
      totalHours,
      days,
      dailyRate,
      rentalSubtotal,
      securityDeposit,
      totalPayable,
    };
  }, [posForm.start_time, posForm.end_time, selectedVehicle]);

  const handlePosSubmit = async (e) => {
    e.preventDefault();
    setPosSubmitting(true);
    setPosError("");
    setPosSuccess(null);

    try {
      // Validate operating hours client-side before sending
      const isTimeInRange = (timeStr, open, close) => {
        if (
          !open ||
          !close ||
          open === close ||
          (open === "00:00:00" && close >= "23:59:00")
        )
          return true;
        const t = timeStr.slice(0, 5);
        const o = open.slice(0, 5);
        const c = close.slice(0, 5);
        return o <= c ? t >= o && t <= c : t >= o || t <= c;
      };

      const targetDropoffHub =
        allHubsList.find(
          (h) => h.hubId === (posForm.dropoff_hub_id || selectedHubId)
        ) || currentHub;

      const startTimeStr = posForm.start_time?.split("T")[1]?.slice(0, 5);
      const endTimeStr = posForm.end_time?.split("T")[1]?.slice(0, 5);

      if (
        currentHub?.opening_time &&
        startTimeStr &&
        !isTimeInRange(
          startTimeStr,
          currentHub.opening_time,
          currentHub.closing_time
        )
      ) {
        setPosError(
          `Pickup station (${currentHub.name}) is closed at ${startTimeStr}. Station operating hours are ${currentHub.opening_time.slice(
            0,
            5
          )} to ${currentHub.closing_time.slice(0, 5)}.`
        );
        setPosSubmitting(false);
        return;
      }

      if (
        targetDropoffHub?.opening_time &&
        endTimeStr &&
        !isTimeInRange(
          endTimeStr,
          targetDropoffHub.opening_time,
          targetDropoffHub.closing_time
        )
      ) {
        setPosError(
          `Return station (${targetDropoffHub.name}) is closed at ${endTimeStr}. Station operating hours are ${targetDropoffHub.opening_time.slice(
            0,
            5
          )} to ${targetDropoffHub.closing_time.slice(
            0,
            5
          )}. Please select a return time during station operating hours.`
        );
        setPosSubmitting(false);
        return;
      }

      const payload = {
        hubId: selectedHubId,
        customerData: {
          name: posForm.name,
          phone: posForm.phone,
          email: posForm.email || undefined,
          driving_license_number: posForm.driving_license_number || undefined,
        },
        bookingData: {
          vehicleId: posForm.vehicleId,
          start_time: posForm.start_time,
          end_time: posForm.end_time,
          dropoff_hub_id: posForm.dropoff_hub_id || selectedHubId,
          total_price: calculation?.rentalSubtotal || undefined,
        },
        paymentData: {
          payment_method: posForm.payment_method,
          reference: `POS-${Date.now().toString().slice(-6)}`,
        },
      };

      const res = await api.post("/hub-admin/pos/book", payload);
      if (res.data?.success) {
        const bookingResult = res.data.data;
        let inspectionResult = null;

        // If pre-trip condition photos are attached, submit digital handover inspection
        if (preTripFiles.length > 0 && bookingResult.booking?.bookingId) {
          try {
            const formData = new FormData();
            formData.append("type", "PRE_TRIP");
            formData.append(
              "notes",
              preTripNotes ||
                "Walk-In Counter POS Pre-Trip Digital Inspection Handover"
            );
            formData.append("damage_flagged", damageFlagged);
            if (damageFlagged) {
              formData.append("damage_severity", damageSeverity);
            }
            preTripFiles.forEach((file) => {
              formData.append("photos", file);
            });

            const inspRes = await api.post(
              `/inspections/${bookingResult.booking.bookingId}`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              }
            );
            if (inspRes.data?.success) {
              inspectionResult = {
                photosCount: preTripFiles.length,
                data: inspRes.data.data,
              };
            }
          } catch (inspErr) {
            console.error("Failed to upload pre-trip inspection:", inspErr);
          }
        }

        setPosSuccess({
          ...bookingResult,
          inspection: inspectionResult,
          calculation,
          dropoffHubName: targetDropoffHub?.name,
        });

        // Reset form
        setPosForm({
          name: "",
          phone: "",
          email: "",
          driving_license_number: "",
          vehicleId: "",
          start_time: new Date().toISOString().slice(0, 16),
          end_time: new Date(Date.now() + 48 * 3600 * 1000)
            .toISOString()
            .slice(0, 16),
          dropoff_hub_id: "",
          payment_method: "CARD_SWIPE",
        });
        setPreTripFiles([]);
        setPreTripNotes("");
        setDamageFlagged(false);
        setLookupResult(null);
        setLookupQuery("");
        fetchAvailableVehicles();
      }
    } catch (err) {
      setPosError(
        err.response?.data?.message || "Failed to process walk-in rental."
      );
    } finally {
      setPosSubmitting(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="text-xs text-neutral-400 font-medium">
          Loading POS Counter Desk...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-4xl mx-auto">
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
            Walk-In Counter Rental POS
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Fast-track contract provisioning, instant pricing calculation, and digital pre-trip inspection handover for walk-in airport customers.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAvailableVehicles}
          disabled={loadingVehicles}
          className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh Available Inventory"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loadingVehicles ? "animate-spin text-blue-400" : ""
            }`}
          />
        </button>
      </div>

      {posError && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{posError}</span>
        </div>
      )}

      {/* POS SUCCESS VOUCHER & HANDOVER RECEIPT */}
      {posSuccess && (
        <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-emerald-800/60 shadow-2xl space-y-5 text-xs text-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Walk-In Rental Handover Activated!
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Vehicle dispatched & contract bound to active customer ledger.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Print Receipt Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setPosSuccess(null)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Walk-In</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 font-semibold uppercase block">
                Booking Reference
              </span>
              <span className="font-mono text-xs font-bold text-blue-400 block truncate">
                {posSuccess.booking?.bookingId}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 font-semibold uppercase block">
                Assigned Vehicle
              </span>
              <span className="font-bold text-white block">
                {posSuccess.vehicle?.make} {posSuccess.vehicle?.model}
              </span>
              <span className="font-mono text-[10px] text-neutral-400">
                {posSuccess.vehicle?.plate_number}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 font-semibold uppercase block">
                Customer
              </span>
              <span className="font-bold text-white block truncate">
                {posSuccess.customer?.name}
              </span>
              <span className="text-[10px] text-neutral-400">
                {posSuccess.customer?.phone}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 font-semibold uppercase block">
                Payment Collected
              </span>
              <span className="font-mono text-sm font-extrabold text-emerald-400 block">
                ₹{parseFloat(posSuccess.payment?.amount || 0).toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-neutral-400">
                via {posSuccess.payment?.method}
              </span>
            </div>
          </div>

          {posSuccess.inspection && (
            <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>Digital Pre-Trip Inspection Recorded:</strong>{" "}
                  {posSuccess.inspection.photosCount} vehicle condition photos uploaded and archived.
                </span>
              </div>
              <span className="font-mono text-[10px] bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Handover Certified
              </span>
            </div>
          )}
        </div>
      )}

      {/* POS Contract Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-6">
        {/* FAST CUSTOMER QUICK LOOKUP TOOLBAR */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Search className="w-4 h-4 text-blue-400" />
              <span>Quick Customer Lookup (Phone / Email / Name)</span>
            </div>
            {lookupResult && (
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Clear / New Customer
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCustomerLookup();
                  }
                }}
                placeholder="Search registered customer by phone or email..."
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleCustomerLookup}
              disabled={lookingUp || !lookupQuery.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {lookingUp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              <span>Lookup</span>
            </button>
          </div>

          {lookupError && (
            <p className="text-[11px] text-amber-400 bg-amber-950/20 p-2.5 rounded-xl border border-amber-800/30">
              {lookupError}
            </p>
          )}

          {lookupResult && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Verified Customer: <strong>{lookupResult.name}</strong> ({lookupResult.phone})
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-bold">
                KYC: {lookupResult.kyc_status || "VERIFIED"}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handlePosSubmit} className="space-y-6">
          {/* SECTION 1: CUSTOMER IDENTITY */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-neutral-800 pb-2">
              1. Customer Identity & KYC
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={posForm.name}
                  onChange={(e) => setPosForm({ ...posForm, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={posForm.phone}
                  onChange={(e) => setPosForm({ ...posForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={posForm.email}
                  onChange={(e) => setPosForm({ ...posForm, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Driving License Number
                </label>
                <input
                  type="text"
                  value={posForm.driving_license_number}
                  onChange={(e) =>
                    setPosForm({ ...posForm, driving_license_number: e.target.value })
                  }
                  placeholder="DL-1420110012345"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: VEHICLE & SCHEDULE */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-neutral-800 pb-2">
              2. Lot Vehicle & Rental Schedule
            </h3>

            <div className="space-y-1.5 mt-3">
              <label className="text-xs font-semibold text-neutral-300">
                Select Available Vehicle on Lot *
              </label>
              {loadingVehicles ? (
                <div className="p-3 text-center text-xs text-neutral-400">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-400" />
                </div>
              ) : availableVehicles.length === 0 ? (
                <p className="text-xs text-amber-400 bg-amber-950/20 p-3 rounded-xl border border-amber-800/40">
                  No active vehicles currently available on this station&apos;s lot.
                </p>
              ) : (
                <select
                  required
                  value={posForm.vehicleId}
                  onChange={(e) => setPosForm({ ...posForm, vehicleId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Choose Available Lot Vehicle --</option>
                  {availableVehicles.map((car) => (
                    <option key={car.vehicleId} value={car.vehicleId}>
                      {car.make} {car.model} ({car.plate_number}) - ₹
                      {parseFloat(car.base_daily_rate).toLocaleString("en-IN")}/day
                    </option>
                  ))}
                </select>
              )}

              {selectedVehicle && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 mt-2">
                  <div className="w-16 h-12 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {selectedVehicle.gallery_urls &&
                    selectedVehicle.gallery_urls.length > 0 ? (
                      <img
                        src={selectedVehicle.gallery_urls[0]}
                        alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Car className="w-5 h-5 text-neutral-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs truncate">
                        {selectedVehicle.make} {selectedVehicle.model}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        ₹
                        {parseFloat(
                          selectedVehicle.base_daily_rate
                        ).toLocaleString("en-IN")}
                        /day
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-400">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800 font-semibold">
                        {selectedVehicle.plate_number}
                      </span>
                      <span>•</span>
                      <span>{selectedVehicle.transmission || "Automatic"}</span>
                      <span>•</span>
                      <span>{selectedVehicle.fuel_type || "Petrol"}</span>
                      <span>•</span>
                      <span>{selectedVehicle.seats || 5} Seats</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    Rental Start Time *
                  </label>
                  {currentHub?.opening_time && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Open: {currentHub.opening_time.slice(0, 5)} -{" "}
                      {currentHub.closing_time.slice(0, 5)}
                    </span>
                  )}
                </div>
                <input
                  type="datetime-local"
                  required
                  value={posForm.start_time}
                  onChange={(e) =>
                    setPosForm({ ...posForm, start_time: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    Expected Return Time *
                  </label>
                  {(() => {
                    const targetHub =
                      allHubsList.find(
                        (h) =>
                          h.hubId ===
                          (posForm.dropoff_hub_id || selectedHubId)
                      ) || currentHub;
                    return targetHub?.opening_time ? (
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Hub Hours: {targetHub.opening_time.slice(0, 5)} -{" "}
                        {targetHub.closing_time.slice(0, 5)}
                      </span>
                    ) : null;
                  })()}
                </div>
                <input
                  type="datetime-local"
                  required
                  value={posForm.end_time}
                  onChange={(e) =>
                    setPosForm({ ...posForm, end_time: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Return Drop-Off Station Hub
                </label>
                <select
                  value={posForm.dropoff_hub_id || selectedHubId}
                  onChange={(e) =>
                    setPosForm({ ...posForm, dropoff_hub_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {allHubsList.map((hub) => (
                    <option key={hub.hubId} value={hub.hubId}>
                      {hub.name} ({hub.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Counter Payment Method Collected *
                </label>
                <select
                  value={posForm.payment_method}
                  onChange={(e) =>
                    setPosForm({ ...posForm, payment_method: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="CARD_SWIPE">EDC POS Card Swipe (Visa / Mastercard)</option>
                  <option value="UPI_COUNTER">Counter UPI Dynamic QR</option>
                  <option value="CASH">Cash Front Desk Drawer</option>
                </select>
              </div>
            </div>
          </div>

          {/* REAL-TIME COUNTER BILLING BREAKDOWN SLIP */}
          {calculation && (
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Counter Rental Tariff & Breakdown
                  </span>
                </div>
                <span className="font-mono text-[11px] text-blue-400 font-bold bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/40">
                  {calculation.days} Day(s) • {calculation.totalHours} Hours
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-neutral-300">
                <div className="flex justify-between">
                  <span className="text-neutral-400">
                    Vehicle Tariff ({calculation.days} days @ ₹
                    {calculation.dailyRate.toLocaleString("en-IN")}/day)
                  </span>
                  <span className="font-mono font-medium text-white">
                    ₹{calculation.rentalSubtotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">
                    Security Deposit (Refundable upon station return)
                  </span>
                  <span className="font-mono font-medium text-emerald-400">
                    ₹{calculation.securityDeposit.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-white">Total Amount Due at Counter:</span>
                  <span className="font-mono text-base text-blue-400">
                    ₹{calculation.totalPayable.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PRE-TRIP DIGITAL INSPECTION */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-neutral-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>3. Digital Pre-Trip Inspection & Condition Photos</span>
              </span>
              <span className="text-[10px] text-neutral-400 normal-case font-normal">
                (Up to 10 photos: Odometer, exterior 360°, fuel gauge)
              </span>
            </h3>

            <div className="space-y-4 mt-3">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block">
                      Upload Vehicle Condition Photos
                    </label>
                    <span className="text-[11px] text-neutral-500">
                      Capture exterior panels, odometer cluster, and fuel gauge before handing keys to customer.
                    </span>
                  </div>
                  <label className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors border border-neutral-700 self-start sm:self-auto">
                    <UploadCloud className="w-4 h-4 text-emerald-400" />
                    <span>Choose Images ({preTripFiles.length}/10)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Photos Previews */}
                {preTripFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                    {preTripFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 aspect-video flex items-center justify-center"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Inspection preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1 text-[9px] font-mono bg-black/70 text-white px-1.5 py-0.5 rounded">
                          Photo #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Notes Tag Pills */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    Pre-Trip Handover Notes & Odometer Reading
                  </label>
                  <span className="text-[10px] text-neutral-500">
                    Click tags below to quick-insert:
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    "Full Tank (100%)",
                    "75% Fuel",
                    "50% Fuel",
                    "Clean Interior",
                    "Keycard Handed",
                    "Spare Wheel & Jack OK",
                    "No Scratches Observed",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addQuickNoteTag(tag)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-medium transition-colors cursor-pointer border border-neutral-700/50"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={preTripNotes}
                  onChange={(e) => setPreTripNotes(e.target.value)}
                  placeholder="e.g. Odometer: 24,150 km | Fuel: 100% | Vehicle sanitized and clean | Keycard #12 handed over."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                  <input
                    type="checkbox"
                    checked={damageFlagged}
                    onChange={(e) => setDamageFlagged(e.target.checked)}
                    className="rounded bg-neutral-900 border-neutral-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-white">
                    Flag Existing Minor Scratches or Marks
                  </span>
                </label>

                {damageFlagged && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-[11px] text-neutral-400">Severity:</span>
                    {["MINOR", "MAJOR"].map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setDamageSeverity(sev)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          damageSeverity === sev
                            ? "bg-amber-500 text-black"
                            : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={posSubmitting || !posForm.vehicleId}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-blue-600/30 mt-4"
          >
            {posSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Activating Contract & Handover...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Issue Contract & Dispatch Vehicle</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
