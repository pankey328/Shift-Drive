"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import api from "@/api";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Clock,
  MapPin,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  UserCheck,
  ShieldAlert,
  Car,
  TrendingUp,
  Search,
  ExternalLink,
  Gauge,
  Wrench,
  ShieldCheck,
  Phone,
  Mail,
  AlertOctagon,
  ChevronDown,
  Calendar,
  IndianRupee,
  Compass,
  Edit3,
} from "lucide-react";

function HubInfoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hubs, setHubs] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Hub
  const [selectedHubId, setSelectedHubId] = useState(searchParams.get("hubId") || "");
  const [inspectLoading, setInspectLoading] = useState(false);
  const [hubDashboardData, setHubDashboardData] = useState(null);
  const [hubFleetData, setHubFleetData] = useState(null);

  // Fleet table filtering
  const [fleetTabFilter, setFleetTabFilter] = useState("ALL"); // ALL, ACTIVE, IN_USE, MAINTENANCE, RETIRED
  const [fleetSearchQuery, setFleetSearchQuery] = useState("");
  const [actionDeskTab, setActionDeskTab] = useState("pickups"); // pickups, dropoffs, overdue, emergencies

  // Assign Manager Modal
  const [assigningHub, setAssigningHub] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  // Edit Hub Manager Modal
  const [editingManager, setEditingManager] = useState(null);
  const [editManagerForm, setEditManagerForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [savingManager, setSavingManager] = useState(false);
  const [editManagerError, setEditManagerError] = useState("");
  const [editManagerSuccess, setEditManagerSuccess] = useState("");

  // Load all hubs & managers
  const fetchHubs = useCallback(async () => {
    setLoading(true);
    try {
      const [hubsRes, usersRes] = await Promise.all([
        api.get("/hubs"),
        api.get("/admin/users?role=HUB_ADMIN"),
      ]);

      if (hubsRes.data?.success) {
        const loadedHubs = hubsRes.data.data || [];
        setHubs(loadedHubs);

        const urlHubId = searchParams.get("hubId");
        if (urlHubId && loadedHubs.some((h) => h.hubId === urlHubId)) {
          setSelectedHubId(urlHubId);
        } else if (loadedHubs.length > 0) {
          const defaultHubId = selectedHubId && loadedHubs.some((h) => h.hubId === selectedHubId)
            ? selectedHubId
            : loadedHubs[0].hubId;
          setSelectedHubId(defaultHubId);
          router.replace(`/admin/hub-info?hubId=${defaultHubId}`, { scroll: false });
        }
      }
      if (usersRes.data?.success) {
        setManagersList(usersRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load hubs & managers:", err);
    } finally {
      setLoading(false);
    }
  }, [searchParams, selectedHubId, router]);

  useEffect(() => {
    fetchHubs();
  }, [fetchHubs]);

  // Synchronize when URL search param changes
  useEffect(() => {
    const urlHubId = searchParams.get("hubId");
    if (urlHubId && urlHubId !== selectedHubId) {
      setSelectedHubId(urlHubId);
    }
  }, [searchParams, selectedHubId]);

  // Load detailed telemetry and fleet when selectedHubId changes
  const fetchHubDetails = useCallback(async (hubId) => {
    if (!hubId) return;
    setInspectLoading(true);
    try {
      const [dashRes, fleetRes] = await Promise.all([
        api.get(`/hub-admin/dashboard?hubId=${hubId}`),
        api.get(`/vehicles/admin/hub/${hubId}`),
      ]);

      if (dashRes.data?.success) {
        setHubDashboardData(dashRes.data.data);
      }
      if (fleetRes.data?.success) {
        setHubFleetData(fleetRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch hub deep-dive details:", err);
    } finally {
      setInspectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedHubId) {
      fetchHubDetails(selectedHubId);
    }
  }, [selectedHubId, fetchHubDetails]);

  // Handle dropdown selection change
  const handleSelectHub = (hubId) => {
    setSelectedHubId(hubId);
    router.replace(`/admin/hub-info?hubId=${hubId}`, { scroll: false });
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    if (!assigningHub) return;
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");

    try {
      const res = await api.patch(`/hubs/${assigningHub.hubId}/manager`, {
        managerId: selectedManagerId || null,
      });

      if (res.data?.success) {
        setAssignSuccess(res.data.message || "Manager assignment updated.");
        setTimeout(() => {
          setAssigningHub(null);
          setAssignSuccess("");
          fetchHubs();
          if (selectedHubId) {
            fetchHubDetails(selectedHubId);
          }
        }, 1200);
      }
    } catch (err) {
      setAssignError(err.response?.data?.message || "Failed to assign station manager.");
    } finally {
      setAssigning(false);
    }
  };

  // Open Edit Manager Profile Modal
  const handleOpenEditManager = (manager) => {
    if (!manager) return;
    setEditingManager(manager);
    setEditManagerForm({
      name: manager.name || "",
      email: manager.email || "",
      phone: manager.phone || "",
      password: "",
    });
    setEditManagerError("");
    setEditManagerSuccess("");
  };

  // Save Edit Manager Profile
  const handleSaveManager = async (e) => {
    e.preventDefault();
    if (!editingManager) return;
    setSavingManager(true);
    setEditManagerError("");
    setEditManagerSuccess("");

    try {
      const payload = {
        name: editManagerForm.name.trim(),
        email: editManagerForm.email.trim().toLowerCase(),
        phone: editManagerForm.phone ? editManagerForm.phone.trim() : null,
      };
      if (editManagerForm.password && editManagerForm.password.trim()) {
        payload.password = editManagerForm.password.trim();
      }

      const res = await api.put(`/admin/users/${editingManager.userId}`, payload);
      if (res.data?.success) {
        setEditManagerSuccess("Manager details updated successfully!");
        setTimeout(() => {
          setEditingManager(null);
          setEditManagerSuccess("");
          fetchHubs();
          if (selectedHubId) {
            fetchHubDetails(selectedHubId);
          }
        }, 1200);
      }
    } catch (err) {
      setEditManagerError(err.response?.data?.message || "Failed to update manager details.");
    } finally {
      setSavingManager(false);
    }
  };

  // Active hub object
  const activeHub = hubs.find((h) => h.hubId === selectedHubId) || hubs[0] || null;

  // Real-time Operating Status
  const getOperatingStatus = (opening, closing) => {
    if (!opening || !closing) return { isOpen: false, text: "Hours Not Set" };
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const currentTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const isOpen = currentTimeStr >= opening && currentTimeStr <= closing;
    return {
      isOpen,
      text: isOpen ? "Open Now" : "Closed",
    };
  };

  const opStatus = activeHub
    ? getOperatingStatus(activeHub.opening_time, activeHub.closing_time)
    : { isOpen: false, text: "Closed" };

  // Vehicles list filtering
  const allVehicles = hubFleetData?.data || [];
  const filteredVehicles = allVehicles.filter((v) => {
    const matchesTab = fleetTabFilter === "ALL" || v.status === fleetTabFilter;
    const query = fleetSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      v.plate_number?.toLowerCase().includes(query) ||
      v.model?.toLowerCase().includes(query) ||
      v.make?.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const fleetSummary = hubFleetData?.summary || {
    total_cars: allVehicles.length,
    operational_cars: allVehicles.filter((v) => v.status === "ACTIVE").length,
    in_use_cars: allVehicles.filter((v) => v.status === "IN_USE").length,
    maintenance_cars: allVehicles.filter((v) => v.status === "MAINTENANCE").length,
    retired_cars: allVehicles.filter((v) => v.status === "RETIRED").length,
    hub_revenue: 0,
  };

  const fleetHealth = hubDashboardData?.local_fleet_health || {
    ready_to_rent: fleetSummary.operational_cars,
    in_maintenance: fleetSummary.maintenance_cars,
    in_use: fleetSummary.in_use_cars,
    total_on_lot: fleetSummary.operational_cars + fleetSummary.maintenance_cars,
    station_capacity: activeHub?.capacity || 20,
    available_bays: Math.max(0, (activeHub?.capacity || 20) - (fleetSummary.operational_cars + fleetSummary.maintenance_cars)),
    occupancy_rate: Math.round(
      ((fleetSummary.operational_cars + fleetSummary.maintenance_cars) / (activeHub?.capacity || 20)) * 100
    ),
    rebalance_status: "BALANCED",
    rebalance_message: "Station parking capacity and lot inventory are within optimal operational thresholds.",
  };

  const actionDesk = hubDashboardData?.action_desk || {
    pending_pickups: [],
    pending_dropoffs: [],
    action_required_overdue: [],
    emergency_alerts: [],
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Compass className="w-4 h-4" />
            <span>Station Intelligence & Telemetry</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hub Telemetry & Fleet Dossier
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Select any station hub to inspect real-time bay occupancy, lot capacity, staff dossier, and stationed fleet inventory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              fetchHubs();
              if (selectedHubId) fetchHubDetails(selectedHubId);
            }}
            disabled={loading || inspectLoading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Refresh Station Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading || inspectLoading ? "animate-spin text-purple-400" : ""}`}
            />
          </button>
          <Link
            href="/admin/hubs"
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors flex items-center gap-2"
          >
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>All Stations Directory</span>
          </Link>
        </div>
      </div>

      {/* Prominent Station Selector Bar */}
      <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-neutral-300 flex items-center gap-2 whitespace-nowrap">
            <MapPin className="w-4 h-4 text-purple-400" />
            <span>Select Station Hub:</span>
          </label>
          <div className="relative flex-1 max-w-lg">
            <select
              value={selectedHubId}
              onChange={(e) => handleSelectHub(e.target.value)}
              disabled={loading || hubs.length === 0}
              className="w-full appearance-none px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm font-semibold text-white focus:outline-none focus:border-purple-500 cursor-pointer pr-10 shadow-inner"
            >
              {hubs.map((hub) => (
                <option key={hub.hubId} value={hub.hubId}>
                  {hub.name} ({hub.city}) &bull; {hub.capacity || 20} Bays
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {activeHub && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-mono text-neutral-400">
              City: <strong className="text-white">{activeHub.city}</strong>
            </span>
            <span className="text-neutral-700">&bull;</span>
            <span className="text-[11px] font-mono text-neutral-400">
              Cap: <strong className="text-white">{activeHub.capacity || 20} Bays</strong>
            </span>
          </div>
        )}
      </div>

      {/* Body Content */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Loading station intelligence...</p>
        </div>
      ) : !activeHub ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <Building2 className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No Station Hubs Found</p>
          <Link
            href="/admin/hubs"
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-block"
          >
            Provision Station Hubs First
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Station Hero Card */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 relative overflow-hidden shadow-sm">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300">
                    {activeHub.city}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${opStatus.isOpen
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${opStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                        }`}
                    />
                    <span>{opStatus.text}</span>
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-400 px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
                    ID: {activeHub.hubId?.slice(0, 8)}...
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {activeHub.name}
                  </h2>
                  <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                    <span>{activeHub.address}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>
                      Operating Hours:{" "}
                      <strong className="text-white">{activeHub.opening_time?.slice(0, 5)}</strong> to{" "}
                      <strong className="text-white">{activeHub.closing_time?.slice(0, 5)}</strong>
                    </span>
                  </div>
                  <span className="text-neutral-700">&bull;</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      Station Manager:{" "}
                      <strong className="text-white">
                        {activeHub.Manager?.name || "Unassigned"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap lg:flex-col gap-2.5 justify-end">
                {activeHub.Manager && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditManager(activeHub.Manager)}
                    className="px-4 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                    title="Edit Hub Manager Profile & Credentials"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Edit Manager Info</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAssigningHub(activeHub);
                    setSelectedManagerId(activeHub.manager_id || "");
                    setAssignError("");
                    setAssignSuccess("");
                  }}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Reassign Manager</span>
                </button>

                <Link
                  href={`/manager?hubId=${activeHub.hubId}`}
                  target="_blank"
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20"
                  title="Launch Live Operations & Station Dispatch Desk"
                >
                  <span>Open Station Desk</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Real-Time Telemetry Strip (4 Metric Tiles) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bay Occupancy Meter */}
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  <span>Bay Occupancy</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${fleetHealth.occupancy_rate >= 85
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : fleetHealth.occupancy_rate >= 70
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    }`}
                >
                  {fleetHealth.occupancy_rate}%
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-white">
                  {fleetHealth.total_on_lot}{" "}
                  <span className="text-xs font-semibold text-neutral-400">
                    / {fleetHealth.station_capacity} Bays
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {fleetHealth.available_bays} parking bays open for returns
                </p>
              </div>

              {/* Visual meter bar */}
              <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className={`h-full transition-all duration-500 ${fleetHealth.occupancy_rate >= 85
                      ? "bg-red-500"
                      : fleetHealth.occupancy_rate >= 70
                        ? "bg-amber-500"
                        : "bg-purple-500"
                    }`}
                  style={{ width: `${Math.min(100, fleetHealth.occupancy_rate)}%` }}
                />
              </div>
            </div>

            {/* Station Fleet Summary */}
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-purple-400" />
                  <span>Station Fleet</span>
                </span>
                <span className="text-[11px] font-mono text-purple-300 font-bold px-2 py-0.5 rounded-md bg-purple-500/10">
                  {fleetSummary.total_cars} Assigned
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-white">
                  {fleetSummary.operational_cars}{" "}
                  <span className="text-xs font-semibold text-neutral-400">Ready on Lot</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                  <span className="text-blue-400 font-semibold">
                    {fleetSummary.in_use_cars} On Trip
                  </span>
                  <span>&bull;</span>
                  <span className="text-amber-400 font-semibold">
                    {fleetSummary.maintenance_cars} In Bay
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-neutral-500">
                Fleet deployment efficiency:{" "}
                <strong className="text-neutral-300">
                  {fleetSummary.total_cars > 0
                    ? Math.round(
                      ((fleetSummary.operational_cars + fleetSummary.in_use_cars) /
                        fleetSummary.total_cars) *
                      100
                    )
                    : 0}
                  % operational
                </strong>
              </div>
            </div>

            {/* Hub Revenue Yield */}
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  <span>Station Gross Yield</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Completed Trips
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-white">
                  ₹{Number(fleetSummary.hub_revenue || 0).toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Cumulative rentals dispatched from this hub
                </p>
              </div>

              <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>Station lifecycle revenue tally</span>
              </div>
            </div>

            {/* Today's Action Queue */}
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Today&apos;s Dispatch Queue</span>
                </span>
                {actionDesk.emergency_alerts?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-mono text-[10px] font-bold animate-pulse">
                    {actionDesk.emergency_alerts.length} SOS
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Pickups</span>
                  <span className="text-base font-bold text-white">
                    {actionDesk.pending_pickups?.length || 0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Returns</span>
                  <span className="text-base font-bold text-white">
                    {actionDesk.pending_dropoffs?.length || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Overdue: {actionDesk.action_required_overdue?.length || 0}</span>
                <span className="text-purple-400 font-semibold">Live synced</span>
              </div>
            </div>
          </div>

          {/* Rebalance & Bay Congestion Advisory Banner */}
          {fleetHealth.rebalance_message && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${fleetHealth.rebalance_status === "OVERCAPACITY_RISK"
                  ? "bg-red-950/20 border-red-800/60 text-red-300"
                  : fleetHealth.rebalance_status === "LOW_STOCK_RISK"
                    ? "bg-amber-950/20 border-amber-800/60 text-amber-300"
                    : "bg-emerald-950/20 border-emerald-800/60 text-emerald-300"
                }`}
            >
              {fleetHealth.rebalance_status === "OVERCAPACITY_RISK" ? (
                <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              ) : fleetHealth.rebalance_status === "LOW_STOCK_RISK" ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <strong className="block font-bold mb-0.5">
                  {fleetHealth.rebalance_status === "OVERCAPACITY_RISK"
                    ? "Station Overcapacity Risk Warning"
                    : fleetHealth.rebalance_status === "LOW_STOCK_RISK"
                      ? "Low Inventory Stock Alert"
                      : "Lot & Inventory Balance Status"}
                </strong>
                <span>{fleetHealth.rebalance_message}</span>
              </div>
            </div>
          )}

          {/* Two-Column Section: Assigned Manager Card + Today's Schedule Desk */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manager Dossier Card (1 col) */}
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Assigned Station Manager</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAssigningHub(activeHub);
                    setSelectedManagerId(activeHub.manager_id || "");
                    setAssignError("");
                    setAssignSuccess("");
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  Edit
                </button>
              </div>

              {activeHub.Manager ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black text-sm">
                      {activeHub.Manager.name?.charAt(0) || "M"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{activeHub.Manager.name}</h4>
                      <span className="text-[10px] text-purple-400 font-mono">
                        Role: Station Hub Admin
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Mail className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="font-mono text-[11px] truncate">{activeHub.Manager.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Phone className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="font-mono text-[11px]">
                        {activeHub.Manager.phone || "No phone listed"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAssigningHub(activeHub);
                        setSelectedManagerId(activeHub.manager_id || "");
                        setAssignError("");
                        setAssignSuccess("");
                      }}
                      className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reassign Different Manager
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-white">No Manager Assigned</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      This station currently has no designated supervisor for handovers and returns.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningHub(activeHub);
                      setSelectedManagerId("");
                      setAssignError("");
                      setAssignSuccess("");
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-600/20 cursor-pointer"
                  >
                    Assign Manager Now
                  </button>
                </div>
              )}
            </div>

            {/* Today's Action Desk Drawer (2 cols) */}
            <div className="lg:col-span-2 p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Live Station Daily Schedule</h3>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActionDeskTab("pickups")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${actionDeskTab === "pickups"
                        ? "bg-purple-600 text-white"
                        : "text-neutral-400 hover:text-neutral-200"
                      }`}
                  >
                    Pickups ({actionDesk.pending_pickups?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDeskTab("dropoffs")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${actionDeskTab === "dropoffs"
                        ? "bg-purple-600 text-white"
                        : "text-neutral-400 hover:text-neutral-200"
                      }`}
                  >
                    Returns ({actionDesk.pending_dropoffs?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDeskTab("overdue")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${actionDeskTab === "overdue"
                        ? "bg-amber-600 text-white"
                        : "text-neutral-400 hover:text-neutral-200"
                      }`}
                  >
                    Overdue ({actionDesk.action_required_overdue?.length || 0})
                  </button>
                  {actionDesk.emergency_alerts?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActionDeskTab("emergencies")}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${actionDeskTab === "emergencies"
                          ? "bg-red-600 text-white"
                          : "text-red-400 hover:text-red-300"
                        }`}
                    >
                      Emergency ({actionDesk.emergency_alerts.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Action desk queue content */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {actionDeskTab === "pickups" && (
                  actionDesk.pending_pickups?.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-8 text-center">
                      No pickups scheduled for today at this hub.
                    </p>
                  ) : (
                    actionDesk.pending_pickups.map((item) => (
                      <div
                        key={item.bookingId}
                        className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">
                            {item.Customer?.name || "Customer"}
                          </span>
                          <span className="text-neutral-400 block text-[11px]">
                            {item.Vehicle?.make} {item.Vehicle?.model} ({item.Vehicle?.plate_number})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-purple-400 font-bold block">
                            {new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-[10px] text-neutral-500">Scheduled Pickup</span>
                        </div>
                      </div>
                    ))
                  )
                )}

                {actionDeskTab === "dropoffs" && (
                  actionDesk.pending_dropoffs?.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-8 text-center">
                      No vehicle returns scheduled for today at this hub.
                    </p>
                  ) : (
                    actionDesk.pending_dropoffs.map((item) => (
                      <div
                        key={item.bookingId}
                        className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">
                            {item.Customer?.name || "Customer"}
                          </span>
                          <span className="text-neutral-400 block text-[11px]">
                            {item.Vehicle?.make} {item.Vehicle?.model} ({item.Vehicle?.plate_number})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-emerald-400 font-bold block">
                            {new Date(item.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-[10px] text-neutral-500">Expected Dropoff</span>
                        </div>
                      </div>
                    ))
                  )
                )}

                {actionDeskTab === "overdue" && (
                  actionDesk.action_required_overdue?.length === 0 ? (
                    <p className="text-xs text-emerald-400 py-8 text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Zero overdue vehicles. All returns are on schedule!</span>
                    </p>
                  ) : (
                    actionDesk.action_required_overdue.map((item) => (
                      <div
                        key={item.bookingId}
                        className="p-3 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-amber-300">
                            {item.Customer?.name} ({item.Customer?.phone || "No phone"})
                          </span>
                          <span className="text-neutral-400 block text-[11px]">
                            {item.Vehicle?.make} {item.Vehicle?.model} &bull;{" "}
                            <span className="font-mono text-white">{item.Vehicle?.plate_number}</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-red-400 block">OVERDUE</span>
                          <span className="text-[10px] text-neutral-400">
                            Ended {new Date(item.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))
                  )
                )}

                {actionDeskTab === "emergencies" && (
                  actionDesk.emergency_alerts?.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-8 text-center">
                      No active emergency alerts at this station.
                    </p>
                  ) : (
                    actionDesk.emergency_alerts.map((item) => (
                      <div
                        key={item.bookingId}
                        className="p-3 rounded-2xl bg-red-950/30 border border-red-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                            <span className="font-bold text-red-300">
                              {item.Customer?.name || "Customer"}
                            </span>
                          </div>
                          <span className="text-neutral-400 block text-[11px] mt-0.5">
                            {item.Vehicle?.make} {item.Vehicle?.model} ({item.Vehicle?.plate_number})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-red-400 font-bold block">
                            ACTIVE SOS
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {item.Customer?.phone}
                          </span>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

          {/* Station Fleet Inventory Section */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-purple-400" />
                  <span>Stationed Fleet Inventory ({allVehicles.length})</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Complete list of vehicles allocated to {activeHub.name}.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter plate, make, model..."
                  value={fleetSearchQuery}
                  onChange={(e) => setFleetSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { key: "ALL", label: "All Vehicles", count: allVehicles.length },
                {
                  key: "ACTIVE",
                  label: "Ready on Lot",
                  count: allVehicles.filter((v) => v.status === "ACTIVE").length,
                },
                {
                  key: "IN_USE",
                  label: "On Road (In-Use)",
                  count: allVehicles.filter((v) => v.status === "IN_USE").length,
                },
                {
                  key: "MAINTENANCE",
                  label: "Maintenance Bay",
                  count: allVehicles.filter((v) => v.status === "MAINTENANCE").length,
                },
                {
                  key: "RETIRED",
                  label: "Retired",
                  count: allVehicles.filter((v) => v.status === "RETIRED").length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFleetTabFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${fleetTabFilter === tab.key
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                      : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${fleetTabFilter === tab.key
                        ? "bg-purple-700 text-white"
                        : "bg-neutral-800 text-neutral-400"
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Vehicles Table */}
            {inspectLoading ? (
              <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                <p>Loading fleet inventory...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="py-12 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-2 text-xs text-neutral-400">
                <Car className="w-8 h-8 text-neutral-600 mx-auto" />
                <p>No vehicles match the selected filter in this station.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
                    <tr>
                      <th className="px-4 py-3">Vehicle Details</th>
                      <th className="px-4 py-3">License Plate</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Daily Rate</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Current Driver / Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 bg-neutral-900">
                    {filteredVehicles.map((vehicle) => {
                      const activeBooking =
                        vehicle.Bookings && vehicle.Bookings.length > 0
                          ? vehicle.Bookings[0]
                          : null;

                      return (
                        <tr key={vehicle.vehicleId} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-white">
                              {vehicle.make} {vehicle.model}
                            </div>
                            <span className="text-[10px] text-neutral-500">
                              Added {new Date(vehicle.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-white">
                            <span className="px-2 py-1 rounded-md bg-neutral-950 border border-neutral-800">
                              {vehicle.plate_number}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300">
                              {vehicle.vehicle_class || "SEDAN"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">
                            ₹{Number(vehicle.base_daily_rate || 0).toLocaleString("en-IN")}
                            <span className="text-[10px] text-neutral-500 block">/day</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${vehicle.status === "ACTIVE"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : vehicle.status === "IN_USE"
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                    : vehicle.status === "MAINTENANCE"
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                      : "bg-neutral-800 border-neutral-700 text-neutral-400"
                                }`}
                            >
                              {vehicle.status === "ACTIVE"
                                ? "Ready on Lot"
                                : vehicle.status === "IN_USE"
                                  ? "On Trip"
                                  : vehicle.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {activeBooking ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-white block">
                                  {activeBooking.Customer?.name || "Customer"}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {activeBooking.Customer?.phone || activeBooking.Customer?.email}
                                </span>
                              </div>
                            ) : vehicle.status === "ACTIVE" ? (
                              <span className="text-neutral-500 text-[11px]">
                                Parked on bay &bull; Available
                              </span>
                            ) : vehicle.status === "MAINTENANCE" ? (
                              <span className="text-amber-500 text-[11px] flex items-center gap-1">
                                <Wrench className="w-3 h-3" />
                                <span>Under Inspection</span>
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-[11px]">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASSIGN MANAGER MODAL */}
      {assigningHub && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Assign Station Hub Manager</h3>
                <span className="text-xs text-neutral-400">{assigningHub.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setAssigningHub(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignManager} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Select Station Manager</label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="">-- Unassign Manager (Leave Vacant) --</option>
                  {managersList.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} &bull; {m.phone || m.email}
                    </option>
                  ))}
                </select>
              </div>

              {assignSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {assignSuccess}
                </div>
              )}

              {assignError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {assignError}
                </div>
              )}

              <button
                type="submit"
                disabled={assigning}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
              >
                {assigning ? "Updating Assignment..." : "Save Manager Assignment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HUB MANAGER PROFILE MODAL */}
      {editingManager && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-purple-400" />
                  Edit Station Manager Profile
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Modify contact details or reset password for {activeHub.name} manager.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingManager(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManager} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Manager Full Name *</label>
                <input
                  type="text"
                  required
                  value={editManagerForm.name}
                  onChange={(e) => setEditManagerForm({ ...editManagerForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editManagerForm.email}
                  onChange={(e) => setEditManagerForm({ ...editManagerForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Phone Number</label>
                <input
                  type="tel"
                  value={editManagerForm.phone}
                  onChange={(e) => setEditManagerForm({ ...editManagerForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  New Password <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="password"
                  value={editManagerForm.password}
                  onChange={(e) => setEditManagerForm({ ...editManagerForm, password: e.target.value })}
                  placeholder="Leave empty to keep existing password"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {editManagerSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{editManagerSuccess}</span>
                </div>
              )}

              {editManagerError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editManagerError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingManager(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingManager}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 cursor-pointer flex items-center gap-2"
                >
                  {savingManager && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingManager ? "Saving Changes..." : "Save Manager Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminHubInfoPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Loading station hub information...</p>
        </div>
      }
    >
      <HubInfoContent />
    </Suspense>
  );
}
