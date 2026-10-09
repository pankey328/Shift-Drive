const { User, WalletTransaction, sequelize } = require("../models");

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
const getTransactionHistory = async (userId) => {
  return await WalletTransaction.findAll({
    where: { user_id: userId },
    order: [["createdAt", "DESC"]],
  });
};

module.exports = {
  processFinancialMovement,
  getTransactionHistory,
};