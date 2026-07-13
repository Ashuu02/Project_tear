import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-20 bg-tear-bg flex items-center justify-between px-12 py-6 animate-fade-in">
      <Link href="/" className="flex items-center gap-2.5">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
          <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="font-lora text-xl font-semibold tracking-tight text-tear-text">
          Tear
        </span>
      </Link>

      <div className="flex items-center gap-5">
        <a
          href="#how-it-works"
          className="text-sm font-normal text-tear-muted hover:text-tear-text transition-colors duration-150 tracking-wide"
        >
          How it works
        </a>
        <Link
          href="/my-teardowns"
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border border-tear-border text-sm font-medium text-tear-primary hover:border-tear-primary/60 transition-colors duration-150"
        >
          <svg width="15" height="13" viewBox="0 0 15 13" fill="none">
            <path
              d="M0.75 3.25C0.75 2.422 1.422 1.75 2.25 1.75H5.629C6.028 1.75 6.41 1.908 6.69 2.19L7.5 3H12.75C13.578 3 14.25 3.672 14.25 4.5V10.75C14.25 11.578 13.578 12.25 12.75 12.25H2.25C1.422 12.25 0.75 11.578 0.75 10.75V3.25Z"
              stroke="#C2451E"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
          My teardowns
        </Link>
      </div>
    </nav>
  );
}
