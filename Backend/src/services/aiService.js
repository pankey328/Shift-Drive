const axios = require("axios");

// ShiftDrive Grounded Domain Knowledge Base & Policies
const SHIFTDRIVE_KNOWLEDGE_BASE = `
You are the ShiftDrive Virtual Concierge & AI Support Agent for ShiftDrive, a premium self-drive car rental platform in India.
Your mission is to provide clear, polite, concise, and 100% accurate information to customers based strictly on our official platform rules.

### ShiftDrive Core Platform Rules & Operating Guidelines:
1. SECURITY DEPOSIT:
   - ₹0 Security Deposit across our entire fleet. No advance security deposits are collected or frozen.

2. DRIVING LICENSE & KYC:
   - Online DL / KYC document upload is 100% OPTIONAL at the time of booking.
   - Customers can either pre-verify online on their dashboard OR simply present their original physical Driving License at the station hub when collecting the vehicle keys.
   - Fast-Track pickup is provided to customers who pre-verify online.

3. PRICING & FREE MILEAGE:
   - All bookings include 300 KMs free per rental day.
   - Excess kilometers are billed based on the vehicle class (Hatchback ₹10/km, Sedan ₹12/km, SUV ₹15/km, Luxury ₹20/km).

4. FAIR FUEL POLICY:
   - Same-to-Same Fuel Policy: The vehicle must be returned with the same fuel level as recorded during the pickup inspection.
   - If returned with less fuel, the station manager logs the difference at market fuel rate during the return check-in.

5. LATE RETURNS & PENALTIES:
   - Return time is strictly monitored for fleet safety.
   - A late return penalty of ₹1,000 per hour (or part thereof) is assessed and deducted from the customer's wallet.

6. VEHICLE GUARANTEE & FLEET SWAP:
   - If a previous customer returns a car late and impacts an upcoming reservation, ShiftDrive automatically attempts a seamless Fleet Swap at the hub (same class or free upgrade to a higher class with ₹0 extra charges).
   - If no replacement car is available at the hub, the booking is automatically cancelled, and the customer receives a 100% FULL REFUND of the booking total PLUS a ₹1,000 Convenience / Apology Credit added directly to their ShiftDrive Wallet.

7. STATION OPERATING HOURS:
   - Hub stations operate strictly between 06:00 AM and 11:00 PM (23:00) daily.
   - Vehicle pickup and drop-off cannot be scheduled outside hub operating hours.

8. WALLET & PAYMENTS:
   - Payments are made seamlessly from the ShiftDrive Wallet.
   - Customers must have a sufficient wallet balance matching the estimated reservation total before payment confirmation. Instant top-up is supported directly at checkout.

9. ON-ROAD BREAKDOWN & EMERGENCIES:
   - In case of a mechanical breakdown, accident, or roadside emergency, customers can tap "Report Emergency" directly on their Trips dashboard.
   - Reporting an emergency immediately freezes any late return penalties, alerts the hub station manager, and dispatches roadside assistance.
   - 24/7 Emergency Support Hotline: 1800-SHIFT-DRIVE (1800-744-3837).
   - Support Email: support@shiftdrive.com.

10. ONE-WAY RENTALS:
   - Customers can pick up at one hub and return at another participating hub in the network. A calculated relocation fee is included in the transparent checkout breakdown.

11. DELAYED PICKUP, NO-SHOW & CANCELLATION POLICIES:
   - Running Late / Next-Day Pickup: If a customer cannot collect their car before station closing, they can tap "I'm Running Late" on their Trips dashboard. The vehicle will remain held on the lot for next-day pickup starting from morning station opening hours. The scheduled rental dates and total pricing remain unchanged with no refund for elapsed hours. To shift the full rental dates, customers should cancel and book again.
   - Timely Cancellation: If a booking is cancelled before the station closing time on the scheduled pickup date, a 100% FULL REFUND is credited to the customer's ShiftDrive Wallet.
   - Delayed Cancellation: If cancelled after station closing or on subsequent days, a prorated refund is provided (elapsed days are deducted at the daily rental rate, and the remaining unused days are refunded).
   - Silent No-Show: If a customer does not pick up their vehicle before station closing and did not tap "I'm Running Late", the system automatically cancels the reservation, deducts a ₹1,000 penalty, refunds the remaining balance to their wallet, and frees the vehicle for other customers.
   - Expired Delayed Reservation: If a customer taps "I'm Running Late" but never collects the vehicle before the booking end date/time, the reservation expires with ₹0 refund because the car was reserved exclusively on their behalf.

### Behavioral & Formatting Rules (CRITICAL):
- Answer politely, concisely, and factually.
- Do NOT hallucinate rules or offer unofficial discounts/refunds outside of ShiftDrive platform policies.
- If the user asks something completely outside of car rentals, driving in India, or ShiftDrive services, politely remind them that you can only assist with ShiftDrive rental services.
- If an issue is ambiguous, technical, or requires account balance adjustments, advise the user to contact customer care at 1800-SHIFT-DRIVE or submit a support ticket.
- OUTPUT FORMATTING: Output clean, natural plain text suitable for direct display in mobile and web chat bubbles.
- NEVER use markdown double-asterisks (avoid **bold**). Never wrap words, titles, labels, or phone numbers in asterisks.
- NEVER use markdown hashes (avoid ### or ## headings). Write simple section titles followed by a colon (e.g. "What to keep in mind:").
- For lists or options, use clean bullet points starting with a bullet (• ) or clear numbers (1. , 2. ).
- Never wrap disclaimers in asterisks. Write them plainly in parentheses: (ShiftDrive AI Assistant can make mistakes. Please verify important terms.)
`;

