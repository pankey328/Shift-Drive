const { User, WalletTransaction, sequelize } = require("../models");
const { Op } = require("sequelize");

// Atomic transaction to update user wallet balance and create transaction log
const processFinancialMovement = async ({
  userId,
  amount,
  type,
  description,
  bookingId = null,
}) => {
  return await sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t });

    if (!user) {
      const error = new Error("User not found for wallet transaction");
      error.statusCode = 404;
      throw error;
    }

    const numericAmount = parseFloat(amount);
    const newBalance = parseFloat(user.wallet_balance) + numericAmount;

    user.wallet_balance = newBalance;
    await user.save({ transaction: t });

    const transactionRecord = await WalletTransaction.create(
      {
        user_id: userId,
        amount: numericAmount,
        type,
        description,
        booking_id: bookingId,
      },
      { transaction: t }
    );

    return {
      newBalance: user.wallet_balance,
      transaction: transactionRecord,
    };
  });
};

// Fetch wallet transaction history for a user (newest first)
const getTransactionHistory = async (userId, filters = {}) => {
  const where = { user_id: userId };

  if (filters.type === "CREDIT") {
    where.amount = { [Op.gt]: 0 };
  } else if (filters.type === "DEBIT") {
    where.amount = { [Op.lt]: 0 };
  } else if (filters.type && filters.type !== "ALL") {
    where.type = filters.type;
  }

  if (filters.page || filters.limit) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await WalletTransaction.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      transactions: rows,
      totalItems: count,
      totalPages: Math.ceil(count / limit) || 1,
      currentPage: page,
      limit,
    };
  }

  return await WalletTransaction.findAll({
    where,
    order: [["createdAt", "DESC"]],
  });
};

module.exports = {
  processFinancialMovement,
  getTransactionHistory,
};