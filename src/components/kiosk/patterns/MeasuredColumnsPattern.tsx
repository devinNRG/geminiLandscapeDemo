"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PatternProps } from "../types";
import { buildContentBlocks, blockGapStyle, PromptBubble, Reveal, revealDurationMs, useThinkingPhase } from "../shared";
import ThinkingIndicator from "../ThinkingIndicator";

/**
 * Reveals like an ordinary chat first — one top-anchored column, same as
 * the bubble that opened the answer, growing downward block by block. Only
 * once that column has fully finished staggering in does it check whether
 * it actually overflowed; if so, a second column opens up beside it (the
 * first column sliding left as it does), and THAT column's blocks then run
 * their own fresh stagger — so the two animations never happen on top of
 * each other. The split always falls between whole blocks (a heading, a
 * bulleted line) — never through the middle of one's text — decided by
 * measuring each block's real rendered height in a hidden single-column
 * clone.
 */
const SINGLE_COLUMN_WIDTH = "42cqw";
const COLUMN_GAP = 4.6; // cqw, on each side of the divider
const SECOND_COLUMN_WRAPPER_WIDTH = `${COLUMN_GAP * 2}cqw + 42cqw`; // gap + divider + gap + column
const SHIFT_MS = 400;

export default function MeasuredColumnsPattern({ content, active, onComplete }: PatternProps) {
  const { showThinking, contentShown } = useThinkingPhase(active);
  const thinkingCaptions = ["Thinking…", "Putting your answer together…"];
  const blocks = buildContentBlocks(content);

  // ---- measure how many blocks fit below the bubble in one column ----
  const availableRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [availH, setAvailH] = useState(0);
  const [bubbleH, setBubbleH] = useState(0);
  const [measuredH, setMeasuredH] = useState(0);
  const [splitIndex, setSplitIndex] = useState<number | null>(null); // null = not measured yet

  useLayoutEffect(() => {
    const avail = availableRef.current;
    const bubble = bubbleRef.current;
    const measure = measureContainerRef.current;
    if (!avail || !bubble || !measure) return;

    const measureNow = () => {
      setAvailH(avail.clientHeight);
      setBubbleH(bubble.getBoundingClientRect().height);
      setMeasuredH(measure.scrollHeight);
    };

    // Don't rely solely on ResizeObserver's initial callback to establish the
    // first measurement — it's spec'd to fire once observation starts, but
    // this doesn't reliably happen in every environment. Measure synchronously
    // right away, then again after the next paint as a second safety net;
    // the observer takes over from there for any later reflow (e.g. a web
    // font finishing its swap-in).
    measureNow();
    const raf = requestAnimationFrame(measureNow);

    const ro = new ResizeObserver(measureNow);
    ro.observe(avail);
    ro.observe(bubble);
    ro.observe(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const avail = availableRef.current;
    if (availH === 0 || !avail) return;
    const cs = getComputedStyle(avail);
    const availContentH = availH - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const budget = availContentH - bubbleH; // vertical room left for blocks once the bubble/thinking area is accounted for
    let split = blocks.length;
    for (let i = 0; i < blockRefs.current.length; i++) {
      const el = blockRefs.current[i];
      if (!el) continue;
      if (el.offsetTop + el.offsetHeight > budget) {
        split = Math.max(1, i);
        break;
      }
    }
    setSplitIndex(split);
  }, [availH, bubbleH, measuredH, blocks.length]);

  // until the first real measurement lands, don't assume "everything fits" —
  // that default would let the reveal timer start (and lock in a block
  // count) before the split is actually known
  const measured = splitIndex !== null;
  const col1Blocks = blocks.slice(0, measured ? splitIndex : blocks.length);
  const col2Blocks = measured ? blocks.slice(splitIndex) : [];
  const hasSecondColumn = col2Blocks.length > 0;

  // ---- phase 1: column one reveals fully, top to bottom ----
  const [col1Done, setCol1Done] = useState(false);
  useEffect(() => {
    setCol1Done(false);
    if (!contentShown || !measured) return;
    const t = setTimeout(() => setCol1Done(true), revealDurationMs(col1Blocks.length));
    return () => clearTimeout(t);
  }, [contentShown, measured, col1Blocks.length]);

  // ---- phase 2: only then, if there's overflow, shift to make room ----
  const shiftStarted = col1Done && hasSecondColumn;

  // ---- phase 3: only once that shift has settled, column two reveals ----
  const [col2Shown, setCol2Shown] = useState(false);
  useEffect(() => {
    if (!shiftStarted) {
      setCol2Shown(false);
      return;
    }
    const t = setTimeout(() => setCol2Shown(true), SHIFT_MS);
    return () => clearTimeout(t);
  }, [shiftStarted]);

  // ---- fires once the answer has fully revealed, whether or not it needed a second column ----
  const fullyRevealed = hasSecondColumn ? col2Shown : col1Done;
  useEffect(() => {
    if (fullyRevealed) onComplete?.();
  }, [fullyRevealed, onComplete]);

  return (
    <div ref={availableRef} className="flex h-full items-start justify-center px-[10cqw] pt-[2.3cqw] pb-[11.5cqw]">
      {/* hidden, fixed-width clone — exists only so every block's real
          rendered height can be measured to decide where column one ends */}
      <div className="pointer-events-none absolute opacity-0" style={{ width: SINGLE_COLUMN_WIDTH, visibility: "hidden" }} aria-hidden>
        <div ref={measureContainerRef}>
          {blocks.map((b, i) => (
            <div
              key={b.id}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
              style={blockGapStyle(b, 1)}
            >
              {b.node}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-row">
        {/* column one */}
        <div style={{ width: SINGLE_COLUMN_WIDTH }} className="flex shrink-0 flex-col text-[1.25cqw] leading-[1.8cqw]">
          <div ref={bubbleRef} className="relative">
            <Reveal show={active} index={0}>
              <PromptBubble lines={content.promptLines} />
            </Reveal>
            {showThinking && (
              <div className="absolute left-0" style={{ top: "calc(100% + 1.3cqw)" }}>
                <Reveal show={active} index={0.5}>
                  <ThinkingIndicator captions={thinkingCaptions} />
                </Reveal>
              </div>
            )}
          </div>
          {col1Blocks.map((b, i) => (
            <Reveal key={b.id} show={contentShown && measured} index={i + 1} style={blockGapStyle(b, 1)}>
              {b.node}
            </Reveal>
          ))}
        </div>

        {/* column two — a fixed-content strip revealed by animating this
            wrapper's width, so column one drifts left as it opens rather
            than jumping the instant it mounts */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: shiftStarted ? `calc(${SECOND_COLUMN_WRAPPER_WIDTH})` : "0cqw",
            transition: `width ${SHIFT_MS}ms ease-in-out`,
          }}
        >
          <div className="flex shrink-0" style={{ width: `calc(${SECOND_COLUMN_WRAPPER_WIDTH})` }}>
            <div className="shrink-0" style={{ width: `${COLUMN_GAP}cqw` }} />
            <div className="w-px shrink-0 self-stretch bg-[#353535]" />
            <div className="shrink-0" style={{ width: `${COLUMN_GAP}cqw` }} />
            <div
              style={{ width: SINGLE_COLUMN_WIDTH, maxHeight: "37cqw", paddingBottom: "11.5cqw" }}
              className="flex shrink-0 flex-col overflow-y-auto text-[1.25cqw] leading-[1.8cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {col2Blocks.map((b, i) => (
                <Reveal key={b.id} show={col2Shown} index={i} style={blockGapStyle(b, 1)}>
                  {b.node}
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
