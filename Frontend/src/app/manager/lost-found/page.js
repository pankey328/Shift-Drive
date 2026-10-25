"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import Pagination from "@/components/Pagination";
import {
  Package,
  Building2,
  PlusCircle,
  Loader2,
  X,
  RefreshCw,
  Upload,
  Search,
} from "lucide-react";

export default function ManagerLostFoundPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [lostItems, setLostItems] = useState([]);
  const [loadingLost, setLoadingLost] = useState(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 6,
  });

  // Debounce search (800ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modals
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostForm, setLostForm] = useState({
    item_name: "",
    category: "ELECTRONICS",
    description: "",
    storage_location: "Front Desk Safe",
    booking_id: "",
  });
  const [lostFiles, setLostFiles] = useState([]);
  const [submittingLost, setSubmittingLost] = useState(false);

  const [claimModalItem, setClaimModalItem] = useState(null);
  const [claimForm, setClaimForm] = useState({ claimed_by_name: "", claimed_by_phone: "" });
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Resolve Station Hub
  const resolveStationHub = useCallback(async () => {
    try {
      const res = await api.get("/hubs");
      if (res.data?.success) {
        const hubs = res.data.data || [];
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

  // Fetch Lost Items with search, filters, and pagination
  const fetchLostItems = useCallback(async () => {
    if (!selectedHubId) return;
    setLoadingLost(true);
    try {
      const params = {
        hubId: selectedHubId,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        limit,
      };
      const res = await api.get("/hub-admin/lost-found", { params });
      if (res.data?.success) {
        setLostItems(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to load lost items:", err);
    } finally {
      setLoadingLost(false);
    }
  }, [selectedHubId, statusFilter, categoryFilter, debouncedSearch, page, limit]);

  useEffect(() => {
    if (isAuthenticated) {
      resolveStationHub();
    }
  }, [isAuthenticated, resolveStationHub]);

  useEffect(() => {
    if (selectedHubId) {
      fetchLostItems();
    }
  }, [selectedHubId, fetchLostItems]);

  const handleLostSubmit = async (e) => {
    e.preventDefault();
    setSubmittingLost(true);
    try {
      const formData = new FormData();
      formData.append("item_name", lostForm.item_name);
      formData.append("category", lostForm.category);
      formData.append("description", lostForm.description);
      formData.append("storage_location", lostForm.storage_location);
      if (lostForm.booking_id) formData.append("booking_id", lostForm.booking_id);
      lostFiles.forEach((file) => formData.append("images", file));

      const res = await api.post(
        `/hub-admin/lost-found?hubId=${selectedHubId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (res.data?.success) {
        setShowLostModal(false);
        setLostForm({
          item_name: "",
          category: "ELECTRONICS",
          description: "",
          storage_location: "Front Desk Safe",
          booking_id: "",
        });
        setLostFiles([]);
        fetchLostItems();
        alert("Belonging registered in station vault!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to register lost item.");
    } finally {
      setSubmittingLost(false);
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimModalItem) return;
    setSubmittingClaim(true);
    try {
      const res = await api.patch(
        `/hub-admin/lost-found/${claimModalItem.itemId}/claim`,
        claimForm
      );
      if (res.data?.success) {
        setClaimModalItem(null);
        setClaimForm({ claimed_by_name: "", claimed_by_phone: "" });
        fetchLostItems();
        alert("Item released and claimed successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark item as claimed.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="text-xs text-neutral-400 font-medium">Opening Station Vault Registry...</span>
      </div>
    );
  }

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
            Station Lost & Found Registry
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Vault tracking for belongings left behind in returned vehicles and verified handover release.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLostModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Found Item</span>
          </button>

          <button
            type="button"
            onClick={fetchLostItems}
            disabled={loadingLost}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
            title="Refresh Vault Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLost ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by item name, storage location, claimant, license plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNCLAIMED">Unclaimed</option>
              <option value="CLAIMED">Claimed</option>
            </select>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-medium cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="ELECTRONICS">Electronics</option>
              <option value="WALLET_CARDS">Wallet / Documents</option>
              <option value="SUNGLASSES_OPTICAL">Eyewear</option>
              <option value="CLOTHING">Clothing / Bag</option>
              <option value="KEYS">Keys</option>
              <option value="OTHER">Other</option>
            </select>

            {(searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                  setPage(1);
                }}
                className="px-2 py-1 text-xs text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {loadingLost ? (
        <div className="py-24 text-center text-xs text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
          <p>Opening station vault registry...</p>
        </div>
      ) : lostItems.length === 0 ? (
        <div className="py-20 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <Package className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-sm font-semibold text-neutral-300">Station Vault is Clear</p>
          <p className="text-xs text-neutral-500">No unclaimed belongings registered at this station.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lostItems.map((item) => (
            <div
              key={item.itemId}
              className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                    {item.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === "CLAIMED"
                        ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                        : "bg-amber-950/60 border border-amber-800 text-amber-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{item.item_name}</h4>
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">
                    {item.description || "No description provided."}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Vault Location:</span>
                    <span className="text-neutral-200">{item.storage_location}</span>
                  </div>
                  {item.claimed_by_name && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Claimed By:</span>
                      <span className="text-emerald-400 font-semibold">{item.claimed_by_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {item.status === "STORED" && (
                <button
                  type="button"
                  onClick={() => {
                    setClaimModalItem(item);
                    setClaimForm({ claimed_by_name: "", claimed_by_phone: "" });
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer transition-colors"
                >
                  Release to Verified Claimant
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loadingLost && pagination.totalItems > 0 && (
        <div className="pt-2">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            limit={limit}
            onPageChange={(newPage) => setPage(newPage)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </div>
      )}

      {/* LOG LOST BELONGING MODAL */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Log Found Belonging</h3>
              <button
                type="button"
                onClick={() => setShowLostModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLostSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Item Name *</label>
                <input
                  type="text"
                  required
                  value={lostForm.item_name}
                  onChange={(e) => setLostForm({ ...lostForm, item_name: e.target.value })}
                  placeholder="e.g. Apple AirPods Pro (White case)"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Category</label>
                <select
                  value={lostForm.category}
                  onChange={(e) => setLostForm({ ...lostForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white cursor-pointer"
                >
                  <option value="ELECTRONICS">Electronics</option>
                  <option value="WALLET_CARDS">Wallet / Documents</option>
                  <option value="SUNGLASSES_OPTICAL">Eyewear</option>
                  <option value="CLOTHING">Clothing / Bag</option>
                  <option value="KEYS">Keys</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Description / Found Location</label>
                <textarea
                  rows={2}
                  value={lostForm.description}
                  onChange={(e) => setLostForm({ ...lostForm, description: e.target.value })}
                  placeholder="Found under passenger seat of returned car"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Station Vault Storage Location</label>
                <input
                  type="text"
                  value={lostForm.storage_location}
                  onChange={(e) => setLostForm({ ...lostForm, storage_location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Attach Photograph</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLostFiles(Array.from(e.target.files || []))}
                  className="w-full text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={submittingLost}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer mt-2"
              >
                {submittingLost ? "Registering..." : "Record Found Item"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CLAIM ITEM VERIFICATION MODAL */}
      {claimModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Verify Item Handover</h3>
              <button
                type="button"
                onClick={() => setClaimModalItem(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Release <strong className="text-white">{claimModalItem.item_name}</strong> to claimant upon physical ID verification.
            </p>

            <form onSubmit={handleClaimSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Claimant Full Name *</label>
                <input
                  type="text"
                  required
                  value={claimForm.claimed_by_name}
                  onChange={(e) => setClaimForm({ ...claimForm, claimed_by_name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Claimant Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={claimForm.claimed_by_phone}
                  onChange={(e) => setClaimForm({ ...claimForm, claimed_by_phone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submittingClaim}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer mt-2"
              >
                {submittingClaim ? "Verifying..." : "Confirm Handover & Release"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
