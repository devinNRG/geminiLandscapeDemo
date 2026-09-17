"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PatternProps } from "../types";
import {
  blockGapStyle,
  buildContentBlocks,
  PromptBubble,
  Reveal,
  revealDurationMs,
  ScrollCue,
  useScrollCue,
  useThinkingPhase,
} from "../shared";
import ThinkingIndicator from "../ThinkingIndicator";
import {
  COLUMN_BASELINE_CQW,
  COLUMN_GAP_CQW,
  COLUMN_PT_CQW,
  COLUMN_SCALE,
  COLUMN_WIDTH_CQW,
  EDGE_PADDING_CQW,
} from "./columnLayout";

/**
 * A fixed three-column frame across the kiosk, filled in order:
 *
 *   1. The answer opens like an ordinary chat — the prompt bubble, the thinking beat,
 *      then blocks staggering downward — in column one, with the floating compose bar
 *      sitting inside that same column beneath them (page.tsx puts it there; this
 *      pattern is told how tall it currently is via `composeHeightCqw`).
 *   2. Only once column one has fully finished revealing does column two take whatever
 *      didn't fit and run its own fresh stagger, so the two never animate on top of each
 *      other. Column two scrolls if its share still overflows, with the same down-arrow
 *      cue used everywhere else in the app.
 *   3. Column three is left empty here — page.tsx floats the "Back to home" button and
 *      the QR prompt into it once the answer has finished.
 *
 * The split always falls between whole blocks (a heading, a bulleted line) — never
 * through the middle of one's text — decided by measuring each block's real rendered
 * height in a hidden single-column clone.
 *
 * All three columns, both dividers and column two's scroll cue stop on one shared floor
 * (COLUMN_BASELINE_CQW) rather than each running to the frame's edge — the same line the
 * compose box and the exit chrome rest on.
 *
 * Unlike the earlier two-column version, the columns are pinned to fixed positions
 * rather than centered as a group: column one no longer drifts left as column two opens.
 * It can't — the compose bar and the exit chrome are drawn by page.tsx against these same
 * column centers, and a frame whose columns slide around underneath them isn't a frame.
 * So column two arrives by revealing in place instead of by pushing column one aside.
 */

// breathing room between column one's last block and the compose box sitting below it
const COMPOSE_GAP_CQW = 1.4;
// column two's own trailing space, so its last block clears the scroll cue sitting on the
// column's floor rather than staying permanently tucked under it with nothing left to scroll
const COL2_PB_CQW = 4.6;
// a beat between column one finishing and column two starting, so the handoff reads as a
// second movement rather than one long stagger that happens to jump columns
const COLUMN_HANDOFF_MS = 250;
// stand-in for column one if no live compose height was handed down — a collapsed compose
// pill at column scale, so the column is never measured as if the bar simply weren't there
const FALLBACK_COMPOSE_HEIGHT_CQW = 7.33 * COLUMN_SCALE;

// the column type scale, resolved once — every block, the bubble and the hidden measuring
// clone all have to render at exactly this or the measured split won't match what's drawn
const COLUMN_FONT_SIZE_CQW = 1.25 * COLUMN_SCALE;
const COLUMN_LINE_HEIGHT_CQW = 1.8 * COLUMN_SCALE;

/** The hairline between two columns, and the gap it sits in. Absolutely positioned so the
 *  rule itself contributes no width — the gap alone is what columnLayout's math accounts
 *  for. Fades in with the column it introduces rather than standing there over nothing. */
function ColumnDivider({ show }: { show: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: `${COLUMN_GAP_CQW * 2}cqw` }}>
      <div
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#353535] transition-opacity duration-500"
        style={{ opacity: show ? 1 : 0 }}
      />
    </div>
  );
}

