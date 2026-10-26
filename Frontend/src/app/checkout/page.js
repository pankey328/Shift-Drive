"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useDispatch } from "react-redux";
import { updateUser } from "@/redux/slices/authSlice";
import { loadRazorpayScript } from "@/utils/razorpay";
import {
  Car,
  Clock,
  MapPin,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Upload,
  Lock,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Loader2,
  FileText,
  CreditCard,
  Plus,
  Edit2,
  X,
  RefreshCw,
  Fuel,
  Gauge,
  User,
  Phone,
  Mail,
  QrCode,
  Check,
} from "lucide-react";

// Helper to convert date string to YYYY-MM-DDTHH:mm for datetime-local input
const toDatetimeLocal = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const dispatch = useDispatch();

  // Search Query Params
  const vehicleId = searchParams.get("vehicleId") || "";
  const pickupHubId = searchParams.get("pickupHubId") || "";
  const initialDropoffHubId = searchParams.get("dropoffHubId") || pickupHubId;
  const initialStartTime = searchParams.get("startTime") || "";
  const initialEndTime = searchParams.get("endTime") || "";
  const resumeBookingId = searchParams.get("bookingId") || "";

  // 2-Stage Flow: "REVIEW" (Confirm Trip Details & Driver) -> "PAYMENT" (Lock Inventory & Pay)
  const [checkoutStage, setCheckoutStage] = useState(resumeBookingId ? "PAYMENT" : "REVIEW");
  const [paymentMethod, setPaymentMethod] = useState("WALLET"); // "WALLET" | "RAZORPAY"
  const [directSplitOption, setDirectSplitOption] = useState("SHORTFALL"); // "SHORTFALL" | "FULL"

  // Interactive Schedule States
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [dropoffHubId, setDropoffHubId] = useState(initialDropoffHubId);

  // Edit Mode on Review Screen
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editStartTime, setEditStartTime] = useState(initialStartTime);
  const [editEndTime, setEditEndTime] = useState(initialEndTime);
  const [editDropoffHubId, setEditDropoffHubId] = useState(initialDropoffHubId);
  const [scheduleError, setScheduleError] = useState("");

  // Driver Contact State (Essential for On-Road Support & Handover)
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (user?.phone && !contactPhone) {
      setContactPhone(user.phone);
    }
  }, [user?.phone, contactPhone]);

  // Sync state if URL query params change externally
  useEffect(() => {
    const qStart = searchParams.get("startTime");
    const qEnd = searchParams.get("endTime");
    const qDropoff = searchParams.get("dropoffHubId") || searchParams.get("pickupHubId");
    if (qStart && qStart !== startTime) {
      setStartTime(qStart);
      setEditStartTime(qStart);
    }
    if (qEnd && qEnd !== endTime) {
      setEndTime(qEnd);
      setEditEndTime(qEnd);
    }
    if (qDropoff && qDropoff !== dropoffHubId) {
      setDropoffHubId(qDropoff);
      setEditDropoffHubId(qDropoff);
    }
  }, [searchParams]);

  // Data States
  const [vehicle, setVehicle] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Booking Hold State
  const [booking, setBooking] = useState(null);
  const [initiatingHold, setInitiatingHold] = useState(false);
  const [holdError, setHoldError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const holdInitiatingRef = useRef(false);

  // KYC States (Optional Pre-upload)
  const [showOptionalUpload, setShowOptionalUpload] = useState(false);
  const [kycFile, setKycFile] = useState(null);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [kycMessage, setKycMessage] = useState("");
  const [kycError, setKycError] = useState("");

  // Wallet States
  const [walletBalance, setWalletBalance] = useState(0);
  const [toppingUp, setToppingUp] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState("");

  // Payment Confirmation States
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Fetch Vehicle, Hubs & User Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [vehicleRes, hubsRes] = await Promise.all([
          vehicleId ? api.get(`/vehicles/${vehicleId}`) : Promise.resolve({ data: {} }),
          api.get("/hubs"),
        ]);

        if (vehicleRes.data?.data) {
          setVehicle(vehicleRes.data.data);
        }
        if (hubsRes.data?.data) {
          setHubs(hubsRes.data.data);
        }

        // Fetch fresh user profile for current wallet balance & kyc status
        if (isAuthenticated) {
          try {
            const meRes = await api.get("/auth/me");
            if (meRes.data?.user) {
              dispatch(updateUser(meRes.data.user));
              setWalletBalance(parseFloat(meRes.data.user.wallet_balance || 0));
            }
          } catch (err) {
            console.warn("Could not fetch user profile:", err.message);
          }
        }
      } catch (err) {
        console.error("Error loading checkout details:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [vehicleId, isAuthenticated, dispatch]);

  // Sync wallet balance from user state
  useEffect(() => {
    if (user?.wallet_balance !== undefined) {
      setWalletBalance(parseFloat(user.wallet_balance || 0));
    }
  }, [user?.wallet_balance]);

  // Station & Route Resolution
  const pickupHub = hubs.find((h) => h.hubId === pickupHubId);
  const dropoffHub = hubs.find((h) => h.hubId === dropoffHubId) || pickupHub;
  const isHoldExpired = secondsRemaining !== null && secondsRemaining === 0;
  const isOneWay = pickupHubId && dropoffHubId && pickupHubId !== dropoffHubId;
  const baseDailyRate = parseFloat(vehicle?.base_daily_rate || 0);

  // Operating Hours Validation
  const operatingHoursError = useMemo(() => {
    if (!pickupHub || hubs.length === 0) return "";
    const getTime = (val) => {
      if (!val) return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    if (pickupHub && startTime) {
      const pTime = getTime(startTime);
      if (pTime && pickupHub.opening_time && pickupHub.closing_time) {
        const open = pickupHub.opening_time.slice(0, 5);
        const close = pickupHub.closing_time.slice(0, 5);
        if (pTime < open || pTime > close) {
          return `Pickup station (${pickupHub.name}) is closed at ${pTime}. Operating hours: ${open} to ${close}.`;
        }
      }
    }

    if (dropoffHub && endTime) {
      const dTime = getTime(endTime);
      if (dTime && dropoffHub.opening_time && dropoffHub.closing_time) {
        const open = dropoffHub.opening_time.slice(0, 5);
        const close = dropoffHub.closing_time.slice(0, 5);
        if (dTime < open || dTime > close) {
          return `Return station (${dropoffHub.name}) is closed at ${dTime}. Operating hours: ${open} to ${close}.`;
        }
      }
    }

    return "";
  }, [pickupHub, dropoffHub, startTime, endTime, hubs.length]);

  // Pricing Calculation
  const rentalDays = useMemo(() => {
    if (booking && baseDailyRate > 0) {
      const netDailyRental = parseFloat(booking.total_price) - (isOneWay ? 500 : 0);
      return Math.max(1, Math.round(netDailyRental / baseDailyRate));
    }
    if (!startTime || !endTime) return 1;
    const s = new Date(startTime);
    const e = new Date(endTime);
    const diffHours = (e - s) / (1000 * 60 * 60);
    return Math.max(1, Math.round(diffHours / 24));
  }, [booking, baseDailyRate, isOneWay, startTime, endTime]);

  const estimatedTotal = booking
    ? parseFloat(booking.total_price)
    : baseDailyRate * rentalDays + (isOneWay ? 500 : 0);

  const neededAmount = Math.max(0, estimatedTotal - walletBalance);
  const isKycVerified = user?.kyc_status === "VERIFIED";

  // Auto-select payment method tab based on wallet balance sufficiency
  useEffect(() => {
    if (walletBalance >= estimatedTotal && estimatedTotal > 0) {
      setPaymentMethod("WALLET");
    } else if (estimatedTotal > 0 && walletBalance < estimatedTotal) {
      setPaymentMethod("RAZORPAY");
    }
  }, [walletBalance, estimatedTotal]);

  // Initiate 5-minute inventory hold
  const handleInitiateHold = async (forceNew = false, overrides = null) => {
    if (holdInitiatingRef.current) return null;

    const targetStart = overrides?.startTime || startTime;
    const targetEnd = overrides?.endTime || endTime;
    const targetDropoff = overrides?.dropoffHubId || dropoffHubId;

    if (!targetStart || !targetEnd) return null;

    if (operatingHoursError && !overrides) {
      setHoldError(operatingHoursError);
      return null;
    }
    if (booking && !isHoldExpired && !forceNew && !overrides) {
      return booking;
    }
    holdInitiatingRef.current = true;

    if (!isAuthenticated) {
      holdInitiatingRef.current = false;
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return null;
    }

    if (user?.role && user.role !== "CUSTOMER") {
      holdInitiatingRef.current = false;
      setHoldError("Staff and Administrative accounts cannot create consumer rental bookings.");
      return null;
    }

    setInitiatingHold(true);
    setHoldError("");

    try {
      const res = await api.post("/bookings/initiate", {
        vehicleId,
        pickupHubId,
        dropoffHubId: targetDropoff,
        startTime: targetStart,
        endTime: targetEnd,
      });

      if (res.data?.data) {
        setBooking(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error("Hold initiation error:", err.response?.data || err.message);
      setHoldError(
        err.response?.data?.message || "Failed to acquire vehicle inventory lock."
      );
    } finally {
      setInitiatingHold(false);
      holdInitiatingRef.current = false;
    }
    return null;
  };

  // Stage 1 -> Stage 2: Proceed to Payment & Lock Vehicle
  const handleProceedToPayment = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (operatingHoursError) {
      setHoldError(operatingHoursError);
      return;
    }

    const cleanPhone = contactPhone ? contactPhone.replace(/\D/g, "") : "";
    if (!cleanPhone || cleanPhone.length < 10) {
      setPhoneError("Please enter a valid 10-digit mobile number so the station manager can contact you.");
      return;
    }

    // Auto-save phone to customer profile so the hub manager has it for trip support
    if (cleanPhone !== user?.phone) {
      try {
        const updateRes = await api.put("/auth/profile", { phone: cleanPhone });
        if (updateRes.data?.user) {
          dispatch(updateUser(updateRes.data.user));
        }
      } catch (err) {
        console.warn("Could not save phone to profile:", err.message);
      }
    }

    // Invalidate any old hold and request fresh 5-minute lock
    setBooking(null);
    setCheckoutStage("PAYMENT");
    window.scrollTo({ top: 0, behavior: "smooth" });

    await handleInitiateHold(true);
  };

  // Stage 2 -> Stage 1: Back to Review & Modify Schedule
  const handleBackToReview = () => {
    setCheckoutStage("REVIEW");
    setIsEditingSchedule(false);
    setHoldError("");
  };

  // Apply Changes from Inline Schedule Editor in Stage 1
  const handleApplyScheduleChange = (e) => {
    if (e) e.preventDefault();
    setScheduleError("");

    if (!editStartTime || !editEndTime) {
      setScheduleError("Please select both pickup and return date & time.");
      return;
    }

    const startD = new Date(editStartTime);
    const endD = new Date(editEndTime);

    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
      setScheduleError("Invalid date/time format selected.");
      return;
    }

    if (endD <= startD) {
      setScheduleError("Return time must be strictly after pickup time.");
      return;
    }

    const durationHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);
    if (durationHours < 1) {
      setScheduleError("Rental duration must be at least 1 hour.");
      return;
    }

    // Operating hours check
    const getTime = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const pTime = getTime(startD);
    const dTime = getTime(endD);
    const editedDropoffHub = hubs.find((h) => h.hubId === editDropoffHubId) || pickupHub;

    if (pickupHub?.opening_time && pickupHub?.closing_time) {
      const open = pickupHub.opening_time.slice(0, 5);
      const close = pickupHub.closing_time.slice(0, 5);
      if (pTime < open || pTime > close) {
        setScheduleError(`Pickup station (${pickupHub.name}) is closed at ${pTime}. Operating hours: ${open} to ${close}.`);
        return;
      }
    }

    if (editedDropoffHub?.opening_time && editedDropoffHub?.closing_time) {
      const open = editedDropoffHub.opening_time.slice(0, 5);
      const close = editedDropoffHub.closing_time.slice(0, 5);
      if (dTime < open || dTime > close) {
        setScheduleError(`Return station (${editedDropoffHub.name}) is closed at ${dTime}. Operating hours: ${open} to ${close}.`);
        return;
      }
    }

    setBooking(null);
    setStartTime(editStartTime);
    setEndTime(editEndTime);
    setDropoffHubId(editDropoffHubId);
    setIsEditingSchedule(false);
    setHoldError("");

    // Update URL query parameters seamlessly
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set("startTime", editStartTime);
    currentParams.set("endTime", editEndTime);
    currentParams.set("dropoffHubId", editDropoffHubId);
    router.replace(`/checkout?${currentParams.toString()}`);
  };

  // Live Wall-Clock Synchronized Countdown Timer (Active on Stage 2)
  useEffect(() => {
    if (!booking?.locked_until || checkoutStage !== "PAYMENT") {
      setSecondsRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const lockExpiry = new Date(booking.locked_until).getTime();
      return Math.max(0, Math.floor((lockExpiry - Date.now()) / 1000));
    };

    const initialSeconds = calculateRemaining();
    setSecondsRemaining(initialSeconds);

    if (initialSeconds <= 0) return;

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [booking?.locked_until, checkoutStage]);

  // Handle KYC Document Upload (Optional Pre-Upload)
  const handleKycUpload = async (e) => {
    e.preventDefault();
    if (!kycFile) {
      setKycError("Please choose a driving license document.");
      return;
    }

    setUploadingKyc(true);
    setKycError("");
    setKycMessage("");

    try {
      const formData = new FormData();
      formData.append("documents", kycFile);

      const res = await api.post("/auth/kyc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setKycMessage(res.data?.message || "Driving license uploaded successfully!");
      if (res.data?.kyc_status) {
        dispatch(updateUser({ kyc_status: res.data.kyc_status }));
      }
      setTimeout(() => setShowOptionalUpload(false), 2000);
    } catch (err) {
      console.error("KYC Upload error:", err.response?.data || err.message);
      setKycError(err.response?.data?.message || "Failed to upload KYC document.");
    } finally {
      setUploadingKyc(false);
    }
  };

  // Payment Handler (Strictly from Wallet)
  const handleConfirmPayment = async () => {
    if (!booking) return;

    if (walletBalance < estimatedTotal) {
      setPayError(
        `Insufficient wallet balance. Your balance is ₹${walletBalance.toLocaleString("en-IN")}. Please top up ₹${neededAmount.toLocaleString("en-IN")} to your wallet first to book this car.`
      );
      return;
    }

    setPaying(true);
    setPayError("");

    try {
      // Execute booking confirmation strictly from wallet
      const res = await api.post(`/bookings/${booking.bookingId}/pay`);
      if (res.data?.success) {
        setConfirmedBooking(res.data.data);
        const updatedBal = Math.max(0, walletBalance - parseFloat(booking.total_price));
        setWalletBalance(updatedBal);
        dispatch(updateUser({ wallet_balance: updatedBal }));
      }
    } catch (err) {
      console.error("Payment confirmation error:", err.response?.data || err.message);
      setPayError(err.response?.data?.message || "Payment confirmation failed.");
    } finally {
      setPaying(false);
    }
  };

  // Direct Razorpay Payment with Automatic One-Click Booking Confirmation
  const handleDirectRazorpayPay = async (forcedAmount = null) => {
    if (!booking) return;

    if (isHoldExpired) {
      setPayError("Your 5-minute vehicle hold has expired. Please re-lock the car to continue.");
      return;
    }

    // Calculate exact charge amount based on user selection
    let amountToCharge;
    if (forcedAmount !== null) {
      amountToCharge = parseFloat(forcedAmount);
    } else if (walletBalance > 0 && directSplitOption === "SHORTFALL") {
      amountToCharge = neededAmount;
    } else {
      amountToCharge = estimatedTotal;
    }

    if (isNaN(amountToCharge) || amountToCharge <= 0) {
      // If zero balance required, proceed to direct wallet confirmation
      return handleConfirmPayment();
    }

    setPaying(true);
    setPayError("");
    setTopupSuccess("");

    try {
      // 1. Create order on Razorpay gateway
      const orderRes = await api.post("/wallet/razorpay/create-order", { amount: amountToCharge });
      const orderData = orderRes.data?.data;

      if (!orderData) {
        throw new Error("Could not initialize payment order.");
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || orderData.isSimulation || !window.Razorpay) {
        // Direct Sandbox simulation flow
        const verifyRes = await api.post("/wallet/razorpay/verify-payment", {
          orderId: orderData.orderId,
          paymentId: `pay_sim_${Date.now()}`,
          signature: "simulated_signature",
          amount: amountToCharge,
        });

        if (verifyRes.data?.success) {
          const freshBalance = parseFloat(verifyRes.data.data?.newBalance ?? (walletBalance + amountToCharge));
          setWalletBalance(freshBalance);
          dispatch(updateUser({ wallet_balance: freshBalance }));

          // 3. Atomically confirm booking immediately
          const confirmRes = await api.post(`/bookings/${booking.bookingId}/pay`);
          if (confirmRes.data?.success) {
            setConfirmedBooking(confirmRes.data.data);
            const remainingBal = Math.max(0, freshBalance - parseFloat(booking.total_price));
            setWalletBalance(remainingBal);
            dispatch(updateUser({ wallet_balance: remainingBal }));
          }
        }
        return;
      }

      // 3. Open Real Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: Math.round(amountToCharge * 100),
        currency: "INR",
        name: "ShiftDrive Car Rental",
        description: `Booking #${booking.bookingId.slice(0, 8)} Payment (₹${amountToCharge.toLocaleString("en-IN")})`,
        image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=120&q=80",
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            setPaying(true);
            const verifyRes = await api.post("/wallet/razorpay/verify-payment", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amount: amountToCharge,
            });

            if (verifyRes.data?.success) {
              const freshBalance = parseFloat(verifyRes.data.data?.newBalance ?? (walletBalance + amountToCharge));
              setWalletBalance(freshBalance);
              dispatch(updateUser({ wallet_balance: freshBalance }));

              // Auto-confirm booking immediately without requiring any extra user click
              try {
                const confirmRes = await api.post(`/bookings/${booking.bookingId}/pay`);
                if (confirmRes.data?.success) {
                  setConfirmedBooking(confirmRes.data.data);
                  const remainingBal = Math.max(0, freshBalance - parseFloat(booking.total_price));
                  setWalletBalance(remainingBal);
                  dispatch(updateUser({ wallet_balance: remainingBal }));
                }
              } catch (confirmErr) {
                console.error("Booking confirmation error after payment:", confirmErr);
                setPayError(
                  `Payment of ₹${amountToCharge.toLocaleString("en-IN")} was received and credited to your wallet. Please click 'Confirm Booking' to finalize.`
                );
              }
            }
          } catch (verifyErr) {
            console.error("Direct payment verification error:", verifyErr.response?.data || verifyErr.message);
            setPayError(verifyErr.response?.data?.message || "Payment verification failed.");
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name: user?.name || "Customer",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#10b981",
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (failRes) {
        setPayError(failRes.error?.description || "Payment failed at gateway.");
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Direct payment initiation error:", err.response?.data || err.message);
      setPayError(err.response?.data?.message || "Failed to initiate payment gateway.");
      setPaying(false);
    } finally {
      // In non-modal branches, ensure paying is stopped if done
    }
  };

  // Razorpay Quick Topup
  const handleQuickTopup = async (amountToAdd) => {
    const num = parseFloat(amountToAdd);
    if (!num || num <= 0) return;

    setToppingUp(true);
    setTopupSuccess("");
    setPayError("");

    try {
      // 1. Create order
      const orderRes = await api.post("/wallet/razorpay/create-order", { amount: num });
      const orderData = orderRes.data?.data;

      if (!orderData) {
        throw new Error("Could not initialize payment order.");
      }

      // 2. Load script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || orderData.isSimulation || !window.Razorpay) {
        // Direct Sandbox simulation
        const verifyRes = await api.post("/wallet/razorpay/verify-payment", {
          orderId: orderData.orderId,
          paymentId: `pay_sim_${Date.now()}`,
          signature: "simulated_signature",
          amount: num,
        });

        if (verifyRes.data?.success) {
          const newBal = parseFloat(verifyRes.data.data?.newBalance ?? (walletBalance + num));
          setWalletBalance(newBal);
          dispatch(updateUser({ wallet_balance: newBal }));
          setTopupSuccess(`₹${num.toLocaleString("en-IN")} deposited successfully!`);
          setTimeout(() => setTopupSuccess(""), 4000);
        }
        return;
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: Math.round(num * 100),
        currency: "INR",
        name: "ShiftDrive India",
        description: `Booking Top-Up (₹${num.toLocaleString("en-IN")})`,
        image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=120&q=80",
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            setToppingUp(true);
            const verifyRes = await api.post("/wallet/razorpay/verify-payment", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amount: num,
            });

            if (verifyRes.data?.success) {
              const newBal = parseFloat(verifyRes.data.data?.newBalance ?? (walletBalance + num));
              setWalletBalance(newBal);
              dispatch(updateUser({ wallet_balance: newBal }));
              setTopupSuccess(`₹${num.toLocaleString("en-IN")} deposited via Razorpay!`);
              setTimeout(() => setTopupSuccess(""), 4000);
            }
          } catch (err) {
            console.error("Top-up verification error:", err.response?.data || err.message);
            setPayError(err.response?.data?.message || "Payment verification failed.");
          } finally {
            setToppingUp(false);
          }
        },
        prefill: {
          name: user?.name || "Customer",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#10b981",
        },
        modal: {
          ondismiss: function () {
            setToppingUp(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (failRes) {
        setPayError(failRes.error?.description || "Payment failed at gateway.");
        setToppingUp(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Top-up error:", err.response?.data || err.message);
      setPayError(err.response?.data?.message || "Failed to initiate payment.");
      setToppingUp(false);
    }
  };

  // Format MM:SS for timer
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // RESTRICTION FOR STAFF ACCOUNTS
  if (isAuthenticated && user?.role && user.role !== "CUSTOMER") {
    return (
      <div className="relative min-h-[calc(100vh-80px)] bg-neutral-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-lg w-full rounded-3xl bg-neutral-900 border border-amber-500/30 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Staff Account Notice
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Consumer Bookings Restricted
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
              Administrative and Station Staff accounts are restricted from placing consumer car bookings.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href={user.role === "SUPERADMIN" ? "/admin" : "/manager"}
              className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all shadow-md"
            >
              {user.role === "SUPERADMIN" ? "Go to Superadmin HQ" : "Go to Station Desk"}
            </Link>
            <Link
              href="/fleet"
              className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Browse Fleet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // SUCCESS CONFIRMATION SCREEN
  if (confirmedBooking) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] bg-neutral-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl w-full rounded-3xl bg-neutral-900/90 border border-emerald-500/40 p-8 shadow-[0_20px_60px_rgba(16,185,129,0.15)] text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Booking Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Your Ride is Locked &amp; Ready!
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2">
              Payment was completed successfully. Your vehicle reservation voucher is generated.
            </p>
          </div>

          {/* Handover Protocol Notice */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-left space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-neutral-500">Booking Reference</span>
              <span className="font-mono font-bold text-white tracking-wider">
                {confirmedBooking.bookingId}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-neutral-500">Vehicle</span>
              <span className="font-semibold text-white">
                {vehicle?.make} {vehicle?.model}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-neutral-500">Pickup Station</span>
              <span className="font-medium text-white">{pickupHub?.name || "Pickup Hub"}</span>
            </div>

            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-neutral-500">Pickup Time</span>
              <span className="font-medium text-emerald-400">
                {startTime ? new Date(startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Scheduled Time"}
              </span>
            </div>

            {/* DL Verification Status Banner */}
            <div className="pt-2">
              {isKycVerified ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>Fast-Track Key Handover:</strong> Your Driving License is pre-verified. Show your booking QR at the station desk for immediate keys.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white">Station Handover Reminder:</strong>
                    <span>
                      Please carry your original physical Driving License when collecting the vehicle, or upload a photo anytime from your Trips dashboard before pickup.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/trips"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              View in My Trips →
            </Link>
            <Link
              href="/fleet"
              className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Browse Fleet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-emerald-500/10 to-transparent blur-[140px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-6 relative">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
              <Link href="/fleet" className="hover:text-emerald-400 transition-colors">
                Fleet
              </Link>
              <ChevronRight className="w-3 h-3 text-neutral-600" />
              <span className="text-white">
                {checkoutStage === "REVIEW" ? "1. Review Trip Details" : "2. Secure Payment"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>{checkoutStage === "REVIEW" ? "Review & Confirm Trip" : "Complete Reservation"}</span>
              <Lock className="w-5 h-5 text-emerald-400" />
            </h1>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 p-1 rounded-2xl self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={handleBackToReview}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                checkoutStage === "REVIEW"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">1</span>
              <span>Trip Details</span>
            </button>
            <div className="w-4 h-[1px] bg-neutral-800" />
            <button
              type="button"
              disabled={checkoutStage === "REVIEW"}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                checkoutStage === "PAYMENT"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "text-neutral-500 cursor-not-allowed"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">2</span>
              <span>Payment</span>
            </button>
          </div>
        </div>

        {/* Operating Hours Alert */}
        {(operatingHoursError || (holdError && holdError.toLowerCase().includes("closed"))) && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-red-300">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <div>
                <span className="font-bold text-white block">Station Operating Hours Conflict</span>
                <span>{operatingHoursError || holdError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCheckoutStage("REVIEW");
                setIsEditingSchedule(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Adjust Schedule</span>
            </button>
          </div>
        )}

        {/* Main Grid: Left Flow + Right Sticky Order Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Stage Views */}
          <div className="lg:col-span-7 space-y-6">
            {/* ================= STAGE 1: REVIEW TRIP & DRIVER ================= */}
            {checkoutStage === "REVIEW" && (
              <>
                {/* Authentication Notice if Guest */}
                {!isAuthenticated && !authLoading && (
                  <div className="p-5 rounded-3xl bg-neutral-900/80 border border-blue-500/30 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-white text-sm">Sign In to Reserve Vehicle</h4>
                      <p className="text-neutral-400 mt-0.5">Please sign in to link this reservation with your profile.</p>
                    </div>
                    <Link
                      href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/checkout")}`}
                      className="px-4 py-2 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-colors whitespace-nowrap"
                    >
                      Sign In →
                    </Link>
                  </div>
                )}

                {/* Section 1: Trip Schedule & Stations */}
                <div className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Trip Schedule &amp; Station</h3>
                        <p className="text-xs text-neutral-400">Review pickup and return time</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingSchedule(!isEditingSchedule);
                        setEditStartTime(startTime);
                        setEditEndTime(endTime);
                        setEditDropoffHubId(dropoffHubId);
                        setScheduleError("");
                      }}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/20 transition-all cursor-pointer"
                    >
                      {isEditingSchedule ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                      <span>{isEditingSchedule ? "Cancel" : "Change Schedule"}</span>
                    </button>
                  </div>

                  {!isEditingSchedule ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Pickup Box */}
                      <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Pickup Station
                        </span>
                        <div className="font-bold text-white text-sm">
                          {pickupHub?.name || "Selected Pickup Hub"}
                        </div>
                        <div className="text-emerald-400 font-medium">
                          {startTime ? new Date(startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Scheduled Time"}
                        </div>
                        {pickupHub?.opening_time && (
                          <div className="text-[10px] text-neutral-500 pt-1">
                            Hub Hours: {pickupHub.opening_time.slice(0, 5)} - {pickupHub.closing_time.slice(0, 5)}
                          </div>
                        )}
                      </div>

                      {/* Dropoff Box */}
                      <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" /> Return Station {isOneWay && <span className="text-blue-400 ml-1">(One-Way)</span>}
                        </span>
                        <div className="font-bold text-white text-sm">
                          {dropoffHub?.name || pickupHub?.name || "Selected Return Hub"}
                        </div>
                        <div className="text-blue-400 font-medium">
                          {endTime ? new Date(endTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Scheduled Time"}
                        </div>
                        {dropoffHub?.opening_time && (
                          <div className="text-[10px] text-neutral-500 pt-1">
                            Hub Hours: {dropoffHub.opening_time.slice(0, 5)} - {dropoffHub.closing_time.slice(0, 5)}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Inline Schedule Editor */
                    <form onSubmit={handleApplyScheduleChange} className="space-y-4 pt-1 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                            Pickup Date &amp; Time
                          </label>
                          <input
                            type="datetime-local"
                            value={toDatetimeLocal(editStartTime)}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                            Return Date &amp; Time
                          </label>
                          <input
                            type="datetime-local"
                            value={toDatetimeLocal(editEndTime)}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                          Return Station (Dropoff Hub)
                        </label>
                        <select
                          value={editDropoffHubId}
                          onChange={(e) => setEditDropoffHubId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs outline-none"
                        >
                          {hubs.map((hub) => (
                            <option key={hub.hubId} value={hub.hubId}>
                              {hub.name} ({hub.city}) {hub.hubId !== pickupHubId ? "• +₹500 One-Way" : "• Same Hub"}
                            </option>
                          ))}
                        </select>
                      </div>

                      {scheduleError && (
                        <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-[11px] text-red-300 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                          <span>{scheduleError}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                        >
                          Apply Schedule Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingSchedule(false)}
                          className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs hover:bg-neutral-700 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Trip Perks & Standards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-neutral-400">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950/40 border border-neutral-800/60">
                      <Gauge className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>300 KMs Free Included</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950/40 border border-neutral-800/60">
                      <Fuel className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>Return at Same Fuel Level</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950/40 border border-neutral-800/60">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span>₹0 Security Deposit</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Primary Driver & Handover Verification */}
                <div className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                  <div className="flex items-center gap-3 border-b border-neutral-800/80 pb-4">
                    <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Driver Verification &amp; Handover</h3>
                      <p className="text-xs text-neutral-400">Government regulation guidelines for vehicle key handover</p>
                    </div>
                  </div>

                  {/* Driver Info Display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-neutral-950/40 border border-neutral-800 space-y-1">
                      <span className="text-[10px] text-neutral-500 block uppercase font-bold">Primary Driver</span>
                      <span className="font-semibold text-white block">{user?.name || "Guest Customer"}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-neutral-950/40 border border-neutral-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 block uppercase font-bold">
                          Driver Contact Mobile <span className="text-red-400">*</span>
                        </span>
                        <span className="text-[10px] text-emerald-400">Hub Manager Contact</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-xs text-neutral-400 font-mono font-bold">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="Enter 10-digit mobile"
                          value={contactPhone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setContactPhone(digits);
                            setPhoneError("");
                          }}
                          className="w-full bg-neutral-900 border border-neutral-700 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-white text-xs font-mono outline-none"
                          required
                        />
                      </div>
                      {phoneError ? (
                        <span className="text-[10px] text-red-400 block pt-0.5 font-medium">{phoneError}</span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 block">
                          Essential for handover coordination &amp; 24/7 on-road support
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Non-Blocking DL Protocol Banner */}
                  {isKycVerified ? (
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex items-center gap-3 text-xs text-emerald-300">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <strong className="block text-white">Driving License Pre-Verified Online</strong>
                        <span className="text-[11px] text-neutral-400">
                          Your digital license is verified in our database. Enjoy instant Fast-Track key handover without counter paperwork.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-white block text-sm">Physical Driving License Handover</strong>
                          <p className="text-neutral-400 text-[11px] mt-1 leading-relaxed">
                            No document upload required to book! Simply show your original Driving License to our station manager when collecting the car keys, or upload a photo anytime from your Trips dashboard before pickup.
                          </p>
                        </div>
                      </div>

                      {/* Optional Pre-Upload Toggle */}
                      <div className="border-t border-neutral-800/60 pt-2 flex items-center justify-between text-[11px]">
                        <span className="text-neutral-500">Want to pre-verify before arriving?</span>
                        <button
                          type="button"
                          onClick={() => setShowOptionalUpload(!showOptionalUpload)}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline"
                        >
                          {showOptionalUpload ? "Hide Upload Form" : "Upload DL Now (Optional)"}
                        </button>
                      </div>

                      {showOptionalUpload && (
                        <form onSubmit={handleKycUpload} className="space-y-3 pt-2">
                          <div className="border border-dashed border-neutral-700 rounded-xl p-3 text-center bg-neutral-900/50">
                            <input
                              type="file"
                              accept="image/*"
                              id="kyc-opt-input"
                              onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                              className="hidden"
                            />
                            <label htmlFor="kyc-opt-input" className="cursor-pointer block text-xs">
                              <span className="text-neutral-300 font-semibold block">
                                {kycFile ? kycFile.name : "Choose Driving License Image"}
                              </span>
                              <span className="text-[10px] text-neutral-500">PNG, JPG, or WEBP up to 5MB</span>
                            </label>
                          </div>

                          {kycMessage && <div className="text-emerald-400 text-xs">{kycMessage}</div>}
                          {kycError && <div className="text-red-400 text-xs">{kycError}</div>}

                          <button
                            type="submit"
                            disabled={uploadingKyc || !kycFile}
                            className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                          >
                            {uploadingKyc ? "Uploading..." : "Submit for Digital Pre-Approval"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Proceed Action Button */}
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={!isAuthenticated || !!operatingHoursError}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 text-black font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Proceed to Payment (Lock Vehicle)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* ================= STAGE 2: SECURE PAYMENT & LOCK ================= */}
            {checkoutStage === "PAYMENT" && (
              <>
                {/* Back Link & 5-Min Lock Banner */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBackToReview}
                    className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Trip Details</span>
                  </button>

                  {/* Calm 5-Minute Hold Timer */}
                  {booking && (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                        isHoldExpired
                          ? "bg-red-950/40 border-red-800 text-red-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="font-semibold">
                        {isHoldExpired ? "Hold Expired" : `Vehicle Reserved: ${secondsRemaining !== null ? formatTimer(secondsRemaining) : "05:00"}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Re-lock Banner if Hold Expired */}
                {isHoldExpired && (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800 text-xs flex items-center justify-between text-red-300">
                    <span>Your 5-minute hold expired. Re-lock inventory to complete reservation.</span>
                    <button
                      type="button"
                      onClick={() => handleInitiateHold(true)}
                      disabled={initiatingHold}
                      className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-400 cursor-pointer"
                    >
                      {initiatingHold ? "Locking..." : "Re-lock Car"}
                    </button>
                  </div>
                )}

                {/* Section: Direct Payment & ShiftDrive Wallet Card */}
                <div className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Choose Payment Method</h3>
                        <p className="text-xs text-neutral-400">Pay directly online or debit your customer wallet</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold block">Current Wallet</span>
                      <span className={`text-base font-bold font-mono ${walletBalance >= estimatedTotal ? "text-emerald-400" : "text-amber-400"}`}>
                        ₹{walletBalance.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950/80 rounded-2xl border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("WALLET")}
                      className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === "WALLET"
                          ? "bg-neutral-800 text-white shadow-md border border-neutral-700"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>ShiftDrive Wallet</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase ${
                          walletBalance >= estimatedTotal
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {walletBalance >= estimatedTotal ? "Sufficient" : `Short ₹${neededAmount.toLocaleString("en-IN")}`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("RAZORPAY")}
                      className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === "RAZORPAY"
                          ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-md"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Razorpay Direct</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-emerald-500/20 text-emerald-300">
                        UPI / Cards
                      </span>
                    </button>
                  </div>

                  {topupSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{topupSuccess}</span>
                    </div>
                  )}

                  {/* TAB 1: SHIFTDRIVE WALLET */}
                  {paymentMethod === "WALLET" && (
                    <div className="space-y-4">
                      {walletBalance >= estimatedTotal ? (
                        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-xs space-y-2">
                          <div className="flex items-center justify-between text-emerald-300 font-semibold">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <span>Sufficient balance available to book this car.</span>
                            </div>
                            <span className="font-mono text-white">₹{estimatedTotal.toLocaleString("en-IN")} due</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 pl-6">
                            Remaining wallet balance after booking:{" "}
                            <strong className="text-white font-mono">
                              ₹{(walletBalance - estimatedTotal).toLocaleString("en-IN")}
                            </strong>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-amber-400 font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              <span>Insufficient Wallet Balance</span>
                            </span>
                            <span className="text-neutral-400 text-[11px]">
                              Short by:{" "}
                              <strong className="text-amber-400 font-mono font-bold">
                                ₹{neededAmount.toLocaleString("en-IN")}
                              </strong>
                            </span>
                          </div>

                          <p className="text-neutral-300 text-[11px] leading-relaxed">
                            Your balance is <strong>₹{walletBalance.toLocaleString("en-IN")}</strong>. You can switch to{" "}
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("RAZORPAY")}
                              className="text-emerald-400 font-bold underline hover:text-emerald-300 cursor-pointer"
                            >
                              Direct Razorpay Payment
                            </button>{" "}
                            to pay the remaining ₹{neededAmount.toLocaleString("en-IN")} via UPI/Card in 1 click, or top up your wallet below.
                          </p>

                          <div className="pt-2 border-t border-amber-800/40 flex flex-wrap gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("RAZORPAY")}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-110"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay Shortfall via Razorpay</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickTopup(neededAmount)}
                              disabled={toppingUp}
                              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                            >
                              {toppingUp ? "Depositing..." : `Top Up ₹${neededAmount.toLocaleString("en-IN")}`}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickTopup(2000)}
                              disabled={toppingUp}
                              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                            >
                              + ₹2,000
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Wallet Confirm Button */}
                      <button
                        type="button"
                        onClick={handleConfirmPayment}
                        disabled={
                          paying ||
                          initiatingHold ||
                          isHoldExpired ||
                          !booking ||
                          walletBalance < estimatedTotal
                        }
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:brightness-110 text-black font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {paying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span>Deducting Wallet &amp; Confirming...</span>
                          </>
                        ) : initiatingHold ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span>Reserving Inventory Lock...</span>
                          </>
                        ) : walletBalance < estimatedTotal ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-black" />
                            <span>Insufficient Balance — Switch to Razorpay Above</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="w-4 h-4" />
                            <span>Confirm &amp; Pay ₹{estimatedTotal.toLocaleString("en-IN")} from Wallet</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* TAB 2: RAZORPAY DIRECT (1-CLICK CHECKOUT) */}
                  {paymentMethod === "RAZORPAY" && (
                    <div className="space-y-4">
                      {/* Split or Full Amount Selection */}
                      {walletBalance > 0 ? (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-neutral-300 block uppercase tracking-wider">
                            Select Payment Breakdown:
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Option A: Shortfall */}
                            <div
                              onClick={() => setDirectSplitOption("SHORTFALL")}
                              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                directSplitOption === "SHORTFALL"
                                  ? "bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40"
                                  : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                      directSplitOption === "SHORTFALL"
                                        ? "border-emerald-400 bg-emerald-400"
                                        : "border-neutral-600"
                                    }`}
                                  >
                                    {directSplitOption === "SHORTFALL" && <Check className="w-2.5 h-2.5 text-black" />}
                                  </span>
                                  <span>Use Wallet + Pay Shortfall</span>
                                </span>
                                <span className="text-xs font-mono font-extrabold text-emerald-400">
                                  ₹{neededAmount.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-1 pl-5.5 leading-snug">
                                Deducts current wallet (₹{walletBalance.toLocaleString("en-IN")}) and pays the remaining shortfall online.
                              </p>
                            </div>

                            {/* Option B: Full Amount */}
                            <div
                              onClick={() => setDirectSplitOption("FULL")}
                              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                directSplitOption === "FULL"
                                  ? "bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40"
                                  : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                      directSplitOption === "FULL"
                                        ? "border-emerald-400 bg-emerald-400"
                                        : "border-neutral-600"
                                    }`}
                                  >
                                    {directSplitOption === "FULL" && <Check className="w-2.5 h-2.5 text-black" />}
                                  </span>
                                  <span>Pay Full via Razorpay</span>
                                </span>
                                <span className="text-xs font-mono font-extrabold text-white">
                                  ₹{estimatedTotal.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-1 pl-5.5 leading-snug">
                                Keeps your existing wallet balance (₹{walletBalance.toLocaleString("en-IN")}) safe for future bookings.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-neutral-300">
                            <CreditCard className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span>Direct 1-Click Online Payment via Razorpay</span>
                          </div>
                          <span className="font-mono font-extrabold text-white text-sm">
                            ₹{estimatedTotal.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}

                      {/* Payment Channels Pill Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-500">Supported:</span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-300 font-medium">
                          UPI (GPay / PhonePe / Paytm)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-300 font-medium">
                          Domestic Cards (Visa, Mastercard, RuPay)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-300 font-medium">
                          NetBanking
                        </span>
                      </div>

                      {/* Razorpay 1-Click Master Button */}
                      {(() => {
                        const chargeAmount =
                          walletBalance > 0 && directSplitOption === "SHORTFALL"
                            ? neededAmount
                            : estimatedTotal;

                        return (
                          <button
                            type="button"
                            onClick={() => handleDirectRazorpayPay(chargeAmount)}
                            disabled={paying || initiatingHold || isHoldExpired || !booking}
                            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:brightness-110 text-black font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {paying ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-black" />
                                <span>Processing Online Payment &amp; Confirming...</span>
                              </>
                            ) : initiatingHold ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-black" />
                                <span>Reserving Inventory Lock...</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4" />
                                <span>
                                  Pay ₹{chargeAmount.toLocaleString("en-IN")} via Razorpay &amp; Confirm Booking
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  )}

                  {payError && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{payError}</span>
                    </div>
                  )}

                  {/* Informative Instant Refund Guarantee Box */}
                  <div className="p-3.5 rounded-2xl bg-neutral-950/90 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-200 font-bold">
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ShiftDrive Instant Refund Policy</span>
                    </div>
                    <p className="leading-relaxed">
                      All booking payments (whether via Razorpay or Wallet) are backed by our{" "}
                      <strong className="text-neutral-300">Instant Wallet Refund Policy</strong>. In case of cancellation or schedule modification, refunds are deposited 100% instantly into your ShiftDrive Wallet balance with zero banking delays.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Sticky Vehicle Preview & Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 overflow-hidden sticky top-24">
              {/* Vehicle Preview Card */}
              {loadingData ? (
                <div className="h-44 bg-neutral-800/40 animate-pulse"></div>
              ) : vehicle ? (
                <div>
                  <div className="relative h-48 w-full bg-neutral-950 overflow-hidden">
                    <img
                      src={
                        vehicle.gallery_urls?.[0] ||
                        "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-emerald-400 uppercase">
                      {vehicle.tag || vehicle.vehicle_class}
                    </div>
                  </div>

                  <div className="p-5 border-b border-neutral-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      {vehicle.make}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {vehicle.model}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-2">
                      <span>{vehicle.seats || 5} Seats</span>
                      <span>•</span>
                      <span>{vehicle.fuel_type || "Petrol"}</span>
                      <span>•</span>
                      <span>{vehicle.transmission || "Automatic"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-neutral-400 text-xs">
                  No vehicle selected.
                </div>
              )}

              {/* Station & Timing Summary */}
              <div className="p-5 space-y-3.5 border-b border-neutral-800/80 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Pickup Station
                    </span>
                    <span className="font-semibold text-white">
                      {pickupHub?.name || "Selected Pickup Station"}
                    </span>
                    <span className="block text-[11px] text-neutral-400 mt-0.5">
                      {startTime ? new Date(startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Selected Date & Time"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Return Station {isOneWay && <span className="text-blue-400 font-bold ml-1">(One-Way)</span>}
                    </span>
                    <span className="font-semibold text-white">
                      {dropoffHub?.name || pickupHub?.name || "Selected Return Station"}
                    </span>
                    <span className="block text-[11px] text-neutral-400 mt-0.5">
                      {endTime ? new Date(endTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Selected Date & Time"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="p-5 space-y-2.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Pricing Breakdown
                </span>

                <div className="flex justify-between items-center text-neutral-300">
                  <span>
                    Daily Rental (₹{baseDailyRate.toLocaleString("en-IN")} × {rentalDays} {rentalDays === 1 ? "day" : "days"})
                  </span>
                  <span className="font-medium text-white">
                    ₹{(baseDailyRate * rentalDays).toLocaleString("en-IN")}
                  </span>
                </div>

                {isOneWay && (
                  <div className="flex justify-between items-center text-blue-400">
                    <span>One-Way Relocation Fee</span>
                    <span className="font-medium">+ ₹500</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-neutral-400">
                  <span>Refundable Security Deposit</span>
                  <span className="text-emerald-400 font-medium">₹0 (Waived)</span>
                </div>

                <div className="flex justify-between items-center text-neutral-400">
                  <span>2-Hour Sanitation &amp; Prep Buffer</span>
                  <span className="text-emerald-400 font-medium">Included (Free)</span>
                </div>

                <div className="border-t border-neutral-800 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Total Amount</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    ₹{estimatedTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Trust Features */}
              <div className="px-5 pb-5">
                <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-1.5 text-[11px] text-neutral-400">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Free Cancellation up to 6 hours before trip</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>100% Instant Refund to Wallet / Source</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-neutral-400 tracking-wide">
              Loading Secure Checkout...
            </p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
