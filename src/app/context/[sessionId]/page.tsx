"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSessionStore } from "@/store/session";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_TYPES = [".pdf", ".txt", ".doc", ".docx"];
const ACCEPTED_MIME = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function ContextPage() {
  const router         = useRouter();
  const productName    = useSessionStore((s) => s.productName);
  const sessionId      = useSessionStore((s) => s.sessionId);
  const tier2Answers   = useSessionStore((s) => s.tier2Answers);
  const setUserContext = useSessionStore((s) => s.setUserContext);

  const [ready, setReady]             = useState(false);
  const [textValue, setTextValue]     = useState("");
  const [file, setFile]               = useState<File | null>(null);
  const [fileError, setFileError]     = useState<string>("");
  const [isDragging, setIsDragging]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && (!productName || !tier2Answers)) router.replace("/");
  }, [ready, productName, tier2Answers, router]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(120, el.scrollHeight)}px`;
  }, [textValue]);

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setTextValue((prev) => (prev ? prev + "\n\n" + text : text));
    } catch {
      // Clipboard permission denied or API not available
    }
  }

  function validateFile(f: File): string {
    if (f.size > MAX_FILE_SIZE) return "File exceeds 25MB limit";
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(f.type)) {
      return "Unsupported file type. Please use PDF, TXT, DOC, or DOCX.";
    }
    return "";
  }

  function handleFileSelect(f: File) {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      return;
    }
    setFileError("");
    setFile(f);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function proceed(skip: boolean) {
    setIsSubmitting(true);
    try {
      if (skip) {
        setUserContext(null);
        router.push(`/pipeline/${sessionId}`);
        return;
      }

      let combinedText = textValue.trim();

      if (file) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("sessionId", sessionId);
          const res = await fetch("/api/context/upload", { method: "POST", body: formData });
          if (res.ok) {
            const data = (await res.json()) as { extractedText: string; valid: boolean; message?: string };
            if (data.valid && data.extractedText) {
              combinedText = combinedText
                ? combinedText + "\n\n[From uploaded file: " + file.name + "]\n" + data.extractedText
                : "[From uploaded file: " + file.name + "]\n" + data.extractedText;
            }
          }
        } catch {
          // Non-fatal - proceed without file text
        }
      }

      if (combinedText || file?.name) {
        setUserContext({
          text: combinedText,
          fileName: file?.name,
        });
      } else {
        setUserContext(null);
      }

      router.push(`/pipeline/${sessionId}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!ready || !productName) {
    return (
      <div className="min-h-screen bg-tear-bg flex items-center justify-center font-dm-sans">
        <span className="text-sm text-tear-muted animate-pulse">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text">
      {/* Nav */}
      <nav className="flex items-center justify-between px-12 py-[22px] border-b border-[#F0E8DF] animate-fade-in">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
            <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-tear-primary bg-[#FBF0EB] border border-[#F0C9B8] px-3 py-1 rounded-full">
            Additional Context
          </span>
          <span className="text-[13px] font-normal text-[#A89890] tracking-[0.02em]">Step 4 of 5</span>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto py-10 px-6 pb-28">
        <div className="max-w-[720px] mx-auto flex flex-col gap-8">

          {/* Product card */}
          <div className="flex items-center gap-3 px-5 py-4 bg-white border border-tear-border rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] animate-fade-up-1">
            <div className="w-9 h-9 rounded-lg bg-[#FBF0EB] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
                <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className="text-[13px] font-semibold text-tear-text block">{productName}</span>
              <span className="text-[11.5px] text-tear-muted">Selected for teardown</span>
            </div>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-2 animate-fade-up-2">
            <h2 className="font-lora text-[28px] font-medium leading-[1.25] text-tear-text tracking-[-0.01em]">
              Any additional context you&apos;d like to share?
            </h2>
            <p className="text-[15px] font-normal leading-[1.6] text-tear-muted">
              This is optional. Paste notes, upload a document, or share anything that helps the agent research better.
            </p>
          </div>

          {/* Area 1 - Free text */}
          <div className="flex flex-col gap-2 animate-fade-up-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A89890]">Notes & Context</span>
              <button
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-tear-muted border border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="8" height="9" rx="1" />
                  <path d="M4 4V3a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1" />
                </svg>
                Paste from clipboard
              </button>
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Paste notes, competitor URLs, internal knowledge, or any context that helps the agent research better..."
                className="w-full px-4 py-3.5 font-dm-sans text-[14px] text-tear-text bg-white border-[1.5px] border-tear-border rounded-xl placeholder:text-[#B8ADA8] focus:outline-none focus:border-tear-primary transition-colors duration-150 resize-none leading-[1.7]"
                style={{ minHeight: "120px" }}
              />
              <span className="absolute bottom-3 right-3.5 text-[11px] text-[#B8ADA8]">
                {textValue.length.toLocaleString()} chars
              </span>
            </div>
          </div>

          {/* Area 2 - File upload */}
          <div className="flex flex-col gap-2 animate-fade-up-4">
            <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A89890]">Upload a Document</span>

            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150
                  ${isDragging
                    ? "border-tear-primary bg-[#FBF0EB]"
                    : "border-tear-border bg-white hover:border-tear-primary hover:bg-[#FDFAF6]"
                  }
                `}
              >
                <div className="w-10 h-10 rounded-full bg-[#F5EFE4] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="#A89890" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 3v12M7.5 7.5 11 4l3.5 3.5" />
                    <path d="M3 17h16" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[13.5px] font-medium text-tear-text">
                    {isDragging ? "Drop it here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-[12px] text-tear-muted mt-0.5">PDF, TXT, DOC, DOCX · Max 25MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-3.5 bg-white border border-tear-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FBF0EB] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#C2451E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="1" width="10" height="14" rx="1.5" />
                      <path d="M5 5h5M5 8h5M5 11h3" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[13px] font-medium text-tear-text block">{file.name}</span>
                    <span className="text-[11.5px] text-tear-muted">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-[12px] text-[#A89890] hover:text-tear-primary transition-colors duration-150 px-2 py-1"
                >
                  Remove
                </button>
              </div>
            )}

            {fileError && (
              <span className="text-[12px] text-[#E53E3E] mt-0.5">{fileError}</span>
            )}
          </div>

          {/* Area 3 - Info banner */}
          <div className="flex items-start gap-3 px-4 py-3.5 bg-[#F5EFE4] border border-tear-border rounded-xl animate-fade-up-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" stroke="#7C6E68" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7.5v4" />
              <circle cx="8" cy="5" r="0.5" fill="#7C6E68" />
            </svg>
            <p className="text-[12.5px] text-tear-muted leading-[1.6]">
              Your document will be read, text extracted, and the file stored securely in Supabase Storage linked to your session. Only you can access it via a signed URL.
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-tear-bg border-t border-[#F0E8DF] px-12 py-5 flex items-center justify-between z-10">
        <button
          onClick={() => proceed(true)}
          disabled={isSubmitting}
          className="text-[14px] font-medium text-tear-muted hover:text-tear-text transition-colors duration-150"
        >
          Skip to analysis
        </button>

        <button
          onClick={() => proceed(false)}
          disabled={isSubmitting}
          className="px-7 py-3.5 text-[15px] font-medium text-white bg-tear-primary rounded-lg hover:opacity-90 transition-all duration-150 disabled:opacity-60"
        >
          {isSubmitting ? "Preparing…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
