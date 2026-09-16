"use client";

import { useEffect, useRef, useState } from "react";
import type { PatternProps } from "../types";
import { ContinuousFlow } from "../shared";

// distance from the frame's bottom edge to the resting (idle) compose bubble's top edge
// is 56.25 - 45.94 = 10.31cqw (frame height 56.25cqw at 16:9, bubble top pinned to 45.94cqw
// in page.tsx) — this sits the cue just above the bubble with a small gap on top of that.
const CUE_BOTTOM_CQW = 11.3;
// mid-scroll, content is free to run under the bubble (see the pb below) — but once you've
// scrolled all the way, the trailing footer should clear it, not sit permanently hidden
// underneath with nothing left to scroll past. Matches CUE_BOTTOM_CQW's own clearance math.
const BOTTOM_CLEARANCE_CQW = 11.5;

/**
 * Renders the answer as one continuously scrollable column — no pagination,
 * no column-splitting, just scroll. Content runs under the floating Ask
 * Gemini bubble while scrolling through it rather than stopping short, but
 * ends with enough trailing space (BOTTOM_CLEARANCE_CQW) that the final
 * block — the response footer — clears the bubble once fully scrolled. A
 * circular down-arrow cue sits just above that bubble whenever there's more
 * to scroll to, and doubles as a tap target to jump forward.
 */
export default function ScrollPattern({ content, active, onComplete }: PatternProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;

    const check = () => setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);

    check();
    el.addEventListener("scroll", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    ro.observe(inner);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  // start each new answer scrolled to the top rather than wherever the previous one left off
  useEffect(() => {
    if (active && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [active]);

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-[10cqw] pt-[2.3cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBottom: `${BOTTOM_CLEARANCE_CQW}cqw` }}
      >
        <div ref={innerRef} className="mx-auto w-full max-w-[42cqw]">
          <ContinuousFlow content={content} active={active} onRevealComplete={onComplete} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const el = scrollRef.current;
          if (!el) return;
          el.scrollBy({ top: el.clientHeight * 0.7, behavior: "smooth" });
        }}
        aria-label="Scroll for more"
        tabIndex={hasMore ? 0 : -1}
        className="absolute left-1/2 z-10 flex h-[3.6cqw] w-[3.6cqw] -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-opacity duration-300"
        style={{ bottom: `${CUE_BOTTOM_CQW}cqw`, opacity: hasMore ? 1 : 0, pointerEvents: hasMore ? "auto" : "none" }}
      >
        <svg viewBox="0 0 24 24" className="h-[1.6cqw] w-[1.6cqw]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
