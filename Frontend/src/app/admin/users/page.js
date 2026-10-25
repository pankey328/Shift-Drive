"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/api";
import Link from "next/link";
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
  PlusCircle,
  X,
  Eye,
  Calendar,
  Clock,
  Wallet,
  ExternalLink,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  KeyRound,
  FileText,
  Edit3,
  ZoomIn,
} from "lucide-react";
import Pagination from "@/components/Pagination";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDlZoom, setSelectedDlZoom] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [togglingUserId, setTogglingUserId] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  // Debounce search input (800ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Onboard Staff Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "HUB_ADMIN",
    hubId: "",
  });
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState("");
  const [onboardSuccess, setOnboardSuccess] = useState("");

  // User Audit Drawer State
  const [selectedUserAudit, setSelectedUserAudit] = useState(null);
  const [auditDetails, setAuditDetails] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Promote / Change Role Modal State
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [roleForm, setRoleForm] = useState({
    role: "HUB_ADMIN",
    hubId: "",
  });
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleSuccess, setRoleSuccess] = useState("");

  // Edit User / Manager Profile Modal State
  const [editUser, setEditUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "CUSTOMER",
    hubId: "",
    kyc_status: "VERIFIED",
    is_active: true,
    password: "",
  });
  const [updatingUser, setUpdatingUser] = useState(false);
  const [editUserError, setEditUserError] = useState("");
  const [editUserSuccess, setEditUserSuccess] = useState("");

  // Fetch users and hubs with backend searching, filtering, and pagination
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
        is_active: statusFilter === "ACTIVE" ? true : statusFilter === "SUSPENDED" ? false : undefined,
      };

      const [usersRes, hubsRes] = await Promise.all([
        api.get("/admin/users", { params }),
        api.get("/hubs"),
      ]);

      if (usersRes.data?.success) {
        setUsers(usersRes.data.data || []);
        if (usersRes.data.pagination) {
          setPagination(usersRes.data.pagination);
        } else {
          setPagination({
            totalItems: usersRes.data.data?.length || 0,
            totalPages: 1,
            currentPage: 1,
            limit,
          });
        }
      }
      if (hubsRes.data?.success) {
        setHubs(hubsRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load user governance data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Account Suspension / Reactivation
  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    const confirmMsg = nextStatus
      ? `Reactivate account for ${user.name} (${user.email})?`
      : `Suspend / Deactivate account for ${user.name} (${user.email})? They will be locked out of the system.`;

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
        if (selectedUserAudit && selectedUserAudit.userId === user.userId) {
          setSelectedUserAudit((prev) => ({ ...prev, is_active: nextStatus }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update account status.");
    } finally {
      setTogglingUserId(null);
    }
  };

  // Handle Onboard Staff
  const handleOnboardStaff = async (e) => {
    e.preventDefault();
    setOnboarding(true);
    setOnboardError("");
    setOnboardSuccess("");

    try {
      const payload = {
        name: onboardForm.name.trim(),
        email: onboardForm.email.trim(),
        phone: onboardForm.phone ? onboardForm.phone.trim() : null,
        password: onboardForm.password,
        role: onboardForm.role,
        hubId: onboardForm.role === "HUB_ADMIN" ? onboardForm.hubId || null : null,
      };

      const res = await api.post("/admin/users/onboard", payload);
      if (res.data?.success) {
        setOnboardSuccess(res.data.message || "Staff account created successfully!");
        setTimeout(() => {
          setShowOnboardModal(false);
          setOnboardSuccess("");
          setOnboardForm({
            name: "",
            email: "",
            phone: "",
            password: "",
            role: "HUB_ADMIN",
            hubId: "",
          });
          fetchData();
        }, 1200);
      }
    } catch (err) {
      setOnboardError(err.response?.data?.message || "Failed to onboard staff member.");
    } finally {
      setOnboarding(false);
    }
  };

  // Open User Audit Drawer
  const handleOpenAudit = async (user) => {
    setSelectedUserAudit(user);
    setLoadingAudit(true);
    setAuditDetails(null);

    try {
      const res = await api.get(`/admin/users/${user.userId}/details`);
      if (res.data?.success) {
        setAuditDetails(res.data.data);
      }
    } catch (err) {
      console.warn("Could not load full user audit details:", err.message);
      setAuditDetails(user);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Open Role Changer Modal
  const handleOpenRoleModal = (user) => {
    setRoleChangeUser(user);
    setRoleForm({
      role: user.role || "CUSTOMER",
      hubId: user.ManagedHub?.hubId || "",
    });
    setRoleError("");
    setRoleSuccess("");
  };

  // Submit Role Change
  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!roleChangeUser) return;
    setUpdatingRole(true);
    setRoleError("");
    setRoleSuccess("");

    try {
      const payload = {
        role: roleForm.role,
        hubId: roleForm.role === "HUB_ADMIN" ? roleForm.hubId || null : null,
      };

      const res = await api.patch(`/admin/users/${roleChangeUser.userId}/role`, payload);
      if (res.data?.success) {
        setRoleSuccess(`User role updated to ${roleForm.role}!`);
        setTimeout(() => {
          setRoleChangeUser(null);
          setRoleSuccess("");
          fetchData();
          if (selectedUserAudit && selectedUserAudit.userId === roleChangeUser.userId) {
            handleOpenAudit(roleChangeUser);
          }
        }, 1200);
      }
    } catch (err) {
      setRoleError(err.response?.data?.message || "Failed to update user role.");
    } finally {
      setUpdatingRole(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u) => {
    setEditUser(u);
    setEditUserForm({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role || "CUSTOMER",
      hubId: u.ManagedHub?.hubId || "",
      kyc_status: u.kyc_status || "PENDING",
      is_active: u.is_active !== false,
      password: "",
    });
    setEditUserError("");
    setEditUserSuccess("");
  };

  // Save Edit User
  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setUpdatingUser(true);
    setEditUserError("");
    setEditUserSuccess("");

    try {
      const payload = {
        name: editUserForm.name.trim(),
        email: editUserForm.email.trim().toLowerCase(),
        phone: editUserForm.phone ? editUserForm.phone.trim() : null,
        role: editUserForm.role,
        hubId: editUserForm.role === "HUB_ADMIN" ? editUserForm.hubId || null : null,
        kyc_status: editUserForm.kyc_status,
        is_active: editUserForm.is_active,
      };
      if (editUserForm.password && editUserForm.password.trim()) {
        payload.password = editUserForm.password.trim();
      }

      const res = await api.put(`/admin/users/${editUser.userId}`, payload);
      if (res.data?.success) {
        setEditUserSuccess("User profile updated successfully!");
        setTimeout(() => {
          setEditUser(null);
          setEditUserSuccess("");
          fetchData();
          if (selectedUserAudit && selectedUserAudit.userId === editUser.userId) {
            handleOpenAudit(editUser);
          }
        }, 1200);
      }
    } catch (err) {
      setEditUserError(err.response?.data?.message || "Failed to update user profile.");
    } finally {
      setUpdatingUser(false);
    }
  };

  // In-memory fallback if needed (users already filtered by backend)
  const filteredUsers = users;

  // Executive KPI Aggregations
  const stats = useMemo(() => {
    const total = users.length;
    const customers = users.filter((u) => u.role === "CUSTOMER").length;
    const managers = users.filter((u) => u.role === "HUB_ADMIN").length;
    const superadmins = users.filter((u) => u.role === "SUPERADMIN").length;
    const suspended = users.filter((u) => u.is_active === false).length;
    const verifiedKyc = users.filter((u) => u.kyc_status === "VERIFIED").length;

    return { total, customers, managers, superadmins, suspended, verifiedKyc };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Users className="w-4 h-4" />
            <span>Phase 7 Governance</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Staff & User Governance Desk
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Onboard new station hub managers, audit user lifecycle records, assign operational stations, and moderate accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowOnboardModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Onboard Staff / Manager</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            Total Registered Users
          </span>
          <p className="text-2xl font-black text-white">{stats.total}</p>
          <span className="text-[10px] text-neutral-500 block">
            {stats.customers} Customers &bull; {stats.superadmins} Admins
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Station Hub Managers
          </span>
          <p className="text-2xl font-black text-blue-400">{stats.managers}</p>
          <span className="text-[10px] text-neutral-500 block">
            Active station dispatch operators
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified Customer KYC
          </span>
          <p className="text-2xl font-black text-emerald-400">{stats.verifiedKyc}</p>
          <span className="text-[10px] text-neutral-500 block">
            Driving license approved for bookings
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 text-red-400" />
            Suspended Accounts
          </span>
          <p className="text-2xl font-black text-red-400">{stats.suspended}</p>
          <span className="text-[10px] text-neutral-500 block">
            Locked due to dispute or violation
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Role Filter Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-semibold">
            {[
              { id: "ALL", label: `All (${users.length})` },
              { id: "CUSTOMER", label: `Customers (${stats.customers})` },
              { id: "HUB_ADMIN", label: `Hub Managers (${stats.managers})` },
              { id: "SUPERADMIN", label: `Superadmins (${stats.superadmins})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${roleFilter === tab.id
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Account Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, phone, or station..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Users Master Table */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p>Loading enterprise directory...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-16 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <Users className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">No users found matching query.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("ALL");
              setStatusFilter("ALL");
            }}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-neutral-800 overflow-hidden bg-neutral-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Role & Assigned Station</th>
                  <th className="p-4">KYC Clearance</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredUsers.map((u) => (
                  <tr key={u.userId} className="hover:bg-neutral-800/40 transition-colors">
                    {/* User Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-300 text-xs flex-shrink-0 shadow-sm">
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

                    {/* Role & Station Hub */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.role === "SUPERADMIN"
                              ? "bg-purple-950 text-purple-300 border border-purple-800"
                              : u.role === "HUB_ADMIN"
                                ? "bg-blue-950 text-blue-300 border border-blue-800"
                                : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                            }`}
                        >
                          {u.role === "HUB_ADMIN" ? "HUB MANAGER" : u.role}
                        </span>

                        {u.role === "HUB_ADMIN" && (
                          <div className="text-[10px] text-neutral-400 flex items-center gap-1 font-medium">
                            <Building2 className="w-3 h-3 text-purple-400 shrink-0" />
                            {u.ManagedHub ? (
                              <span className="text-purple-300 font-semibold truncate max-w-[170px]">
                                {u.ManagedHub.name}
                              </span>
                            ) : (
                              <span className="text-amber-400/80 italic">Unassigned Hub</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* KYC Status */}
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.kyc_status === "VERIFIED"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                            : u.kyc_status === "PENDING"
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800"
                              : "bg-red-950/60 text-red-400 border border-red-800"
                          }`}
                      >
                        {u.kyc_status === "VERIFIED" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : u.kyc_status === "PENDING" ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <span>{u.kyc_status || "UNVERIFIED"}</span>
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`flex items-center gap-1.5 text-[11px] font-semibold ${u.is_active !== false ? "text-emerald-400" : "text-red-400"
                          }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${u.is_active !== false ? "bg-emerald-400 shadow-sm shadow-emerald-400/40" : "bg-red-400"
                            }`}
                        />
                        <span>{u.is_active !== false ? "Active" : "Suspended"}</span>
                      </span>
                    </td>

                    {/* Governance Actions */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAudit(u)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                          title="View Full User Audit Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRoleModal(u)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          title="Change Role & Station Assignment"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-purple-400 hover:text-white transition-colors cursor-pointer"
                          title="Edit User Profile & Hub Manager Info"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {u.role !== "SUPERADMIN" && (
                          <button
                            type="button"
                            disabled={togglingUserId === u.userId}
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${u.is_active !== false
                                ? "bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60"
                                : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60"
                              }`}
                          >
                            {togglingUserId === u.userId ? (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                            ) : u.is_active !== false ? (
                              "Suspend"
                            ) : (
                              "Reactivate"
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Toolbar */}
            <div className="border-t border-neutral-800 px-4 bg-neutral-900/40">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                limit={pagination.limit}
                onPageChange={(p) => setPage(p)}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
        </div>
      )}

      {/* ONBOARD STAFF MODAL */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  Onboard Enterprise Staff
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Provision new Hub Manager or Superadmin credentials directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardStaff} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={onboardForm.name}
                  onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={onboardForm.email}
                  onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                  placeholder="ramesh@shiftdrive.com"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Staff Role *</label>
                  <select
                    value={onboardForm.role}
                    onChange={(e) => setOnboardForm({ ...onboardForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="HUB_ADMIN">Station Hub Manager</option>
                    <option value="SUPERADMIN">Superadmin</option>
                  </select>
                </div>
              </div>

              {onboardForm.role === "HUB_ADMIN" && (
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Assign Station Hub</label>
                  <select
                    value={onboardForm.hubId}
                    onChange={(e) => setOnboardForm({ ...onboardForm, hubId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">-- Assign Station Later --</option>
                    {hubs.map((h) => (
                      <option key={h.hubId} value={h.hubId}>
                        {h.name} ({h.city}) {h.Manager ? `[Assigned to ${h.Manager.name}]` : "[Vacant]"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={onboardForm.password}
                  onChange={(e) => setOnboardForm({ ...onboardForm, password: e.target.value })}
                  placeholder="Temporary login password"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {onboardSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{onboardSuccess}</span>
                </div>
              )}

              {onboardError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{onboardError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboarding}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  {onboarding ? "Provisioning..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ROLE / REASSIGN STATION MODAL */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  Update Role & Station
                </h3>
                <p className="text-[11px] text-neutral-400">{roleChangeUser.name} &bull; {roleChangeUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setRoleChangeUser(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">System Role *</label>
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="CUSTOMER">CUSTOMER (Standard App User)</option>
                  <option value="HUB_ADMIN">HUB_ADMIN (Station Lot Manager)</option>
                  <option value="SUPERADMIN">SUPERADMIN (Global Administrator)</option>
                </select>
              </div>

              {roleForm.role === "HUB_ADMIN" && (
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Managed Station Hub</label>
                  <select
                    value={roleForm.hubId}
                    onChange={(e) => setRoleForm({ ...roleForm, hubId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Unassigned (No Station) --</option>
                    {hubs.map((h) => (
                      <option key={h.hubId} value={h.hubId}>
                        {h.name} ({h.city}) {h.Manager ? `[Mgr: ${h.Manager.name}]` : "[Vacant]"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {roleSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{roleSuccess}</span>
                </div>
              )}

              {roleError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{roleError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setRoleChangeUser(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRole}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {updatingRole ? "Saving..." : "Save Role Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL EDIT USER & HUB MANAGER MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-purple-400" />
                  Edit User & Manager Details
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Update credentials, station hub assignments, KYC, and security access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">System Role *</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="CUSTOMER">CUSTOMER (Standard User)</option>
                    <option value="HUB_ADMIN">HUB_ADMIN (Hub Manager)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Global Administrator)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">KYC Status</label>
                  <select
                    value={editUserForm.kyc_status}
                    onChange={(e) => setEditUserForm({ ...editUserForm, kyc_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="VERIFIED">VERIFIED (Approved)</option>
                    <option value="PENDING">PENDING (Under Review)</option>
                    <option value="REJECTED">REJECTED (Denied)</option>
                    <option value="UNVERIFIED">UNVERIFIED (No Documents)</option>
                  </select>
                </div>
              </div>

              {/* Station Hub Assignment (Shown for Hub Managers) */}
              {editUserForm.role === "HUB_ADMIN" && (
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Assigned Station Hub</label>
                  <select
                    value={editUserForm.hubId}
                    onChange={(e) => setEditUserForm({ ...editUserForm, hubId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">-- No Station Assigned (Vacant) --</option>
                    {hubs.map((h) => {
                      const isCurrentMgr = h.manager_id === editUser.userId;
                      return (
                        <option key={h.hubId} value={h.hubId}>
                          {h.name} ({h.city}) {isCurrentMgr ? "[Currently Assigned Here]" : h.Manager ? `[Assigned to ${h.Manager.name}]` : "[Vacant]"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Account Status</label>
                  <select
                    value={editUserForm.is_active ? "active" : "suspended"}
                    onChange={(e) => setEditUserForm({ ...editUserForm, is_active: e.target.value === "active" })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="active">Active (Full Access)</option>
                    <option value="suspended">Suspended (Access Blocked)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">
                    Reset Password <span className="text-neutral-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    value={editUserForm.password}
                    onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                    placeholder="Leave blank to keep password"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {editUserSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{editUserSuccess}</span>
                </div>
              )}

              {editUserError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editUserError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingUser}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 cursor-pointer flex items-center gap-2"
                >
                  {updatingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{updatingUser ? "Saving Changes..." : "Save Profile Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER AUDIT DRAWER / MODAL */}
      {selectedUserAudit && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                  {selectedUserAudit.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedUserAudit.name}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedUserAudit.role === "SUPERADMIN"
                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                          : selectedUserAudit.role === "HUB_ADMIN"
                            ? "bg-blue-950 text-blue-300 border border-blue-800"
                            : "bg-neutral-800 text-neutral-300"
                        }`}
                    >
                      {selectedUserAudit.role}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    {selectedUserAudit.phone || "No phone"} &bull; {selectedUserAudit.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserAudit(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingAudit ? (
              <div className="py-16 text-center text-xs text-neutral-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                <p>Loading user audit ledger...</p>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Meta Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-emerald-400" /> Wallet Balance
                    </span>
                    <p className="text-sm font-black text-emerald-400">
                      ₹{parseFloat(auditDetails?.wallet_balance || selectedUserAudit.wallet_balance || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-purple-400" /> KYC Status
                    </span>
                    <p className="text-sm font-black text-white">
                      {selectedUserAudit.kyc_status || "UNVERIFIED"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-blue-400" /> Account State
                    </span>
                    <p className={`text-sm font-black ${selectedUserAudit.is_active !== false ? "text-emerald-400" : "text-red-400"}`}>
                      {selectedUserAudit.is_active !== false ? "Active" : "Suspended"}
                    </p>
                  </div>
                </div>

                {/* Driving License Proof Card (if Customer) */}
                {selectedUserAudit.kyc_document_url && (
                  <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        Driving License Proof
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {selectedUserAudit.kyc_status || "VERIFIED"}
                      </span>
                    </div>

                    {selectedUserAudit.kyc_document_url.startsWith("http") || selectedUserAudit.kyc_document_url.startsWith("/") ? (
                      <div className="flex items-center gap-3 p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                        <div
                          onClick={() => setSelectedDlZoom(selectedUserAudit.kyc_document_url)}
                          className="w-16 h-12 rounded-lg overflow-hidden border border-neutral-700 bg-black flex-shrink-0 cursor-pointer group relative"
                          title="Click to zoom DL"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedUserAudit.kyc_document_url}
                            alt="DL Proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-white block">Government DL Uploaded</span>
                          <button
                            type="button"
                            onClick={() => setSelectedDlZoom(selectedUserAudit.kyc_document_url)}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View DL Document</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                        <span className="font-mono text-purple-300 font-bold">
                          {selectedUserAudit.kyc_document_url.replace(/^DL#\s*/i, "DL: ")}
                        </span>
                        <span className="text-[10px] text-neutral-400">Authenticated ID Record</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Managed Station Hub (for managers) */}
                {selectedUserAudit.role === "HUB_ADMIN" && (
                  <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-800/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        Station Assignment
                      </span>
                      {selectedUserAudit.ManagedHub && (
                        <Link
                          href={`/admin/hub-info?hubId=${selectedUserAudit.ManagedHub.hubId}`}
                          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <span>View Station Telemetry</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    {selectedUserAudit.ManagedHub ? (
                      <p className="text-neutral-300">
                        Assigned to <strong className="text-white">{selectedUserAudit.ManagedHub.name}</strong> ({selectedUserAudit.ManagedHub.city})
                      </p>
                    ) : (
                      <p className="text-amber-400/90 italic">
                        Not currently assigned to any station hub. Click &quot;Change Role & Station&quot; to assign.
                      </p>
                    )}
                  </div>
                )}

                {/* Recent Bookings History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Recent Booking Records ({auditDetails?.Bookings?.length || 0})
                    </span>
                    <Link
                      href={`/admin/bookings?userId=${selectedUserAudit.userId}`}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <span>Open in Master Ledger</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {auditDetails?.Bookings && auditDetails.Bookings.length > 0 ? (
                    <div className="divide-y divide-neutral-800 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                      {auditDetails.Bookings.map((b) => (
                        <div key={b.bookingId} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">
                              {b.Vehicle ? `${b.Vehicle.make} ${b.Vehicle.model}` : "Vehicle Trip"}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono block">
                              {b.bookingId.slice(0, 8)}... &bull; {new Date(b.createdAt || b.created_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white block">₹{b.total_price || b.total_amount || 0}</span>
                            <span className="text-[10px] font-semibold text-purple-400 block">{b.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-neutral-500 text-[11px]">
                      No previous bookings recorded for this account.
                    </div>
                  )}
                </div>

                {/* Quick Governance Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditUser(selectedUserAudit)}
                      className="px-3 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Edit Full Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserAudit(null);
                        handleOpenRoleModal(selectedUserAudit);
                      }}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                      <span>Change Role / Station</span>
                    </button>
                  </div>

                  {selectedUserAudit.role !== "SUPERADMIN" && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(selectedUserAudit)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedUserAudit.is_active !== false
                          ? "bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60"
                          : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60"
                        }`}
                    >
                      {selectedUserAudit.is_active !== false ? "Suspend Account" : "Reactivate Account"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-Screen DL Image Preview Lightbox */}
      {selectedDlZoom && (
        <div
          onClick={() => setSelectedDlZoom(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedDlZoom}
              alt="Driving license proof zoom"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-neutral-800 shadow-2xl"
            />
            <p className="text-xs text-neutral-400 mt-3">Click anywhere to close preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
