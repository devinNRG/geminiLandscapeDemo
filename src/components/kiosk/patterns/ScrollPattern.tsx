"use client";

import { useEffect, useRef } from "react";
import type { PatternProps } from "../types";
import { ContinuousFlow, ScrollCue, useScrollCue } from "../shared";

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
  const { hasMore, scrollForward } = useScrollCue(scrollRef, innerRef);

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

      <div className="absolute left-1/2 z-10 -translate-x-1/2" style={{ bottom: `${CUE_BOTTOM_CQW}cqw` }}>
        <ScrollCue show={active && hasMore} onClick={scrollForward} size={3.6} className="border-white/10 bg-white/5" />
      </div>
    </div>
  );
}
