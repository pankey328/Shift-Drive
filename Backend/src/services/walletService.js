const { processFinancialMovement, getTransactionHistory } = require('../repositories/walletRepository');

const mockGatewayTopup = async (userId, amount) => {
    if (amount <= 0) {
        const error = new Error("Top-up amount must be greater than zero");
        error.statusCode = 400;
        throw error;
    }

    // Simulate 2-second network delay (like Stripe or Razorpay processing)
    await new Promise(resolve => setTimeout(resolve, 2000));

    return await processFinancialMovement({
        userId,
        amount,
        type: 'TOPUP_GATEWAY',
        description: 'Funds added via Mock Payment Gateway',
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
        type: 'TOPUP_MANUAL',
        description: `Manual Top-Up by Admin. Notes: ${adminNotes || 'Cash received'}`,
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
        type: 'DAMAGE_PENALTY',
        description: `Penalty Charge: ${reason}`,
        bookingId,
    });
};

const getHistory = async (userId) => {
    return await getTransactionHistory(userId);
};

module.exports = {
    mockGatewayTopup,
    manualTopup,
    chargePenalty,
    getHistory
};