// Instant Predefined FAQ Chips for Zero-Token / Instant Response
const PREDEFINED_FAQS = [
  {
    keywords: ["security deposit", "deposit", "caution money"],
    answer:
      "ShiftDrive offers ₹0 Security Deposit across our entire fleet! You do not need to lock or freeze any caution money when booking a car.",
  },
  {
    keywords: ["dl", "driving license", "license", "kyc", "document"],
    answer:
      "Online DL upload is 100% optional at booking! You can choose to pre-verify online for fast-track key handover, or simply show your original physical Driving License to the hub manager when picking up the car.",
  },
  {
    keywords: ["fuel", "petrol", "diesel", "fuel policy"],
    answer:
      "We follow a Same-to-Same Fair Fuel Policy. Please return the vehicle with the same fuel level as recorded during your pickup inspection.",
  },
  {
    keywords: ["late return", "return late", "late fee", "overdue return"],
    answer:
      "Late returns are billed at a penalty of ₹1,000 per hour to protect upcoming customer reservations. If you anticipate a delay, please contact your hub manager or use your trips dashboard.",
  },
  {
    keywords: ["running late", "delayed pickup", "late pickup", "cant pick up", "cant collect"],
    answer:
      "If you are running late and cannot reach the station before closing time, tap 'I'm Running Late' on your Trips dashboard. Your vehicle will be held for next-day pickup at morning opening hours. Note: Original booking dates and total pricing remain unchanged with no refund for elapsed hours. To change your dates entirely, please cancel and rebook.",
  },
  {
    keywords: ["no show", "missed pickup", "didnt pickup", "didn't pick up"],
    answer:
      "If you fail to collect your car before station closing without notifying via 'I'm Running Late', the system automatically cancels your booking, deducts a ₹1,000 no-show fee, and refunds the remaining balance to your wallet.",
  },
  {
    keywords: ["cancel refund", "cancellation policy", "cancel booking", "refund on cancel"],
    answer:
      "If you cancel before the station closing time on your pickup date, you receive a 100% full refund to your ShiftDrive Wallet. If you cancel later or on subsequent days, a prorated refund is issued where elapsed days are deducted at the daily rate, and the remaining unused balance is refunded.",
  },
  {
    keywords: ["hub hours", "operating hours", "timing", "open", "close"],
    answer:
      "All ShiftDrive hub stations operate between 06:00 AM and 11:00 PM daily. Key handover and drop-offs occur strictly within these operating hours.",
  },
  {
    keywords: ["emergency", "breakdown", "accident", "puncture", "help"],
    answer:
      "In an emergency, click 'Report Emergency' on your Trips dashboard to instantly freeze late fees and alert the dispatch team. You can also call our 24/7 hotline at 1800-SHIFT-DRIVE (1800-744-3837).",
  },
];

// Checks if a user message matches an instant predefined FAQ.
function checkInstantFaq(message) {
  if (!message) return null;
  const lower = message.toLowerCase().trim();
  for (const faq of PREDEFINED_FAQS) {
    if (faq.keywords.some((kw) => lower.includes(kw))) {
      return faq.answer;
    }
  }
  return null;
}

// Groq API (openai/gpt-oss-120b, qwen/qwen3.8-27b, llama-3.3-70b)
async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const groqModels = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ];
  let lastError = null;

  for (const model of groqModels) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages,
          temperature: 0.3,
          max_tokens: 800,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 12000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content && content.trim()) return content.trim();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Groq models failed");
}

// Google Gemini (gemini-3.8-flash, gemini-flash-latest, gemini-2.5-flash)
async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  // Format messages into Gemini format
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemMessage = messages.find((m) => m.role === "system");
  const systemInstruction = systemMessage
    ? { parts: [{ text: systemMessage.content }] }
    : undefined;

  const geminiModels = [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ];
  let lastError = null;

  for (const model of geminiModels) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents,
          systemInstruction,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 12000,
        },
      );

      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      if (text && text.trim()) return text.trim();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

// OpenAI (gpt-4o-mini)
async function callOpenAi(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 800,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 12000,
    },
  );

  return response.data?.choices?.[0]?.message?.content || "";
}