export default function MeasuredColumnsPattern({ content, active, onComplete, composeHeightCqw }: PatternProps) {
  const { showThinking, contentShown } = useThinkingPhase(active);
  const thinkingCaptions = ["Thinking…", "Putting your answer together…"];
  const blocks = buildContentBlocks(content, COLUMN_SCALE);

  const composeHeight = composeHeightCqw ?? FALLBACK_COMPOSE_HEIGHT_CQW;

  // ---- measure how many blocks fit below the bubble in column one ----
  const columnRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [columnH, setColumnH] = useState(0);
  const [bubbleH, setBubbleH] = useState(0);
  const [measuredH, setMeasuredH] = useState(0);
  const [splitIndex, setSplitIndex] = useState<number | null>(null); // null = not measured yet

  useLayoutEffect(() => {
    const column = columnRef.current;
    const bubble = bubbleRef.current;
    const measure = measureContainerRef.current;
    if (!column || !bubble || !measure) return;

    const measureNow = () => {
      setColumnH(column.clientHeight);
      setBubbleH(bubble.getBoundingClientRect().height);
      setMeasuredH(measure.scrollHeight);
    };

    // Don't rely solely on ResizeObserver's initial callback to establish the
    // first measurement — it's spec'd to fire once observation starts, but
    // this doesn't reliably happen in every environment. Measure synchronously
    // right away, then again after the next paint as a second safety net;
    // the observer takes over from there for any later reflow (e.g. a web
    // font finishing its swap-in, or the compose box growing another line).
    measureNow();
    const raf = requestAnimationFrame(measureNow);

    const ro = new ResizeObserver(measureNow);
    ro.observe(column);
    ro.observe(bubble);
    ro.observe(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const column = columnRef.current;
    if (columnH === 0 || !column) return;
    const cs = getComputedStyle(column);
    // clientHeight includes the column's own padding, and its bottom padding is the room
    // reserved for the compose box — so what's left is the real space for blocks
    const contentH = columnH - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const budget = contentH - bubbleH;
    let split = blocks.length;
    for (let i = 0; i < blockRefs.current.length; i++) {
      const el = blockRefs.current[i];
      if (!el) continue;
      if (el.offsetTop + el.offsetHeight > budget) {
        split = Math.max(1, i);
        break;
      }
    }
    // walk the split back over any trailing keep-with-next run, so column one never ends on
    // a section heading (or a heading + place card) whose content starts in column two
    while (split > 1 && blocks[split - 1]?.keepWithNext) split--;
    setSplitIndex(split);
    // `blocks` is rebuilt every render but its shape only changes with the content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnH, bubbleH, measuredH, blocks.length]);

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

  // ---- phase 2: only then, whatever didn't fit reveals in column two ----
  const [col2Shown, setCol2Shown] = useState(false);
  useEffect(() => {
    if (!col1Done || !hasSecondColumn) {
      setCol2Shown(false);
      return;
    }
    const t = setTimeout(() => setCol2Shown(true), COLUMN_HANDOFF_MS);
    return () => clearTimeout(t);
  }, [col1Done, hasSecondColumn]);

  // ---- and it's done once that second stagger has actually finished, not when it starts:
  // column three's chrome appears off the back of this, and it shouldn't turn up while
  // column two is still filling in behind it ----
  const [col2Done, setCol2Done] = useState(false);
  useEffect(() => {
    if (!col2Shown) {
      setCol2Done(false);
      return;
    }
    const t = setTimeout(() => setCol2Done(true), revealDurationMs(col2Blocks.length));
    return () => clearTimeout(t);
  }, [col2Shown, col2Blocks.length]);

  const fullyRevealed = hasSecondColumn ? col2Done : col1Done;
  useEffect(() => {
    if (fullyRevealed) onComplete?.();
  }, [fullyRevealed, onComplete]);

  // column two scrolls when even its own share overflows — the cue is the only thing
  // saying so, since nothing here auto-scrolls
  const col2ScrollRef = useRef<HTMLDivElement>(null);
  const col2InnerRef = useRef<HTMLDivElement>(null);
  const { hasMore, scrollForward } = useScrollCue(col2ScrollRef, col2InnerRef);

  // a fresh answer starts column two at the top rather than wherever the last one was left
  useEffect(() => {
    if (active && col2ScrollRef.current) col2ScrollRef.current.scrollTop = 0;
  }, [active]);

  const columnType = { fontSize: `${COLUMN_FONT_SIZE_CQW}cqw`, lineHeight: `${COLUMN_LINE_HEIGHT_CQW}cqw` };

  return (
    <div
      className="relative h-full"
      style={{
        paddingTop: `${COLUMN_PT_CQW}cqw`,
        paddingLeft: `${EDGE_PADDING_CQW}cqw`,
        paddingRight: `${EDGE_PADDING_CQW}cqw`,
        // the shared floor: every column, both dividers and column two's scroll cue stop
        // here, on the same line the compose box and the exit chrome rest on
        paddingBottom: `${COLUMN_BASELINE_CQW}cqw`,
      }}
    >
      {/* hidden, fixed-width clone — exists only so every block's real rendered height can
          be measured to decide where column one ends. It has to carry the column's own
          type scale as well as its width: the intro block inherits its font size rather
          than setting one, so a clone left at the inherited page default measures that
          paragraph far shorter than it really renders and pushes the split too late. */}
      <div
        className="pointer-events-none absolute opacity-0"
        style={{ width: `${COLUMN_WIDTH_CQW}cqw`, visibility: "hidden" }}
        aria-hidden
      >
        <div ref={measureContainerRef} className="flex flex-col text-white" style={columnType}>
          {blocks.map((b, i) => (
            <div
              key={b.id}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
              style={blockGapStyle(b, COLUMN_SCALE)}
            >
              {b.node}
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-full">
        {/* column one — the answer opens here, with the compose bar below it. `h-full` plus
            `overflow-hidden` pins its measured height to the row's rather than letting its
            own (briefly unsplit) content stretch it and feed the measurement back a number
            that includes the overflow it's trying to detect. */}
        <div
          ref={columnRef}
          className="flex h-full shrink-0 flex-col overflow-hidden text-white"
          style={{ width: `${COLUMN_WIDTH_CQW}cqw`, paddingBottom: `${composeHeight + COMPOSE_GAP_CQW}cqw`, ...columnType }}
        >
          <div ref={bubbleRef} className="relative">
            <Reveal show={active} index={0}>
              <PromptBubble lines={content.promptLines} size={COLUMN_SCALE} />
            </Reveal>
            {showThinking && (
              <div className="absolute left-0" style={{ top: `calc(100% + ${1.3 * COLUMN_SCALE}cqw)` }}>
                <Reveal show={active} index={0.5}>
                  <ThinkingIndicator captions={thinkingCaptions} />
                </Reveal>
              </div>
            )}
          </div>
          {col1Blocks.map((b, i) => (
            <Reveal key={b.id} show={contentShown && measured} index={i + 1} style={blockGapStyle(b, COLUMN_SCALE)}>
              {b.node}
            </Reveal>
          ))}
        </div>

        <ColumnDivider show={col2Shown} />

        {/* column two — the overflow, scrollable under its own cue */}
        <div className="relative flex h-full shrink-0 flex-col" style={{ width: `${COLUMN_WIDTH_CQW}cqw` }}>
          <div
            ref={col2ScrollRef}
            className="min-h-0 flex-1 overflow-y-auto text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ paddingBottom: `${COL2_PB_CQW}cqw`, ...columnType }}
          >
            <div ref={col2InnerRef} className="flex flex-col">
              {col2Blocks.map((b, i) => (
                <Reveal key={b.id} show={col2Shown} index={i} style={blockGapStyle(b, COLUMN_SCALE)}>
                  {b.node}
                </Reveal>
              ))}
            </div>
          </div>
          <ScrollCue
            show={active && col2Shown && hasMore}
            onClick={scrollForward}
            size={3.2}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 border-white/10 bg-white/5"
          />
        </div>

        <ColumnDivider show={fullyRevealed} />

        {/* column three — deliberately empty: page.tsx floats the "Back to home" button and
            the QR prompt into this slot once the answer has finished playing out, the same
            way it floats the compose bar into column one. Reserved here so columns one and
            two land at the centers columnLayout hands page.tsx. */}
        <div className="h-full shrink-0" style={{ width: `${COLUMN_WIDTH_CQW}cqw` }} />
      </div>
    </div>
  );
}
