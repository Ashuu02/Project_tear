import Link from "next/link";

export default function IntakeNav() {
  return (
    <nav className="sticky top-0 z-20 bg-tear-bg flex items-center justify-between px-6 md:px-12 py-4 md:py-[22px] border-b border-[#F0E8DF] animate-fade-in">
      <Link href="/" className="flex items-center gap-2.5">
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
          <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
      </Link>
      <span className="text-[13px] font-normal text-[#A89890] tracking-[0.02em]">Step 2 of 5</span>
    </nav>
  );
}
