const walletService = require('../services/walletService');

const mockTopup = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { amount } = req.body;

        if (!amount) {
            return res.status(400).json({ message: "Amount is required" });
        }

        const result = await walletService.mockGatewayTopup(userId, amount);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({ message: error.message });
    }
};

const manualTopup = async (req, res) => {
    try {
        const adminId = req.user.userId;
        const { targetUserId, amount, notes } = req.body;

        if (!targetUserId || !amount) {
            return res.status(400).json({ message: "targetUserId and amount are required" });
        }

        const result = await walletService.manualTopup(adminId, targetUserId, amount, notes);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({ message: error.message });
    }
};

const chargePenalty = async (req, res) => {
    try {
        const { targetUserId, amount, reason, bookingId } = req.body;

        if (!targetUserId || !amount || !reason) {
            return res.status(400).json({ message: "targetUserId, amount, and reason are required" });
        }

        const result = await walletService.chargePenalty(targetUserId, amount, reason, bookingId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({ message: error.message });
    }
};

const getHistory = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { type, page, limit } = req.query;
        const result = await walletService.getHistory(userId, {
            type,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });

        if (Array.isArray(result)) {
            return res.status(200).json({ success: true, count: result.length, data: result });
        }

        return res.status(200).json({
            success: true,
            count: result.totalItems,
            data: result.transactions,
            pagination: {
                totalItems: result.totalItems,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                limit: result.limit,
            },
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({ message: error.message });
    }
};

module.exports = {
    mockTopup,
    manualTopup,
    chargePenalty,
    getHistory
};