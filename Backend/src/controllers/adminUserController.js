const adminUserService = require("../services/adminUserService");

const fetchPendingKyc = async (req, res) => {
  try {
    const { page, limit, search, q } = req.query;
    const filters = {
      kyc_status: "PENDING",
      search: (search || q || "").trim(),
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      sortBy: "createdAt",
      order: "ASC",
    };
    const result = await adminUserService.listUsers(filters);
    return res.status(200).json({
      success: true,
      total_pending: result.totalItems,
      data: result.users,
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: result.limit,
      },
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
    const { role, is_active, kyc_status, search, q, sortBy, order, page, limit } = req.query;
    const filters = {};
    if (role && role !== "ALL") filters.role = role.toUpperCase();
    if (is_active !== undefined && is_active !== "ALL") filters.is_active = is_active === "true";
    if (kyc_status && kyc_status !== "ALL") filters.kyc_status = kyc_status.toUpperCase();
    if (search || q) filters.search = (search || q).trim();
    if (sortBy) filters.sortBy = sortBy;
    if (order) filters.order = order;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const result = await adminUserService.listUsers(filters);
    return res.status(200).json({
      success: true,
      total_users: result.totalItems,
      data: result.users,
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: result.limit,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleOnboardStaff = async (req, res) => {
  try {
    const { name, email, phone, password, role, hubId } = req.body;
    const result = await adminUserService.onboardStaff({
      name,
      email,
      phone,
      password,
      role,
      hubId,
    });

    return res.status(201).json({
      success: true,
      message: `Staff account created successfully for ${result.name} (${result.role}).`,
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleUpdateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, hubId } = req.body;

    const updatedUser = await adminUserService.changeUserRole(userId, {
      role,
      hubId,
    });

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      data: updatedUser,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleGetUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const userDetails = await adminUserService.getUserAuditDetails(userId);

    return res.status(200).json({
      success: true,
      data: userDetails,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleUpdateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = await adminUserService.updateUserProfile(userId, req.body);
    return res.status(200).json({
      success: true,
      message: "User profile updated successfully.",
      data: updatedUser,
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
  handleOnboardStaff,
  handleUpdateUserRole,
  handleGetUserDetails,
  handleUpdateUserProfile,
};
