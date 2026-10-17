"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import {
  Package,
  Building2,
  PlusCircle,
  Loader2,
  X,
  RefreshCw,
  Upload,
} from "lucide-react";

export default function ManagerLostFoundPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [currentHub, setCurrentHub] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [lostItems, setLostItems] = useState([]);
  const [loadingLost, setLoadingLost] = useState(true);

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

  // Fetch Lost Items
  const fetchLostItems = useCallback(async () => {
    if (!selectedHubId) return;
    setLoadingLost(true);
    try {
      const res = await api.get(`/hub-admin/lost-found?hubId=${selectedHubId}`);
      if (res.data?.success) {
        setLostItems(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load lost items:", err);
    } finally {
      setLoadingLost(false);
    }
  }, [selectedHubId]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
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
