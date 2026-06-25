export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-12 py-6 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
          <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="font-lora text-xl font-semibold tracking-tight text-tear-text">
          Tear
        </span>
      </div>

      <a
        href="#how-it-works"
        className="text-sm font-normal text-tear-muted hover:text-tear-text transition-colors duration-150 tracking-wide"
      >
        How it works
      </a>
    </nav>
  );
}
