"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import CreateTicketModal from "./CreateTicketModal";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  RotateCcw,
  LifeBuoy,
  PhoneCall,
  ExternalLink,
} from "lucide-react";

const QUICK_CHIPS = [
  { label: "💳 ₹0 Security Deposit", query: "What is the security deposit policy?" },
  { label: "📄 Physical DL at Pickup", query: "Do I have to upload my driving license to book a car?" },
  { label: "⏱️ Late Return Penalty", query: "What happens if I return the car late?" },
  { label: "⛽ Fair Fuel Policy", query: "What is the fuel policy?" },
  { label: "📞 24/7 Human Hotline", query: "How do I contact customer care for emergency support?" },
];

export default function AiChatbotWidget() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "initial-msg",
      sender: "AI",
      text: "Hello! I am your **ShiftDrive Virtual Concierge**. I can instantly answer questions about car bookings, ₹0 security deposit, physical DL handover, hub operating hours, and roadside support.\n\nHow can I help you today?",
      provider: "SYSTEM",
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Support Ticket Modal integration
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");

  const messagesEndRef = useRef(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "USER",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setLoading(true);

    try {
      // Build brief history format for backend
      const history = messages.slice(-5).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await api.post("/support/chat", {
        message: text,
        history,
      });

      if (res.data?.success && res.data?.data) {
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: "AI",
          text: res.data.data.content,
          provider: res.data.data.provider,
          suggestedAction: res.data.data.suggestedAction,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.warn("Chat error:", err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: "AI",
        text: "I'm having trouble connecting to the network right now. For immediate support, please contact our 24/7 hotline at **1800-SHIFT-DRIVE** or submit a support ticket.",
        provider: "OFFLINE",
        suggestedAction: "CREATE_TICKET",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicketFromChat = (contextQuery) => {
    setTicketSubject(contextQuery || "Chat Support Escalation");
    setIsTicketModalOpen(true);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "initial-msg-reset",
        sender: "AI",
        text: "Chat cleared! How can I assist you with your ShiftDrive car rental today?",
        provider: "SYSTEM",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  if (!mounted) return null;

  if (pathname?.startsWith("/manager") || pathname?.startsWith("/admin")) return null;
  if (isAuthenticated && user?.role && user.role !== "CUSTOMER") return null;

  return (
    <>
      {/* Floating Action Button */}
      <aside aria-label="AI Chatbot Assistant" className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            title="ShiftDrive AI Assistant"
            aria-label="Open ShiftDrive AI Chat"
            className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-emerald-300/50"
          >
            <Bot className="w-6 h-6 text-black transition-transform group-hover:rotate-6" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-black animate-ping"></span>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-emerald-400"></span>
          </button>
        )}
      </aside>

      {/* Slide-Up Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] rounded-3xl bg-neutral-900 border border-neutral-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-950"></span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>ShiftDrive AI Assistant</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    Online
                  </span>
                </h3>
                <p className="text-[10px] text-neutral-400">
                  {user ? `Helping ${user.name}` : "Instant Verified Guidance"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset conversation"
                className="w-7 h-7 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="w-7 h-7 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === "USER";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1 ${
                      isUser
                        ? "bg-emerald-500 text-black font-medium shadow-md shadow-emerald-500/10 rounded-br-none"
                        : "bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-line font-sans leading-relaxed">
                      {msg.text}
                    </div>

                    {!isUser && msg.provider && msg.provider !== "SYSTEM" && (
                      <div className="pt-1 flex items-center justify-between text-[9px] text-neutral-500 font-mono border-t border-neutral-800/60 mt-1.5">
                        <span>Verified Policy</span>
                        <span>{msg.provider}</span>
                      </div>
                    )}
                  </div>

                  {/* 1-Click Support Ticket Suggestion Card */}
                  {!isUser && msg.suggestedAction === "CREATE_TICKET" && (
                    <div className="mt-2 w-[85%] p-3 rounded-2xl bg-neutral-950 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                        <LifeBuoy className="w-3.5 h-3.5" />
                        <span>Need Human Intervention?</span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Create an official support ticket for personalized account or trip resolution by our station desk.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenTicketFromChat(messages[messages.length - 2]?.text || "")}
                        className="w-full py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Create Support Ticket</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[9px] text-neutral-500 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-neutral-400 text-xs bg-neutral-950 border border-neutral-800 rounded-2xl p-3 w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>ShiftDrive AI is analyzing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick FAQ Chips Container */}
          <div className="px-3 py-2 bg-neutral-950/80 border-t border-neutral-800/80 overflow-x-auto scrollbar-none flex gap-1.5">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.query)}
                disabled={loading}
                className="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-[10px] whitespace-nowrap transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about deposits, DL, fuel, late fees..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[9px] text-neutral-500 pt-2 px-1">
              <span>ShiftDrive AI Assistant may make mistakes.</span>
              <button
                type="button"
                onClick={() => handleOpenTicketFromChat("")}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integrated Ticket Modal */}
      <CreateTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        initialSubject={ticketSubject}
      />
    </>
  );
}