// Resilient Multi-Provider Fallback Cascade Engine.
async function executeAiWithFallback(messages) {
  const providers = [
    { name: "GROQ", fn: callGroq },
    { name: "GEMINI", fn: callGemini },
    { name: "OPENAI", fn: callOpenAi },
  ];

  const errors = [];

  for (const provider of providers) {
    try {
      const text = await provider.fn(messages);
      if (text && text.trim().length > 0) {
        return {
          content: text.trim(),
          provider: provider.name,
        };
      }
    } catch (err) {
      console.warn(
        `[AI Engine] ${provider.name} failed: ${err.response?.data?.error?.message || err.message}`,
      );
      errors.push({ provider: provider.name, error: err.message });
    }
  }

  // Graceful offline fallback if all providers fail or tokens are exhausted
  console.error(
    "[AI Engine] All AI providers exhausted or unavailable. Using safety fallback.",
  );
  return {
    content:
      "Thank you for contacting ShiftDrive Support. Our AI system is currently handling high volume, but your query has been logged. For immediate priority assistance, our station support desk is available 24/7 at 1800-SHIFT-DRIVE (1800-744-3837) or email support@shiftdrive.com.",
    provider: "FALLBACK_OFFLINE",
  };
}

// Generates an instant, grounded AI resolution for a support ticket.
async function generateAiResolution({ category, subject, description, user }) {
  const prompt = [
    {
      role: "system",
      content: `${SHIFTDRIVE_KNOWLEDGE_BASE}

You are handling a Formal Customer Support Ticket.
Customer Name: ${user?.name || "Valued Customer"}
Customer Email: ${user?.email || "N/A"}
Category: ${category}
Subject: ${subject}

Provide a helpful, empathetic, and structured resolution addressing the customer's specific problem.
Formatting Rules:
- DO NOT use markdown bold asterisks (**text**). Never wrap text in **.
- DO NOT use markdown hashes (###).
- For bulleted lists, use a unicode bullet (• ).
- For numbered points, use plain numerals (1. , 2. ).

Structure your reply with:
1. Warm, professional greeting
2. Direct answer or resolution based strictly on ShiftDrive policies (referencing relevant policies like ₹0 deposit, fuel policy, DL physical handover, late fee ₹1000/hr, or wallet refunds)
3. Step-by-step guidance on what the customer should do next
4. ShiftDrive Support Helpline contact info: 1800-SHIFT-DRIVE (1800-744-3837)`,
    },
    {
      role: "user",
      content: `Ticket Subject: ${subject}\n\nTicket Description:\n${description}`,
    },
  ];

  return await executeAiWithFallback(prompt);
}

// Generates a conversational response for the interactive AI Chatbot.
async function generateChatResponse({ message, history = [], user = null }) {
  // Check instant FAQ first
  const instantMatch = checkInstantFaq(message);
  if (instantMatch && history.length === 0) {
    return {
      content: instantMatch,
      provider: "PREDEFINED_CACHE",
      suggestedAction: null,
    };
  }

  const messages = [
    {
      role: "system",
      content: `${SHIFTDRIVE_KNOWLEDGE_BASE}

User Context:
Logged In: ${user ? "Yes (" + user.name + ")" : "Guest Visitor"}
Role: ${user?.role || "CUSTOMER"}

Instructions:
- Keep responses friendly, helpful, and concise (under 2-3 short paragraphs).
- STRICT FORMATTING: Do NOT use markdown bold asterisks (**text**). Never use ** anywhere in the response.
- Do NOT use markdown hashes (###). Use simple section titles with a colon (e.g. "What to keep in mind:").
- For lists, use clean bullet points (• ) or numbers (1. , 2. ).
- If the customer wants human help or their issue is complex, advise them to click "Create Support Ticket" or call 1800-SHIFT-DRIVE (1800-744-3837).
- Include this clean disclaimer at the bottom if providing specific policy advice:
  (ShiftDrive AI Assistant can make mistakes. Please verify important terms.)`,
    },
  ];

  // Append recent chat history (up to last 6 messages)
  if (Array.isArray(history)) {
    const recent = history.slice(-6);
    for (const h of recent) {
      if (h.sender && h.text) {
        messages.push({
          role: h.sender === "USER" ? "user" : "assistant",
          content: h.text,
        });
      }
    }
  }

  messages.push({
    role: "user",
    content: message,
  });

  const res = await executeAiWithFallback(messages);

  // Detect if user might benefit from creating a ticket
  const lowerMsg = message.toLowerCase();
  const lowerRes = res.content.toLowerCase();
  const needsHuman =
    lowerMsg.includes("human") ||
    lowerMsg.includes("agent") ||
    lowerMsg.includes("manager") ||
    lowerMsg.includes("complaint") ||
    lowerRes.includes("support ticket") ||
    lowerRes.includes("1800-shift-drive");

  return {
    content: res.content,
    provider: res.provider,
    suggestedAction: needsHuman ? "CREATE_TICKET" : null,
  };
}

module.exports = {
  generateAiResolution,
  generateChatResponse,
  checkInstantFaq,
  PREDEFINED_FAQS,
  SHIFTDRIVE_KNOWLEDGE_BASE,
};
