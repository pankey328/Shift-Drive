const adminUserService = require("../services/adminUserService");

const fetchPendingKyc = async (req, res) => {
  try {
    const pendingUsers = await adminUserService.getPendingKycList();
    return res.status(200).json({
      success: true,
      total_pending: pendingUsers.length,
      data: pendingUsers,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleReviewKyc = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason } = req.body;

    const user = await adminUserService.reviewKyc(userId, {
      status,
      rejectionReason,
    });

    return res.status(200).json({
      success: true,
      message: `KYC status updated to ${status}.`,
      data: user,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleToggleAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    const user = await adminUserService.toggleAccountStatus(userId, {
      is_active,
    });

    return res.status(200).json({
      success: true,
      message: `User account ${is_active ? "activated" : "deactivated/suspended"}.`,
      data: user,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const fetchUsers = async (req, res) => {
  try {
    const { role, is_active, kyc_status } = req.query;
    const filters = {};
    if (role) filters.role = role.toUpperCase();
    if (is_active !== undefined) filters.is_active = is_active === "true";
    if (kyc_status) filters.kyc_status = kyc_status.toUpperCase();

    const users = await adminUserService.listUsers(filters);
    return res.status(200).json({
      success: true,
      total_users: users.length,
      data: users,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

module.exports = {
  fetchPendingKyc,
  handleReviewKyc,
  handleToggleAccount,
  fetchUsers,
};
