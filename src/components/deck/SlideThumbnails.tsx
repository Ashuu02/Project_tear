"use client";

export interface SlideInfo {
  title: string;
  isCover?: boolean;
}

interface SlideThumbnailsProps {
  slides: SlideInfo[];
  current: number;
  onSelect: (index: number) => void;
}

export default function SlideThumbnails({ slides, current, onSelect }: SlideThumbnailsProps) {
  return (
    <div className="w-[156px] flex-shrink-0 border-r border-[#EDE5DC] overflow-y-auto py-3 px-3 flex flex-col gap-2 bg-[#FAF6F0]">
      {slides.map((slide, i) => {
        const isActive = current === i;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`
              relative w-full rounded-[6px] border-[1.5px] overflow-hidden transition-all duration-100 cursor-pointer
              ${isActive
                ? "border-tear-primary shadow-[0_2px_10px_rgba(194,69,30,0.2)]"
                : "border-tear-border hover:border-tear-primary/60"
              }
            `}
            style={{ aspectRatio: "16/9" }}
          >
            <div
              className={`
                w-full h-full flex flex-col items-start justify-between p-1.5
                ${slide.isCover ? "bg-tear-primary" : "bg-[#F5EFE4]"}
              `}
            >
              <span className={`font-mono text-[8px] font-medium ${slide.isCover ? "text-white/50" : "text-[#B8ADA8]"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={`text-[7px] font-dm-sans font-medium leading-tight line-clamp-2 ${slide.isCover ? "text-white/80" : "text-tear-text"}`}>
                {slide.title}
              </span>
            </div>
            {isActive && (
              <div className="absolute inset-0 border-[1.5px] border-tear-primary rounded-[5px] pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
}
