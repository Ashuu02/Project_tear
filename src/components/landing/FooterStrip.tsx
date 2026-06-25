const STATS = [
  "14 sources cited per teardown",
  "Under 10 minutes",
  "Citation-backed research",
];

export default function FooterStrip() {
  return (
    <footer className="border-t border-[#F0E8DF] px-12 py-6 animate-fade-in-5">
      <div className="flex items-center justify-center gap-12 flex-wrap">
        {STATS.map((stat, i) => (
          <>
            {i > 0 && (
              <span key={`sep-${i}`} className="text-[#DDD5CC] text-sm">·</span>
            )}
            <span key={stat} className="text-[13px] text-[#A89890] tracking-wide">
              {stat}
            </span>
          </>
        ))}
      </div>
    </footer>
  );
}
