import { useEffect, useRef, useState, type RefObject } from "react";

interface ElementSize {
  width: number;
  height: number;
}

/** Tracks a ref'd element's real rendered size via ResizeObserver — reacts to any layout
 *  change (panel collapse, CSS container-query resize, font load), not just window resize. */
export function useElementSize<T extends HTMLElement>(): [RefObject<T>, ElementSize] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Read synchronously on mount rather than waiting on ResizeObserver's first (async)
    // callback — guarantees a correct size for the very first paint even if something about
    // the environment delays or drops that initial callback.
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { inlineSize, blockSize } = entry.contentBoxSize?.[0]
        ? { inlineSize: entry.contentBoxSize[0].inlineSize, blockSize: entry.contentBoxSize[0].blockSize }
        : { inlineSize: entry.contentRect.width, blockSize: entry.contentRect.height };
      setSize({ width: inlineSize, height: blockSize });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
