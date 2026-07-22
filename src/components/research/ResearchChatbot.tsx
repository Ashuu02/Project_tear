"use client";

import { useState, useRef, useEffect } from "react";
import { useSessionStore } from "@/store/session";
import type { ResearchDoc } from "@/types/teardown";
import posthog from "posthog-js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ResearchChatbotProps {
  productName: string;
  researchDoc: ResearchDoc;
  onSectionUpdate: (sectionId: string, newContent: string) => void;
}

const SUGGESTED_PROMPTS = [
  "Rewrite the Executive Summary in investor tone",
  "Go deeper on the pricing model",
  "Add more competitor analysis",
  "Simplify the technical section",
];

function parseSectionUpdate(reply: string): { sectionId: string; newContent: string } | null {
  const match = reply.match(/<section_update>([\s\S]*?)<\/section_update>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as { sectionId: string; newContent: string };
  } catch {
    return null;
  }
}

function stripSectionUpdate(reply: string): string {
  return reply.replace(/<section_update>[\s\S]*?<\/section_update>/g, "").trim();
}

export default function ResearchChatbot({ productName, researchDoc, onSectionUpdate }: ResearchChatbotProps) {
  const sessionId     = useSessionStore((s) => s.sessionId);
  const selectedModel = useSessionStore((s) => s.selectedModel);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, el.scrollHeight)}px`;
  }, [input]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    posthog.capture('chatbot_message_sent', {
      product_name: productName,
      session_id: sessionId,
      message_length: trimmed.length,
    });

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/research/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          productName,
          message: trimmed,
          researchDoc,
          history: messages,
          model: selectedModel,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        reply: string;
        sectionUpdate?: { sectionId: string; newContent: string };
      };

      const displayReply = stripSectionUpdate(data.reply);
      const assistantMsg: ChatMessage = { role: "assistant", content: displayReply };
      setMessages((prev) => [...prev, assistantMsg]);

      // Handle section update from response body
      if (data.sectionUpdate) {
        posthog.capture('section_edit_applied', {
          product_name: productName,
          session_id: sessionId,
          section_id: data.sectionUpdate.sectionId,
        });
        onSectionUpdate(data.sectionUpdate.sectionId, data.sectionUpdate.newContent);
      } else {
        // Also parse from the raw reply text
        const parsed = parseSectionUpdate(data.reply);
        if (parsed) {
          posthog.capture('section_edit_applied', {
            product_name: productName,
            session_id: sessionId,
            section_id: parsed.sectionId,
          });
          onSectionUpdate(parsed.sectionId, parsed.newContent);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden border-t border-[#EDE5DC]" style={{ height: "50%" }}>
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 flex-shrink-0 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#FBF0EB] flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#C2451E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="6" r="3" />
            <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-tear-text block leading-tight">Research Assistant</span>
          <span className="text-[10px] text-[#A89890] leading-tight">Edit sections, ask questions, or re-research any topic</span>
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-3 pb-1 flex flex-col gap-2 min-h-0">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col gap-1.5 pt-1">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-left text-[11.5px] px-3 py-2 rounded-lg bg-[#F5EFE4] border border-tear-border text-tear-muted hover:border-tear-primary hover:text-tear-text transition-colors duration-150"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-[1.6]
                  ${msg.role === "user"
                    ? "bg-tear-primary text-white rounded-br-sm"
                    : "bg-[#F5EFE4] text-tear-text rounded-bl-sm border border-tear-border"
                  }
                `}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl bg-[#F5EFE4] border border-tear-border rounded-bl-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-tear-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-tear-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-tear-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-[11px] text-tear-muted ml-1">Thinking…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 pb-3 pt-1.5 flex-shrink-0 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask or give an instruction…"
          rows={1}
          disabled={isLoading}
          className="flex-1 px-3 py-2 font-dm-sans text-[12px] text-tear-text bg-[#F5EFE4] border border-tear-border rounded-lg placeholder:text-[#B8ADA8] focus:outline-none focus:border-tear-primary transition-colors duration-150 resize-none leading-[1.5] disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-tear-primary flex items-center justify-center hover:opacity-90 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 7h10M8 3.5 11.5 7 8 10.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
