"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import {
  PlusCircle,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check,
  RefreshCw,
  Camera,
  UploadCloud,
  Trash2,
  ShieldAlert,
} from "lucide-react";

export default function ManagerPosPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [allHubsList, setAllHubsList] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

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

  const handlePhotoSelect = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setPreTripFiles((prev) => [...prev, ...selected].slice(0, 10));
    }
  };

  const removePhoto = (index) => {
    setPreTripFiles((prev) => prev.filter((_, i) => i !== index));
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
        end_time: prev.end_time || new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16),
      }));
    }
  }, [isAuthenticated, resolveStationHub]);

  useEffect(() => {
    if (selectedHubId) {
      fetchAvailableVehicles();
    }
  }, [selectedHubId, fetchAvailableVehicles]);

  const handlePosSubmit = async (e) => {
    e.preventDefault();
    setPosSubmitting(true);
    setPosError("");
    setPosSuccess(null);

    try {
      // Validate operating hours client-side before sending
      const isTimeInRange = (timeStr, open, close) => {
        if (!open || !close || open === close || (open === "00:00:00" && close >= "23:59:00")) return true;
        const t = timeStr.slice(0, 5);
        const o = open.slice(0, 5);
        const c = close.slice(0, 5);
        return o <= c ? (t >= o && t <= c) : (t >= o || t <= c);
      };

      const targetDropoffHub =
        allHubsList.find((h) => h.hubId === (posForm.dropoff_hub_id || selectedHubId)) || currentHub;

      const startTimeStr = posForm.start_time?.split("T")[1]?.slice(0, 5);
      const endTimeStr = posForm.end_time?.split("T")[1]?.slice(0, 5);

      if (
        currentHub?.opening_time &&
        startTimeStr &&
        !isTimeInRange(startTimeStr, currentHub.opening_time, currentHub.closing_time)
      ) {
        setPosError(
          `Pickup station (${currentHub.name}) is closed at ${startTimeStr}. Station operating hours are ${currentHub.opening_time.slice(0, 5)} to ${currentHub.closing_time.slice(0, 5)}.`
        );
        setPosSubmitting(false);
        return;
      }

      if (
        targetDropoffHub?.opening_time &&
        endTimeStr &&
        !isTimeInRange(endTimeStr, targetDropoffHub.opening_time, targetDropoffHub.closing_time)
      ) {
        setPosError(
          `Return station (${targetDropoffHub.name}) is closed at ${endTimeStr}. Station operating hours are ${targetDropoffHub.opening_time.slice(0, 5)} to ${targetDropoffHub.closing_time.slice(0, 5)}. Please select a return time during station operating hours.`
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
              preTripNotes || "Walk-In Counter POS Pre-Trip Digital Inspection Handover"
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
        });

        setPosForm({
          name: "",
          phone: "",
          email: "",
          driving_license_number: "",
          vehicleId: "",
          start_time: new Date().toISOString().slice(0, 16),
          end_time: new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16),
          dropoff_hub_id: "",
          payment_method: "CARD_SWIPE",
        });
        setPreTripFiles([]);
        setPreTripNotes("");
        setDamageFlagged(false);
        fetchAvailableVehicles();
      }
    } catch (err) {
      setPosError(err.response?.data?.message || "Failed to process walk-in rental.");
    } finally {
      setPosSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
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
            Fast-track contract provisioning and digital handover for offline airport and walk-up counter customers.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAvailableVehicles}
          disabled={loadingVehicles}
          className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh Available Inventory"
        >
          <RefreshCw className={`w-4 h-4 ${loadingVehicles ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      {posError && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{posError}</span>
        </div>
      )}

      {posSuccess && (
        <div className="p-5 rounded-3xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span>Walk-In Rental Activated Successfully!</span>
          </div>
          <p>
            Booking Reference: <strong className="text-white font-mono">{posSuccess.booking?.bookingId}</strong>
          </p>
          <p>
            Customer: <strong className="text-white">{posSuccess.customer?.name}</strong> | Vehicle:{" "}
            <strong className="text-white">{posSuccess.vehicle?.plate_number}</strong>
          </p>
          <p className="text-neutral-400">
            Total Charge Collected: ₹{parseFloat(posSuccess.payment?.amount || 0).toLocaleString("en-IN")} via{" "}
            <strong className="text-white">{posSuccess.payment?.method}</strong>
          </p>
          {posSuccess.inspection && (
            <div className="p-2.5 rounded-xl bg-emerald-900/30 border border-emerald-800/60 text-emerald-300 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Pre-Trip Digital Inspection Filed:</strong> {posSuccess.inspection.photosCount} condition photos uploaded to customer contract.
              </span>
            </div>
          )}
        </div>
      )}

      {/* POS Contract Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
        <form onSubmit={handlePosSubmit} className="space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-neutral-800 pb-2">
            1. Customer Identity & Verification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                onChange={(e) => setPosForm({ ...posForm, driving_license_number: e.target.value })}
                placeholder="DL-1420110012345"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-neutral-800 pb-2 pt-4">
            2. Lot Vehicle & Rental Schedule
          </h3>

          <div className="space-y-1.5">
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
                    {car.make} {car.model} ({car.plate_number}) - ₹{parseFloat(car.base_daily_rate).toLocaleString("en-IN")}/day
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">
                  Rental Start Time
                </label>
                {currentHub?.opening_time && (
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Open: {currentHub.opening_time.slice(0, 5)} - {currentHub.closing_time.slice(0, 5)}
                  </span>
                )}
              </div>
              <input
                type="datetime-local"
                required
                value={posForm.start_time}
                onChange={(e) => setPosForm({ ...posForm, start_time: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">
                  Expected Return Time
                </label>
                {(() => {
                  const targetHub =
                    allHubsList.find((h) => h.hubId === (posForm.dropoff_hub_id || selectedHubId)) || currentHub;
                  return targetHub?.opening_time ? (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Hub Hours: {targetHub.opening_time.slice(0, 5)} - {targetHub.closing_time.slice(0, 5)}
                    </span>
                  ) : null;
                })()}
              </div>
              <input
                type="datetime-local"
                required
                value={posForm.end_time}
                onChange={(e) => setPosForm({ ...posForm, end_time: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Return Drop-Off Station Hub
              </label>
              <select
                value={posForm.dropoff_hub_id || selectedHubId}
                onChange={(e) => setPosForm({ ...posForm, dropoff_hub_id: e.target.value })}
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
                Counter Payment Mode Collected
              </label>
              <select
                value={posForm.payment_method}
                onChange={(e) => setPosForm({ ...posForm, payment_method: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="CARD_SWIPE">EDC POS Card Swipe</option>
                <option value="UPI_COUNTER">Counter UPI Dynamic QR</option>
                <option value="CASH">Cash Front Desk</option>
              </select>
            </div>
          </div>

          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-neutral-800 pb-2 pt-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>3. Digital Pre-Trip Inspection & Condition Photos</span>
            </span>
            <span className="text-[10px] text-neutral-400 normal-case font-normal">
              (Up to 10 photos: Odometer, exterior 360°, fuel gauge)
            </span>
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block">
                    Upload Vehicle Condition Photos
                  </label>
                  <span className="text-[11px] text-neutral-500">
                    Snap or upload pre-trip vehicle condition pictures before handing keys to the customer.
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Pre-Trip Handover Notes & Odometer Reading
              </label>
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
                <span className="font-semibold text-white">Flag Existing Minor Scratches or Marks</span>
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
