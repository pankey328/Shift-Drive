const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createTicket,
  getMyTickets,
  getTicketById,
  chatWithAi,
  adminGetAllTickets,
  adminUpdateTicket,
} = require("../controllers/supportController");
const jwt = require("jsonwebtoken");

// Optional auth middleware for chatbot (extracts user if token provided, but allows guests)
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key");
      req.user = decoded;
    } catch {
      // Ignore token failure for optional auth
    }
  }
  next();
};

// Rate limiter for chatbot to prevent spam
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // max 30 messages per minute per IP
  message: {
    success: false,
    message: "Chat rate limit exceeded. Please wait a moment before sending more messages.",
  },
});

// Rate limiter for ticket creation
const ticketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many tickets created. Please wait before submitting another ticket.",
  },
});

// Customer Endpoints (strictly for consumer accounts)
router.post("/tickets", protect, authorize("CUSTOMER"), ticketLimiter, createTicket);
router.get("/my-tickets", protect, authorize("CUSTOMER"), getMyTickets);
router.get("/tickets/:ticketId", protect, getTicketById);
router.post("/chat", chatLimiter, optionalAuth, chatWithAi);

// Superadmin Endpoints
router.get("/admin/tickets", protect, authorize("SUPERADMIN"), adminGetAllTickets);
router.put("/admin/tickets/:ticketId", protect, authorize("SUPERADMIN"), adminUpdateTicket);

module.exports = router;
