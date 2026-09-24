"use client";

import { useEffect, useRef, useState } from "react";
import type { PatternProps } from "../types";
import { ContinuousFlow, RisingDotsCue, revealDurationMs, useScrollCue, useScrolledOnce, useThinkingPhase } from "../shared";

// the cue follows the answer rather than arriving with it: it waits for the first
// screenful (prompt, map, first heading) to finish revealing, same beat as go out's
const CUE_DELAY_MS = revealDurationMs(2) + 300;
// mid-scroll, content is free to run under the bubble (see the pb below) — but once you've
// scrolled all the way, the trailing footer should clear it, not sit permanently hidden
// underneath with nothing left to scroll past. The idle bubble's top sits 10.31cqw off the
// frame's bottom (56.25 - 45.94), so this clears it with a small gap.
const BOTTOM_CLEARANCE_CQW = 11.5;

/**
 * Renders the answer as one continuously scrollable column — no pagination,
 * no column-splitting, just scroll. Content runs under the floating Ask
 * Gemini bubble while scrolling through it rather than stopping short, but
 * ends with enough trailing space (BOTTOM_CLEARANCE_CQW) that the final
 * block — the response footer — clears the bubble once fully scrolled. The
 * rising-dots cue sits centred over the answer while there's more to scroll to,
 * until the visitor first scrolls, and doubles as a tap target to jump forward.
 */
export default function ScrollPattern({ content, active, onComplete }: PatternProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { hasMore, scrollForward } = useScrollCue(scrollRef, innerRef);
  const scrolled = useScrolledOnce(scrollRef, active);

  // same thinking beat ContinuousFlow reveals on, so the delay counts from the answer landing
  const { contentShown } = useThinkingPhase(active);
  const [cueReady, setCueReady] = useState(false);
  useEffect(() => {
    if (!contentShown) return;
    const t = setTimeout(() => setCueReady(true), CUE_DELAY_MS);
    return () => {
      clearTimeout(t);
      setCueReady(false);
    };
  }, [contentShown]);

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

      {/* dead centre over the answer — it's a swipe cue, so it sits where the swipe would
          start rather than tucked against the frame's bottom edge */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <RisingDotsCue show={active && cueReady && hasMore && !scrolled} onClick={scrollForward} />
      </div>
    </div>
  );
}
