"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm({ secret }: { secret: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, secret }),
      });
      if (!res.ok) {
        setError("Incorrect passcode.");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-tear-bg flex items-center justify-center font-dm-sans px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[360px] bg-white border border-tear-border rounded-2xl p-8 flex flex-col gap-5 shadow-[0_20px_60px_rgba(28,20,18,0.10)]"
      >
        <div className="flex flex-col gap-1.5">
          <h1 className="font-lora text-xl font-semibold text-tear-text">Admin access</h1>
          <p className="text-[13px] text-tear-muted">Enter the passcode to view usage data.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          className="w-full px-4 py-3 text-sm text-tear-text bg-tear-bg border-[1.5px] border-tear-border rounded-lg placeholder:text-tear-chip outline-none focus:border-tear-primary transition-colors duration-150"
        />
        {error && <p className="text-[12.5px] text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !passcode}
          className="w-full py-3 bg-tear-primary hover:bg-tear-primary-dark text-white text-sm font-semibold rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
