const { SupportTicket, User, Booking, sequelize } = require("../models");
const { Op } = require("sequelize");
const {
  generateAiResolution,
  generateChatResponse,
} = require("../services/aiService");
const { sendMail } = require("../utils/sendMail");

// HTML Email Template for AI Ticket Resolution
function buildTicketResolutionEmail({
  ticketId,
  customerName,
  subject,
  category,
  aiResponse,
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #1f2937;">
      <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #10b981; margin: 0; font-size: 24px; letter-spacing: -0.5px;">ShiftDrive Support Desk</h2>
        <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Ticket #${ticketId.slice(0, 8)}</span>
      </div>

      <p style="font-size: 15px; line-height: 1.5;">Dear <strong>${customerName || "Customer"}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
        We have received your support request regarding <strong>"${subject}"</strong> (${category.replace(/_/g, " ")}).
        Our ShiftDrive AI Assistant has analyzed your issue against platform guidelines and generated an instant resolution:
      </p>

      <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.7; color: #111827; white-space: pre-line;">
${aiResponse}
      </div>

      <div style="background-color: #f3f4f6; padding: 14px; border-radius: 10px; font-size: 12px; color: #4b5563; margin-top: 24px;">
        <strong>Need further human assistance?</strong><br/>
        If this automated resolution does not completely solve your problem, you can reply directly to this ticket from your ShiftDrive dashboard or call our 24/7 priority station helpline at <strong>1800-SHIFT-DRIVE</strong>.
      </div>

      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        &copy; ${new Date().getFullYear()} ShiftDrive Mobility Technologies. Safe & Seamless Mobility.
      </div>
    </div>
  `;
}

// Customer creates a support ticket with transactional AI resolution and email dispatch.
const createTicket = async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const {
    category,
    subject,
    description,
    booking_id,
    priority = "MEDIUM",
  } = req.body;

  if (!subject || !description || !category) {
    return res.status(400).json({
      success: false,
      message: "Please provide category, subject, and description.",
    });
  }

  // Transaction for complete consistency
  const t = await sequelize.transaction();

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Step 1: Generate AI Resolution via Resilient Multi-Provider Engine
    const aiResult = await generateAiResolution({
      category,
      subject,
      description,
      user,
    });

    // Step 2: Persist Ticket to Database
    const newTicket = await SupportTicket.create(
      {
        user_id: userId,
        booking_id: booking_id || null,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: "AI_RESOLVED",
        ai_response: aiResult.content,
        ai_provider_used: aiResult.provider,
        resolved_at: new Date(),
      },
      { transaction: t },
    );

    // Step 3: Commit the database transaction
    await t.commit();

    // Step 4: Dispatch Email Notification asynchronously
    if (user.email) {
      const emailHtml = buildTicketResolutionEmail({
        ticketId: newTicket.ticketId,
        customerName: user.name,
        subject: newTicket.subject,
        category: newTicket.category,
        aiResponse: aiResult.content,
      });

      sendMail(
        user.email,
        `[ShiftDrive Support #${newTicket.ticketId.slice(0, 8)}] ${newTicket.subject}`,
        emailHtml,
      ).catch((err) =>
        console.warn(
          "[Support Mail] Could not dispatch ticket email:",
          err.message,
        ),
      );
    }

    return res.status(201).json({
      success: true,
      message: "Support ticket created and instant AI resolution generated.",
      data: newTicket,
    });
  } catch (error) {
    // Rollback database changes on failure
    if (!t.finished) {
      await t.rollback();
    }
    console.error("Ticket creation error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process support ticket.",
    });
  }
};

// Customer fetches their submitted tickets.
const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, category, page = 1, limit = 10 } = req.query;

    const where = { user_id: userId };
    if (status && status !== "ALL") where.status = status;
    if (category && category !== "ALL") where.category = category;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await SupportTicket.findAndCountAll({
      where,
      include: [
        {
          model: Booking,
          as: "Booking",
          attributes: [
            "bookingId",
            "start_time",
            "end_time",
            "status",
            "total_price",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parsedLimit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / parsedLimit) || 1,
        currentPage: parsedPage,
        limit: parsedLimit,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Customer / Admin gets ticket details.
const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    const ticket = await SupportTicket.findByPk(ticketId, {
      include: [
        {
          model: User,
          as: "Customer",
          attributes: ["userId", "name", "email", "phone"],
        },
        {
          model: Booking,
          as: "Booking",
        },
      ],
    });

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    // Role check: Only ticket owner or Superadmin can view
    if (ticket.user_id !== userId && role !== "SUPERADMIN") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to view this ticket",
        });
    }

    return res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Interactive AI Chatbot Endpoint
const chatWithAi = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const user = req.user ? { name: req.user.name, role: req.user.role } : null;

    const chatResult = await generateChatResponse({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      user,
    });

    return res.status(200).json({
      success: true,
      data: chatResult,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate chat response.",
    });
  }
};

// Superadmin: Fetch all tickets with filters.
const adminGetAllTickets = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      search,
      page = 1,
      limit = 15,
    } = req.query;

    const where = {};
    if (status && status !== "ALL") where.status = status;
    if (category && category !== "ALL") where.category = category;
    if (priority && priority !== "ALL") where.priority = priority;

    if (search && search.trim()) {
      where[Op.or] = [
        { subject: { [Op.like]: `%${search.trim()}%` } },
        { description: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await SupportTicket.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "Customer",
          attributes: ["userId", "name", "email", "phone"],
        },
        {
          model: Booking,
          as: "Booking",
          attributes: [
            "bookingId",
            "start_time",
            "end_time",
            "status",
            "total_price",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parsedLimit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / parsedLimit) || 1,
        currentPage: parsedPage,
        limit: parsedLimit,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Superadmin: Update ticket status and add resolution notes.
const adminUpdateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, admin_notes, priority } = req.body;

    const ticket = await SupportTicket.findByPk(ticketId, {
      include: [{ model: User, as: "Customer", attributes: ["name", "email"] }],
    });

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (admin_notes !== undefined) ticket.admin_notes = admin_notes.trim();

    if (status === "CLOSED") {
      ticket.closed_at = new Date();
    } else if (status === "AI_RESOLVED") {
      ticket.resolved_at = new Date();
    }

    await ticket.save();

    // Notify customer if admin resolved and closed with notes
    if (
      admin_notes &&
      (status === "CLOSED" || status === "AI_RESOLVED") &&
      ticket.Customer?.email
    ) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #10b981;">ShiftDrive Support Update</h2>
          <p>Dear <strong>${ticket.Customer.name || "Customer"}</strong>,</p>
          <p>Your support ticket <strong>#${ticket.ticketId.slice(0, 8)}</strong> ("${ticket.subject}") has been updated by our support desk to status <strong>${ticket.status}</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong>Staff Resolution Notes:</strong><br/>
            ${ticket.admin_notes}
          </div>
          <p style="font-size: 12px; color: #777;">Thank you for choosing ShiftDrive.</p>
        </div>
      `;
      sendMail(
        ticket.Customer.email,
        `[Update #${ticket.ticketId.slice(0, 8)}] ${ticket.subject}`,
        emailHtml,
      ).catch((err) =>
        console.warn(
          "[Support Mail] Could not send admin update mail:",
          err.message,
        ),
      );
    }

    return res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  chatWithAi,
  adminGetAllTickets,
  adminUpdateTicket,
};
