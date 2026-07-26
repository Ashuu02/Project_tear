import { useEffect, useState } from "react";

/** Tracks window.innerWidth for responsive layout branching (nav overflow, bottom sheets,
 *  tools-panel default collapse) — a coarser, cheaper signal than useElementSize since these
 *  decisions are about the whole viewport, not a single element's box. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState<number>(() => (typeof window !== "undefined" ? window.innerWidth : 1280));

  useEffect(() => {
    function onResize() { setWidth(window.innerWidth); }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}
