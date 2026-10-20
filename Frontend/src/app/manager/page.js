"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import {
  Building2,
  Car,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  Camera,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Phone,
  Upload,
  RefreshCw,
  X,
  Eye,
  ZoomIn,
  Image as ImageIcon,
  Receipt,
  IndianRupee,
  ShieldCheck,
  FileText,
  UserCheck,
} from "lucide-react";

export default function ManagerDispatchPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Inspection Modal State
  const [inspectionModal, setInspectionModal] = useState(null); // { booking, type: 'PRE_TRIP' | 'POST_TRIP' }
  const [submittingInspection, setSubmittingInspection] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [damageFlagged, setDamageFlagged] = useState(false);
  const [damageSeverity, setDamageSeverity] = useState("MINOR");
  const [requiresMaintenance, setRequiresMaintenance] = useState(false);
  const [inspectionFiles, setInspectionFiles] = useState([]);
  const [inspectionError, setInspectionError] = useState("");
  const [inspectionSuccess, setInspectionSuccess] = useState("");

  // Pre-Trip Reference Data for Post-Trip Return
  const [preTripReport, setPreTripReport] = useState(null);
  const [loadingPreTrip, setLoadingPreTrip] = useState(false);
  const [selectedZoomPhoto, setSelectedZoomPhoto] = useState(null);

  // Counter KYC Verification State
  const [approvingKyc, setApprovingKyc] = useState(false);
  const [kycActionMessage, setKycActionMessage] = useState("");

  // Resolve Station Hub Details
  const resolveStationHub = useCallback(async (overrideHubId = null) => {
    try {
      const res = await api.get("/hubs");
      if (res.data?.success) {
        const hubs = res.data.data || [];
        let target = null;
        if (overrideHubId) {
          target = hubs.find((h) => h.hubId === overrideHubId);
        } else if (user?.role === "HUB_ADMIN") {
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
      console.error("Failed to resolve station hub:", err);
    }
  }, [user]);

  // Fetch Dashboard Action Desk Data
  const fetchDashboard = useCallback(async () => {
    if (!selectedHubId && user?.role !== "HUB_ADMIN") return;
    setLoadingDashboard(true);
    setDashboardError("");
    try {
      const url = selectedHubId
        ? `/hub-admin/dashboard?hubId=${selectedHubId}`
        : "/hub-admin/dashboard";
      const res = await api.get(url);
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      setDashboardError(
        err.response?.data?.message || "Failed to load station action desk."
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, [selectedHubId, user]);

  useEffect(() => {
    const handleSuperadminHubChange = (e) => {
      if (e.detail) {
        setSelectedHubId(e.detail);
        resolveStationHub(e.detail);
      }
    };
    window.addEventListener("superadmin-hub-change", handleSuperadminHubChange);
    return () => window.removeEventListener("superadmin-hub-change", handleSuperadminHubChange);
  }, [resolveStationHub]);

  useEffect(() => {
    if (isAuthenticated) {
      resolveStationHub();
    }
  }, [isAuthenticated, resolveStationHub]);

  useEffect(() => {
    if (selectedHubId) {
      fetchDashboard();
    }
  }, [selectedHubId, fetchDashboard]);

  // Fetch Pre-Trip Handover Data when Post-Trip modal is active
  useEffect(() => {
    if (inspectionModal?.type === "POST_TRIP" && inspectionModal.booking?.bookingId) {
      setLoadingPreTrip(true);
      api
        .get(`/inspections/${inspectionModal.booking.bookingId}`)
        .then((res) => {
          if (res.data?.success) {
            const list = res.data.data || [];
            const preTrip = list.find((i) => i.type === "PRE_TRIP");
            setPreTripReport(preTrip || null);
          }
        })
        .catch((err) => {
          console.error("Failed to load pre-trip inspection:", err);
          setPreTripReport(null);
        })
        .finally(() => setLoadingPreTrip(false));
    } else {
      setPreTripReport(null);
    }
  }, [inspectionModal]);

  // Handle Submit Inspection
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!inspectionModal) return;
    setSubmittingInspection(true);
    setInspectionError("");
    setInspectionSuccess("");

    try {
      const formData = new FormData();
      formData.append("type", inspectionModal.type);
      formData.append("notes", inspectionNotes || "Routine station handover checklist completed.");
      formData.append("damage_flagged", damageFlagged);
      if (damageFlagged) {
        formData.append("damage_severity", damageSeverity);
      }
      formData.append("requires_maintenance", requiresMaintenance);

      inspectionFiles.forEach((file) => {
        formData.append("photos", file);
      });

      const res = await api.post(
        `/inspections/${inspectionModal.booking.bookingId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data?.success) {
        setInspectionSuccess(
          inspectionModal.type === "PRE_TRIP"
            ? "Pre-Trip Inspection Verified! Vehicle marked IN_USE & booking set to ACTIVE_TRIP."
            : "Return Check-In Processed! Booking completed and settlement recorded."
        );
        setTimeout(() => {
          setInspectionModal(null);
          setInspectionFiles([]);
          setInspectionNotes("");
          setDamageFlagged(false);
          setRequiresMaintenance(false);
          setInspectionSuccess("");
          fetchDashboard();
        }, 1500);
      }
    } catch (err) {
      setInspectionError(
        err.response?.data?.message || "Failed to submit digital inspection checklist."
      );
    } finally {
      setSubmittingInspection(false);
    }
  };

  // Fast-track counter KYC verification handler
  const handleApproveKycAtCounter = async (userId) => {
    setApprovingKyc(true);
    setKycActionMessage("");
    try {
      const res = await api.patch(`/admin/users/${userId}/kyc`, {
        status: "VERIFIED",
      });
      if (res.data?.success) {
        setKycActionMessage("KYC Document Verified and Approved at Station Desk!");
        if (inspectionModal?.booking?.Customer) {
          inspectionModal.booking.Customer.kyc_status = "VERIFIED";
        }
        setTimeout(() => {
          setKycActionMessage("");
          fetchDashboard();
        }, 1200);
      }
    } catch (err) {
      setKycActionMessage(err.response?.data?.message || "Failed to update customer KYC status.");
    } finally {
      setApprovingKyc(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="text-xs text-neutral-400 font-medium">Loading Dispatch Workstation...</span>
      </div>
    );
  }

  const actionDesk = dashboardData?.action_desk;
  const fleetHealth = dashboardData?.local_fleet_health;

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Station: {currentHub?.name || "Assigned Station"}</span>
            <span>•</span>
            <span className="text-neutral-400">{currentHub?.city}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Daily Dispatch Action Desk
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Active departures, scheduled returns, and overdue alerts for today&apos;s operating window.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loadingDashboard}
          className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh Live Action Desk"
        >
          <RefreshCw className={`w-4 h-4 ${loadingDashboard ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      {dashboardError && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{dashboardError}</span>
        </div>
      )}

      {/* Metric Strip: Lot Health & Capacity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Ready on Lot
          </span>
          <p className="text-3xl font-black text-white">
            {fleetHealth?.ready_to_rent ?? 0}
          </p>
          <span className="text-[10px] text-neutral-500">Sanitized & Available for Dispatch</span>
        </div>

        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            In-Use on Road
          </span>
          <p className="text-3xl font-black text-white">
            {fleetHealth?.in_use ?? 0}
          </p>
          <span className="text-[10px] text-neutral-500">Active Customer Rentals</span>
        </div>

        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Maintenance / Buffer
          </span>
          <p className="text-3xl font-black text-white">
            {fleetHealth?.in_maintenance ?? 0}
          </p>
          <span className="text-[10px] text-neutral-500">Service Bay or Cleaning Buffer</span>
        </div>

        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-1 shadow-sm">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
            Physical Lot Capacity
          </span>
          <p className="text-3xl font-black text-white">
            {fleetHealth?.total_on_lot ?? 0}
          </p>
          <span className="text-[10px] text-neutral-500">Vehicles Physically at Station</span>
        </div>
      </div>

      {/* OVERDUE RETURNS ALERT */}
      {actionDesk?.action_required_overdue?.length > 0 && (
        <div className="p-5 rounded-3xl bg-red-950/30 border border-red-800/60 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Action Required: Overdue Returns ({actionDesk.action_required_overdue.length})</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-red-900/60 text-red-200">
              Late-Fees Accruing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actionDesk.action_required_overdue.map((booking) => (
              <div
                key={booking.bookingId}
                className="p-4 rounded-2xl bg-black/60 border border-red-900/40 flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-sm">
                      {booking.Vehicle?.make} {booking.Vehicle?.model}
                    </span>
                    <span className="font-mono text-red-400 font-bold">
                      {booking.Vehicle?.plate_number}
                    </span>
                  </div>
                  <div className="text-neutral-400 space-y-1">
                    <p>
                      Driver: <strong className="text-white">{booking.Customer?.name}</strong> ({booking.Customer?.phone})
                    </p>
                    <p className="text-[11px] text-red-300">
                      Scheduled Return:{" "}
                      {new Date(booking.end_time).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {(() => {
                      const hoursLate = Math.max(
                        1,
                        Math.ceil((Date.now() - new Date(booking.end_time).getTime()) / (1000 * 60 * 60))
                      );
                      const penalty = hoursLate * 1000;
                      return (
                        <div className="flex items-center justify-between text-[11px] bg-red-950/80 border border-red-800/60 rounded-xl px-2.5 py-1.5 mt-1 text-red-300">
                          <span className="font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-red-400" />
                            Overdue Duration:
                          </span>
                          <span className="font-bold text-red-200 font-mono">
                            +{hoursLate}h late • ₹{penalty.toLocaleString("en-IN")} Due
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-900">
                  <a
                    href={`tel:${booking.Customer?.phone}`}
                    className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-center font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Call Driver</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setInspectionModal({ booking, type: "POST_TRIP" })}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Process Return Check-In
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TODAY'S CONFIRMED PICKUPS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-400" />
            <span>Today&apos;s Scheduled Pickups</span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-xs font-semibold">
              {actionDesk?.pending_pickups?.length || 0}
            </span>
          </h2>
        </div>

        {actionDesk?.pending_pickups?.length === 0 ? (
          <div className="py-12 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">All Scheduled Departures Cleared</p>
            <p className="text-xs text-neutral-500">No pending handovers remaining for today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionDesk?.pending_pickups?.map((booking) => (
              <div
                key={booking.bookingId}
                className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                      Ref: {booking.bookingId.slice(0, 8)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      CONFIRMED
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">
                      {booking.Vehicle?.make} {booking.Vehicle?.model}
                    </h3>
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      {booking.Vehicle?.plate_number}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>Customer:</span>
                      <span className="text-white font-medium">{booking.Customer?.name}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Phone:</span>
                      <span className="text-white font-medium">{booking.Customer?.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Handover Time:</span>
                      <span className="text-emerald-400 font-semibold">
                        {new Date(booking.start_time).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* KYC Verification Badge */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-neutral-900">
                      <span className="text-neutral-400">KYC Status:</span>
                      {booking.Customer?.kyc_status === "VERIFIED" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          KYC Verified
                        </span>
                      ) : booking.Customer?.kyc_status === "REJECTED" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-full">
                          <ShieldAlert className="w-3 h-3" />
                          KYC Rejected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3 h-3" />
                          KYC Pending
                        </span>
                      )}
                    </div>

                    {booking.Customer?.kyc_document_url && (
                      <button
                        type="button"
                        onClick={() => setSelectedZoomPhoto(booking.Customer.kyc_document_url)}
                        className="w-full mt-1 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[11px] font-medium text-blue-400 flex items-center justify-center gap-1 transition-colors cursor-pointer border border-neutral-800/80"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Inspect Driving License Photo</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectionModal({ booking, type: "PRE_TRIP" })}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Conduct Pre-Trip Handover</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TODAY'S INBOUND RETURNS */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>Today&apos;s Expected Returns</span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-xs font-semibold">
              {actionDesk?.pending_dropoffs?.length || 0}
            </span>
          </h2>
        </div>

        {actionDesk?.pending_dropoffs?.length === 0 ? (
          <div className="py-12 rounded-3xl bg-neutral-900/40 border border-neutral-800/60 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">No Remaining Returns Scheduled Today</p>
            <p className="text-xs text-neutral-500">All inbound vehicles have been checked in.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionDesk?.pending_dropoffs?.map((booking) => (
              <div
                key={booking.bookingId}
                className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                      Ref: {booking.bookingId.slice(0, 8)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                      ACTIVE_TRIP
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">
                      {booking.Vehicle?.make} {booking.Vehicle?.model}
                    </h3>
                    <span className="font-mono text-xs font-semibold text-blue-400">
                      {booking.Vehicle?.plate_number}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>Driver:</span>
                      <span className="text-white font-medium">{booking.Customer?.name}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Phone:</span>
                      <span className="text-white font-medium">{booking.Customer?.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Return Time:</span>
                      <span className="text-blue-400 font-semibold">
                        {new Date(booking.end_time).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectionModal({ booking, type: "POST_TRIP" })}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Process Return Check-In</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DIGITAL INSPECTION MODAL */}
      {inspectionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    inspectionModal.type === "PRE_TRIP"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {inspectionModal.type === "PRE_TRIP"
                      ? "Pre-Trip Handover Inspection"
                      : "Post-Trip Return Check-In"}
                  </h3>
                  <span className="text-xs text-neutral-400">
                    {inspectionModal.booking?.Vehicle?.make} {inspectionModal.booking?.Vehicle?.model} (
                    {inspectionModal.booking?.Vehicle?.plate_number})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectionModal(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectionError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{inspectionError}</span>
              </div>
            )}

            {inspectionSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{inspectionSuccess}</span>
              </div>
            )}

            {/* PRE-TRIP DRIVER KYC & IDENTITY CHECK */}
            {inspectionModal.type === "PRE_TRIP" && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Driver Identity & License Verification</span>
                  </span>
                  {inspectionModal.booking.Customer?.kyc_status === "VERIFIED" ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      KYC Approved
                    </span>
                  ) : inspectionModal.booking.Customer?.kyc_status === "REJECTED" ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      KYC Rejected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-400 flex items-center gap-1 animate-pulse">
                      <Clock className="w-3 h-3" />
                      Pending Counter Review
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80">
                  <div>
                    <span className="text-white font-bold block">{inspectionModal.booking.Customer?.name}</span>
                    <span className="text-neutral-400 text-[11px] block">
                      {inspectionModal.booking.Customer?.phone} • {inspectionModal.booking.Customer?.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {inspectionModal.booking.Customer?.kyc_document_url ? (
                      <button
                        type="button"
                        onClick={() => setSelectedZoomPhoto(inspectionModal.booking.Customer.kyc_document_url)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>View DL Photo</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-neutral-500 italic">No license image on file</span>
                    )}

                    {inspectionModal.booking.Customer?.kyc_status !== "VERIFIED" && (
                      <button
                        type="button"
                        onClick={() => handleApproveKycAtCounter(inspectionModal.booking.Customer?.userId)}
                        disabled={approvingKyc}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {approvingKyc ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        <span>Approve KYC at Desk</span>
                      </button>
                    )}
                  </div>
                </div>

                {kycActionMessage && (
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {kycActionMessage}
                  </p>
                )}
              </div>
            )}

            {/* OVERDUE RETURN PENALTY SETTLEMENT BREAKDOWN */}
            {inspectionModal.type === "POST_TRIP" &&
              inspectionModal.booking?.end_time &&
              new Date() > new Date(inspectionModal.booking.end_time) && (() => {
                const hoursLate = Math.max(
                  1,
                  Math.ceil((Date.now() - new Date(inspectionModal.booking.end_time).getTime()) / (1000 * 60 * 60))
                );
                const lateFeeAmount = hoursLate * 1000;
                const isPosBooking = Boolean(
                  inspectionModal.booking?.incident_notes?.toLowerCase().includes("pos") ||
                  inspectionModal.booking?.incident_notes?.toLowerCase().includes("walk-in")
                );

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/60 via-red-900/20 to-neutral-950 border border-red-700/60 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-red-200">
                          Overdue Return Penalty Settlement
                        </span>
                      </div>
                      <span className="text-xs font-black font-mono px-3 py-1 rounded-full bg-red-900/80 text-white border border-red-600 shadow-sm">
                        ₹{lateFeeAmount.toLocaleString("en-IN")} Penalty Due
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-black/60 border border-neutral-800">
                        <span className="text-[10px] text-neutral-400 block font-medium">Scheduled Return</span>
                        <span className="text-white font-semibold">
                          {new Date(inspectionModal.booking.end_time).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/60 border border-neutral-800">
                        <span className="text-[10px] text-neutral-400 block font-medium">Time Overdue</span>
                        <span className="text-red-400 font-bold">
                          +{hoursLate} {hoursLate === 1 ? "Hour" : "Hours"} (₹1,000/hr)
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/60 border border-neutral-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-neutral-400 block font-medium">Payment Protocol</span>
                        <span className="text-emerald-400 font-bold">
                          {isPosBooking ? "Counter Cash / UPI / Card" : "Wallet Auto-Debit"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-red-950/70 border border-red-800/50 text-[11px] text-red-200 flex items-start gap-2.5">
                      <Receipt className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        {isPosBooking ? (
                          <span>
                            <strong>Counter Action Required:</strong> Driver booked at walk-in POS counter. Please collect <strong className="text-white">₹{lateFeeAmount.toLocaleString("en-IN")}</strong> via Cash, UPI QR code, or Card terminal before completing vehicle return check-in.
                          </span>
                        ) : (
                          <span>
                            <strong>Automated Settlement:</strong> <strong className="text-white">₹{lateFeeAmount.toLocaleString("en-IN")}</strong> will be automatically charged to <strong className="text-white">{inspectionModal.booking.Customer?.name || "driver"}</strong>&apos;s registered ShiftDrive Wallet upon completing this return checklist.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* PRE-TRIP HANDOVER COMPARISON REFERENCE */}
            {inspectionModal.type === "POST_TRIP" && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Pre-Trip Handover Reference (Departure Condition)</span>
                  </span>
                  {preTripReport?.damage_flagged ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-400">
                      Existing Damage Noted ({preTripReport.damage_severity})
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
                      Clean Handover at Departure
                    </span>
                  )}
                </div>

                {loadingPreTrip ? (
                  <div className="py-4 text-center text-xs text-neutral-400 space-y-1">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-400" />
                    <p>Loading departure photos & notes...</p>
                  </div>
                ) : preTripReport ? (
                  <div className="space-y-2.5">
                    {preTripReport.notes && (
                      <p className="text-xs text-neutral-300 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                        <strong className="text-neutral-400 block text-[10px] uppercase font-semibold">Departure Notes:</strong>
                        {preTripReport.notes}
                      </p>
                    )}

                    {preTripReport.images?.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-neutral-400 block">
                          Departure Inspection Photos ({preTripReport.images.length}) • Click to enlarge
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {preTripReport.images.map((imgUrl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedZoomPhoto(imgUrl)}
                              className="relative aspect-video rounded-lg overflow-hidden border border-neutral-800 group hover:border-blue-500 transition-all cursor-pointer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgUrl}
                                alt={`Pre-trip photo ${i + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500 italic">No departure photographs attached to this contract.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic">No digital pre-trip inspection found for this booking.</p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitInspection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Attach Return Check-In Photographs (Up to 10 photos)
                </label>
                <div className="p-4 rounded-2xl border-2 border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-center space-y-2 cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setInspectionFiles(Array.from(e.target.files || []))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-neutral-500 mx-auto" />
                  <p className="text-xs text-neutral-400">
                    {inspectionFiles.length > 0
                      ? `${inspectionFiles.length} file(s) selected`
                      : "Drag & drop or tap to take photos"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Condition Notes & Odometer / Fuel Check
                </label>
                <textarea
                  rows={3}
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="e.g. Odometer: 14,250 km. Fuel tank: 100% full. Exterior clean."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {inspectionModal.type === "POST_TRIP" && (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-300">
                      Flag New Damage Incurred During Trip?
                    </span>
                    <input
                      type="checkbox"
                      checked={damageFlagged}
                      onChange={(e) => setDamageFlagged(e.target.checked)}
                      className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                    />
                  </div>

                  {damageFlagged && (
                    <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-red-400">
                          Damage Severity Tier (Auto-Charged to Customer Wallet)
                        </label>
                        <select
                          value={damageSeverity}
                          onChange={(e) => setDamageSeverity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-red-900/40 text-xs text-red-200 focus:outline-none cursor-pointer"
                        >
                          <option value="MINOR">MINOR (₹1,000 - Scratches / scuffs)</option>
                          <option value="MAJOR">MAJOR (₹5,000 - Dents / deep paint)</option>
                          <option value="CRITICAL">CRITICAL (₹15,000 - Collision / structural)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-neutral-400">
                          Route Vehicle Directly to Maintenance Bay?
                        </span>
                        <input
                          type="checkbox"
                          checked={requiresMaintenance}
                          onChange={(e) => setRequiresMaintenance(e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectionModal(null)}
                  disabled={submittingInspection}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInspection}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    inspectionModal.type === "PRE_TRIP"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                  }`}
                >
                  {submittingInspection ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Checklist...</span>
                    </>
                  ) : inspectionModal.type === "PRE_TRIP" ? (
                    <span>Confirm Handover & Dispatch</span>
                  ) : (
                    <span>Complete Return Check-In</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {selectedZoomPhoto && (
        <div
          onClick={() => setSelectedZoomPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedZoomPhoto}
              alt="Inspection photo zoom"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-neutral-800 shadow-2xl"
            />
            <p className="text-xs text-neutral-400 mt-3">Click anywhere to close preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
