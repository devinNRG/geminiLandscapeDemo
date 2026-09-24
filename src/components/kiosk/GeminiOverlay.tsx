"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RisingDotsCue, useScrollCue, useScrolledOnce } from "./shared";

/**
 * The panel Gemini answers into, floating over the messaging app rather than
 * replacing it — you stay in the group chat and Gemini opens on top of it.
 *
 * Bottom-anchored just above the "Ask Gemini" compose bar and grown upward by its own
 * content, exactly like the source design (where the same panel is short for a task
 * card and tall for a search answer). It stops short of the Messages header so the
 * top of the thread always stays visible behind it — that visible chat is the whole
 * point of the overlay, so the panel is never allowed to become the full screen.
 *
 * Long answers scroll inside. Nothing auto-scrolls: a visitor has to swipe, so the
 * rising-dots cue below is the only thing telling them there's more than one result
 * down there. It loops until they scroll for the first time — by then it has done its
 * job — and doubles as a tap target.
 */

// clearances measured from the middle area's own box (which starts under the Messages
// header and runs to the frame's bottom edge), not from the frame
const BOTTOM_CQW = 11.75; // leaves the collapsed compose pill clear beneath the panel
const TOP_GAP_CQW = 8; // keeps the first couple of chat bubbles visible above the panel

export default function GeminiOverlay({
  show,
  cueReady = true,
  children,
}: {
  show: boolean;
  /** Holds the scroll cue back until the caller's content has landed, so the cue follows
   * the answer on screen instead of arriving with it. */
  cueReady?: boolean;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { hasMore, scrollForward } = useScrollCue(scrollRef, innerRef);
  const scrolled = useScrolledOnce(scrollRef, show);

  // a fresh answer starts at the top rather than wherever the last one was left
  useEffect(() => {
    if (show && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [show]);

  return (
    <div
      className="pointer-events-none absolute left-1/2 z-20 flex w-[42cqw] flex-col transition-[opacity,transform] duration-500 ease-out"
      style={{
        bottom: `${BOTTOM_CQW}cqw`,
        maxHeight: `calc(100% - ${BOTTOM_CQW + TOP_GAP_CQW}cqw)`,
        opacity: show ? 1 : 0,
        // centering and the entrance lift share one transform — a Tailwind -translate-x-1/2
        // class here would be silently overwritten by this inline value
        transform: `translateX(-50%) translateY(${show ? "0" : "1.5cqw"})`,
      }}
    >
      {/* The hairline isn't in the source design — there the panel reads as a distinct
          surface because the chat behind it has its own lighter backdrop. Our kiosk frame
          is pure black, so #0e0e12 alone leaves a short panel (the stay-in task card) with
          no visible edge at all, and it reads as content sitting loose in the chat rather
          than as a drawer over it. */}
      {/* Gated on `show`, not left permanently on. The response subtree stays mounted after
          a demo ends (only its wrapper's opacity drops), and `pointer-events: auto` on a
          descendant re-enables hit-testing even when an ancestor set `none` — so an
          always-on value left this invisible panel swallowing taps over the middle of the
          frame for the rest of the session, which killed the top two persona pills. */}
      <div
        className="relative flex min-h-0 flex-col overflow-hidden rounded-[2.5cqw] border border-white/10 bg-[#0e0e12] shadow-[0_0.6cqw_2.4cqw_rgba(0,0,0,0.6)]"
        style={{ pointerEvents: show ? "auto" : "none" }}
      >
        {/* the sheet's drag handle in the source design — inert here, but it's what reads
            "this panel sits on top of something" rather than being part of the page */}
        <div className="flex shrink-0 justify-center pt-[0.55cqw] pb-[0.9cqw]">
          <span className="h-[0.18cqw] w-[2.9cqw] rounded-full bg-[#49484c]" />
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-[1.45cqw] pb-[1.6cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div ref={innerRef}>{children}</div>
        </div>
      </div>

      {/* dead centre of the panel, over the answer itself — it's a swipe cue, so it sits
          where the swipe would start rather than tucked into a corner */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <RisingDotsCue show={show && cueReady && hasMore && !scrolled} onClick={scrollForward} />
      </div>
    </div>
  );
}
