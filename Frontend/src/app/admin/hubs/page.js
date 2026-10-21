"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/api";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
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
  Compass,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function AdminHubsPage() {
  const [hubs, setHubs] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Hub Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    city: "",
    address: "",
    capacity: 20,
    opening_time: "06:00:00",
    closing_time: "23:00:00",
    manager_id: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // Assign Manager Modal
  const [assigningHub, setAssigningHub] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hubsRes, usersRes] = await Promise.all([
        api.get("/hubs"),
        api.get("/admin/users?role=HUB_ADMIN"),
      ]);

      if (hubsRes.data?.success) {
        setHubs(hubsRes.data.data || []);
      }
      if (usersRes.data?.success) {
        setManagersList(usersRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load hubs & managers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateHub = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const payload = {
        name: createForm.name.trim(),
        city: createForm.city.trim(),
        address: createForm.address.trim(),
        capacity: parseInt(createForm.capacity, 10) || 20,
        opening_time: createForm.opening_time,
        closing_time: createForm.closing_time,
        manager_id: createForm.manager_id || null,
      };

      const res = await api.post("/hubs", payload);
      if (res.data?.success) {
        setCreateSuccess(`Station Hub "${payload.name}" successfully created!`);
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateSuccess("");
          setCreateForm({
            name: "",
            city: "",
            address: "",
            capacity: 20,
            opening_time: "06:00:00",
            closing_time: "23:00:00",
            manager_id: "",
          });
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create station hub.");
    } finally {
      setCreating(false);
    }
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
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setAssignError(err.response?.data?.message || "Failed to assign station manager.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Building2 className="w-4 h-4" />
            <span>Infrastructure Directory</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Station Hubs & Bays Directory
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Provision new station locations, configure operating hours, assign managers, and jump into station telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Refresh Stations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
          </button>

          <Link
            href="/admin/hub-info"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-colors"
          >
            <Compass className="w-4 h-4 text-purple-400" />
            <span>Hub Info & Telemetry</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision New Station</span>
          </button>
        </div>
      </div>

      {/* Hubs Cards Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Loading station infrastructure...</p>
        </div>
      ) : hubs.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <Building2 className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No Station Hubs Registered</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-block cursor-pointer"
          >
            Provision First Hub
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hubs.map((hub) => (
            <div
              key={hub.hubId}
              className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 flex flex-col justify-between shadow-sm hover:border-neutral-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300">
                    {hub.city || "METRO"}
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-400">
                    Cap: {hub.capacity || 20} Bays
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{hub.name}</h3>
                  <p className="text-xs text-neutral-400 flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-neutral-500" />
                    <span>{hub.address}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div>
                    <span className="text-[10px] text-neutral-500 block flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Opening Time
                    </span>
                    <span className="font-semibold text-white">{hub.opening_time}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Closing Time
                    </span>
                    <span className="font-semibold text-white">{hub.closing_time}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 block">Assigned Station Manager</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {hub.Manager?.name || "No Manager Assigned"}
                    </span>
                    {hub.Manager?.phone && (
                      <span className="text-[10px] font-mono text-purple-400">
                        {hub.Manager.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href={`/admin/hub-info?hubId=${hub.hubId}`}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Inspect Hub Info & Fleet</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setAssigningHub(hub);
                    setSelectedManagerId(hub.manager_id || "");
                    setAssignError("");
                    setAssignSuccess("");
                  }}
                  className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Assign / Reassign Manager</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROVISION HUB MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white">Provision New Station Hub</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHub} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Station Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Mumbai Airport Terminal 2 Hub"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">City *</label>
                  <input
                    type="text"
                    required
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Bay Capacity *</label>
                  <input
                    type="number"
                    required
                    value={createForm.capacity}
                    onChange={(e) => setCreateForm({ ...createForm, capacity: e.target.value })}
                    min="5"
                    max="100"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Physical Address *</label>
                <input
                  type="text"
                  required
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  placeholder="Street, Gate No, Landmark"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Opening Time *</label>
                  <input
                    type="time"
                    required
                    value={createForm.opening_time.slice(0, 5)}
                    onChange={(e) => setCreateForm({ ...createForm, opening_time: `${e.target.value}:00` })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Closing Time *</label>
                  <input
                    type="time"
                    required
                    value={createForm.closing_time.slice(0, 5)}
                    onChange={(e) => setCreateForm({ ...createForm, closing_time: `${e.target.value}:00` })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Assign Manager (Optional)</label>
                <select
                  value={createForm.manager_id}
                  onChange={(e) => setCreateForm({ ...createForm, manager_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                >
                  <option value="">-- No Manager Assigned Yet --</option>
                  {managersList.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.phone || m.email})
                    </option>
                  ))}
                </select>
              </div>

              {createSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400">
                  {createSuccess}
                </div>
              )}

              {createError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer mt-2"
              >
                {creating ? "Provisioning Station..." : "Create & Provision Station Hub"}
              </button>
            </form>
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
    </div>
  );
}
