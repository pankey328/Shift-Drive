const userRepository = require("../repositories/userRepository");
const { sendMail } = require("../utils/sendMail");

const getPendingKycList = async () => {
  return await userRepository.getUsersByKycStatus("PENDING");
};

const reviewKyc = async (userId, { status, rejectionReason = null }) => {
  const allowed = ["VERIFIED", "REJECTED"];
  if (!allowed.includes(status)) {
    const error = new Error("Invalid status. Must be VERIFIED or REJECTED.");
    error.statusCode = 400;
    throw error;
  }

  if (status === "REJECTED" && !rejectionReason) {
    const error = new Error("Rejection reason is required when rejecting KYC.");
    error.statusCode = 400;
    throw error;
  }

  const updatedUser = await userRepository.updateUserKyc(userId, {
    kyc_status: status,
    kyc_rejection_reason: status === "REJECTED" ? rejectionReason : null,
  });

  // Notify customer via email
  const subject =
    status === "VERIFIED"
      ? "ShiftDrive - KYC Documents Approved!"
      : "ShiftDrive - KYC Verification Requires Action";

  const html =
    status === "VERIFIED"
      ? `<p>Hello ${updatedUser.name},</p><p>Congratulations! Your driving license and KYC documents have been verified. You can now book and drive any vehicle in our fleet.</p>`
      : `<p>Hello ${updatedUser.name},</p><p>Your KYC submission was rejected for the following reason:</p><blockquote>${rejectionReason}</blockquote><p>Please log in and re-upload valid documents to unlock vehicle bookings.</p>`;

  try {
    await sendMail(updatedUser.email, subject, html);
  } catch (mailErr) {
    console.error("Failed to send KYC status email:", mailErr.message);
  }

  return updatedUser;
};

const toggleAccountStatus = async (userId, { is_active }) => {
  if (typeof is_active !== "boolean") {
    const error = new Error("is_active boolean field is required.");
    error.statusCode = 400;
    throw error;
  }

  return await userRepository.updateUserAccountStatus(userId, is_active);
};

const listUsers = async (filters) => {
  return await userRepository.getAllUsersList(filters);
};

module.exports = {
  getPendingKycList,
  reviewKyc,
  toggleAccountStatus,
  listUsers,
};
