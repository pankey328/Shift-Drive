const hubAdminService = require("../services/hubAdminService");

// Daily Action Desk & Fleet Health Dashboard
const getLocalDashboard = async (req, res) => {
  try {
    const hubId = await hubAdminService.resolveManagerHub(
      req.user,
      req.query.hubId,
    );
    const dashboardData = await hubAdminService.generateHubDashboard(hubId);

    return res.status(200).json({ success: true, data: dashboardData });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

// Fleet Rebalancing (Deadheading Transfers)
const handleRequestTransfer = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const {
      source_hub_id,
      destination_hub_id,
      vehicle_id,
      driver_name,
      driver_phone,
      reason,
      immediate_transit,
    } = req.body;

    const transfer = await hubAdminService.requestFleetTransfer({
      source_hub_id,
      destination_hub_id,
      vehicle_id,
      initiated_by: managerId,
      driver_name,
      driver_phone,
      reason,
      immediate_transit,
    });

    return res.status(201).json({
      success: true,
      message: "Fleet transfer requested successfully.",
      data: transfer,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleStartTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { driver_name, driver_phone } = req.body;

    const updated = await hubAdminService.startFleetTransfer(transferId, {
      driver_name,
      driver_phone,
    });

    return res.status(200).json({
      success: true,
      message: "Fleet transfer marked IN_TRANSIT.",
      data: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleCompleteTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const updated = await hubAdminService.completeFleetTransfer(transferId);

    return res.status(200).json({
      success: true,
      message: "Fleet transfer completed. Vehicle stationed at destination hub.",
      data: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleCancelTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const updated = await hubAdminService.cancelFleetTransfer(transferId);

    return res.status(200).json({
      success: true,
      message: "Fleet transfer cancelled.",
      data: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleListTransfers = async (req, res) => {
  try {
    const hubId = await hubAdminService.resolveManagerHub(
      req.user,
      req.query.hubId,
    );
    const { status } = req.query;

    const transfers = await hubAdminService.listHubTransfers(hubId, { status });

    return res.status(200).json({
      success: true,
      total: transfers.length,
      data: transfers,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

// Walk-In POS (Point of Sale)
const handleWalkInBooking = async (req, res) => {
  try {
    const hubId = await hubAdminService.resolveManagerHub(
      req.user,
      req.body.hubId,
    );
    const { customerData, bookingData, paymentData } = req.body;

    if (!customerData || !bookingData || !paymentData) {
      return res.status(400).json({
        success: false,
        message: "customerData, bookingData, and paymentData are required.",
      });
    }

    const result = await hubAdminService.processWalkInRental({
      hubId,
      customerData,
      bookingData,
      paymentData,
    });

    return res.status(201).json({
      success: true,
      message: "Walk-in rental confirmed and vehicle assigned.",
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

// Lost & Found Ledger
const handleLogLostItem = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const hubId = await hubAdminService.resolveManagerHub(
      req.user,
      req.body.hub_id,
    );
    const files = req.files;

    const item = await hubAdminService.logLostItem(
      hubId,
      managerId,
      req.body,
      files,
    );

    return res.status(201).json({
      success: true,
      message: "Lost item logged into registry.",
      data: item,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleGetLostItems = async (req, res) => {
  try {
    const hubId = await hubAdminService.resolveManagerHub(
      req.user,
      req.query.hubId,
    );
    const { status, category, vehicle_id } = req.query;

    const items = await hubAdminService.fetchLostItems(hubId, {
      status,
      category,
      vehicle_id,
    });

    return res.status(200).json({
      success: true,
      total: items.length,
      data: items,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleSearchLostByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await hubAdminService.searchLostItemsByBooking(bookingId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleClaimLostItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { claimed_by_name, claimed_by_phone } = req.body;

    const updated = await hubAdminService.claimLostItem(itemId, {
      claimed_by_name,
      claimed_by_phone,
    });

    return res.status(200).json({
      success: true,
      message: "Lost item marked as CLAIMED.",
      data: updated,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLocalDashboard,
  handleRequestTransfer,
  handleStartTransfer,
  handleCompleteTransfer,
  handleCancelTransfer,
  handleListTransfers,
  handleWalkInBooking,
  handleLogLostItem,
  handleGetLostItems,
  handleSearchLostByBooking,
  handleClaimLostItem,
};
