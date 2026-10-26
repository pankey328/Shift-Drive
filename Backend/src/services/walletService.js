const Razorpay = require("razorpay");
const crypto = require("crypto");
const { sendMail } = require("../utils/sendMail");
const userRepository = require("../repositories/userRepository");
const {
  processFinancialMovement,
  getTransactionHistory,
} = require("../repositories/walletRepository");

const getRazorpayClient = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret || key_id === "rzp_test_placeholder") {
    return null;
  }
  return new Razorpay({ key_id, key_secret });
};

const createRazorpayOrder = async (userId, amount) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const error = new Error("Top-up amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const razorpay = getRazorpayClient();
  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";

  // If Razorpay live/test credentials are configured, create real Razorpay Order
  if (razorpay) {
    const options = {
      amount: Math.round(numAmount * 100), // in paise
      currency: "INR",
      receipt: `sd_rcpt_${Date.now()}`,
      notes: {
        userId,
        platform: "ShiftDrive Wallet",
      },
    };
    const order = await razorpay.orders.create(options);
    return {
      orderId: order.id,
      amount: numAmount,
      currency: "INR",
      keyId,
      isSimulation: false,
    };
  }

  // Graceful Sandbox simulation mode if personal test keys are not yet configured
  const mockOrderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  return {
    orderId: mockOrderId,
    amount: numAmount,
    currency: "INR",
    keyId: "rzp_test_placeholder",
    isSimulation: true,
  };
};

const verifyRazorpayPayment = async (
  userId,
  { orderId, paymentId, signature, amount }
) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const error = new Error("Invalid payment amount");
    error.statusCode = 400;
    throw error;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const isMockOrder = orderId && orderId.startsWith("order_sim_");

  if (!isMockOrder && keySecret && keySecret !== "placeholder_secret") {
    // Cryptographically verify HMAC SHA-256 signature
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== signature) {
      const error = new Error("Payment signature verification failed. Unauthorized transaction.");
      error.statusCode = 400;
      throw error;
    }
  }

  // Credit user wallet atomically
  const txnId = paymentId || `RP_${Date.now()}`;
  const result = await processFinancialMovement({
    userId,
    amount: numAmount,
    type: "TOPUP_GATEWAY",
    description: `Razorpay Online Payment (Txn: ${txnId})`,
  });

  // Dispatch confirmation receipt email
  try {
    const user = await userRepository.findUserById(userId);
    if (user?.email) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #059669;">ShiftDrive: Wallet Top-Up Successful</h2>
          <p>Hello <strong>${user.name || "Customer"}</strong>,</p>
          <p>We received your online payment via <strong>Razorpay</strong>.</p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 12px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Amount Credited:</strong> ₹${numAmount.toLocaleString("en-IN")}</p>
            <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${txnId}</p>
            <p style="margin: 4px 0;"><strong>New Wallet Balance:</strong> ₹${parseFloat(result.newBalance).toLocaleString("en-IN")}</p>
          </div>
          
          <p>You can now use your wallet balance to instantly reserve and confirm any vehicle in the ShiftDrive fleet.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">ShiftDrive Mobility Operations Command</p>
        </div>
      `;
      await sendMail(user.email, "ShiftDrive: Wallet Deposit Confirmation", emailHtml);
    }
  } catch (emailErr) {
    console.error("Failed to send topup receipt email:", emailErr.message);
  }

  return {
    success: true,
    newBalance: result.newBalance,
    transaction: result.transaction,
    message: `₹${numAmount.toLocaleString("en-IN")} deposited successfully into your ShiftDrive Wallet!`,
  };
};

const mockGatewayTopup = async (userId, amount) => {
  if (amount <= 0) {
    const error = new Error("Top-up amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return await processFinancialMovement({
    userId,
    amount,
    type: "TOPUP_GATEWAY",
    description: "Funds added via Mock Payment Gateway",
  });
};

const manualTopup = async (adminId, targetUserId, amount, adminNotes) => {
  if (amount <= 0) {
    const error = new Error("Top-up amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  return await processFinancialMovement({
    userId: targetUserId,
    amount,
    type: "TOPUP_MANUAL",
    description: `Manual Top-Up by Admin. Notes: ${adminNotes || "Cash received"}`,
  });
};

const chargePenalty = async (targetUserId, amount, reason, bookingId) => {
  if (amount <= 0) {
    const error = new Error("Penalty amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  // Convert amount to negative for deduction
  return await processFinancialMovement({
    userId: targetUserId,
    amount: -Math.abs(amount),
    type: "DAMAGE_PENALTY",
    description: `Penalty Charge: ${reason}`,
    bookingId,
  });
};

const getHistory = async (userId, filters = {}) => {
  return await getTransactionHistory(userId, filters);
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  mockGatewayTopup,
  manualTopup,
  chargePenalty,
  getHistory,
};
