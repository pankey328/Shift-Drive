"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/api";
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  RefreshCw,
  Loader2,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [togglingUserId, setTogglingUserId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter !== "ALL") params.role = roleFilter;
      const res = await api.get("/admin/users", { params });
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    const confirmMsg = nextStatus
      ? `Reactivate account for ${user.name} (${user.email})?`
      : `Suspend / Deactivate account for ${user.name} (${user.email})? They will be blocked from logging in.`;

    if (!confirm(confirmMsg)) return;

    setTogglingUserId(user.userId);
    try {
      const res = await api.patch(`/admin/users/${user.userId}/status`, {
        is_active: nextStatus,
      });
      if (res.data?.success) {
        setUsers((prev) =>
          prev.map((u) => (u.userId === user.userId ? { ...u, is_active: nextStatus } : u))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update account status.");
    } finally {
      setTogglingUserId(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Users className="w-4 h-4" />
            <span>Staff & User Governance</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Enterprise User Directory
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage registered customers, hub managers, and administrative roles across the ShiftDrive ecosystem.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold overflow-x-auto">
          {[
            { id: "ALL", label: `All Users (${users.length})` },
            { id: "CUSTOMER", label: "Customers" },
            { id: "HUB_ADMIN", label: "Hub Managers" },
            { id: "SUPERADMIN", label: "Superadmins" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === tab.id
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, email..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/60"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Loading enterprise directory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <Users className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No users found matching filter.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-neutral-800 overflow-hidden bg-neutral-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">KYC Status</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filtered.map((u) => (
                  <tr key={u.userId} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-300 text-xs flex-shrink-0">
                          {u.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{u.name}</span>
                          <span className="text-[11px] text-neutral-400 font-mono block">
                            {u.phone || "No phone"} &bull; {u.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.role === "SUPERADMIN"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : u.role === "HUB_ADMIN"
                            ? "bg-blue-950 text-blue-300 border border-blue-800"
                            : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.kyc_status === "VERIFIED"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                            : u.kyc_status === "PENDING"
                            ? "bg-amber-950/60 text-amber-400 border border-amber-800"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {u.kyc_status || "UNVERIFIED"}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                          u.is_active !== false ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            u.is_active !== false ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        />
                        <span>{u.is_active !== false ? "Active" : "Suspended"}</span>
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      {u.role !== "SUPERADMIN" && (
                        <button
                          type="button"
                          disabled={togglingUserId === u.userId}
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            u.is_active !== false
                              ? "bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60"
                              : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60"
                          }`}
                        >
                          {togglingUserId === u.userId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                          ) : u.is_active !== false ? (
                            "Suspend Account"
                          ) : (
                            "Reactivate Account"
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
