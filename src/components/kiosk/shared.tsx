"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { MapCard, PlaceBullet, PlaceCard, ResponseContent, Section } from "./types";
import ThinkingIndicator from "./ThinkingIndicator";

// how long the inline "thinking" beat holds before the rest of the answer grows in
export const THINKING_DURATION_MS = 2700;

// stagger timing shared between Reveal and anything computing "when will the
// last block finish revealing" (e.g. to sequence an animation after it)
export const REVEAL_STEP_MS = 110;
export const REVEAL_DURATION_MS = 700;

/**
 * A spinning "comet" trail circling a button that wants attention — a send
 * button once its prompt has finished typing, "Back to home" when it appears,
 * the Gemini Intelligence suggestion chip.
 *
 * It *wraps* the button rather than rendering inside it, which is what makes
 * it size-agnostic: the wrapper shrink-wraps whatever it's handed and the
 * trail is a uniform inset halo around that, so a 2.62cqw circle and a wide
 * text pill both get an even border-hugging ring with nothing to re-tune per
 * button. Wrapping also means the ring never needs to know the button's fill
 * color — the button's own opaque background covers the middle of the
 * gradient. (An earlier version painted the ring *inside* the button, so it
 * needed a hand-matched `coverColor` disc to hide the gradient's center, and
 * silently broke whenever a button's fill differed.)
 *
 * `pulse` adds the breathing scale + glow, and sits on the wrapper rather
 * than the button so the ring scales in lockstep with it instead of the two
 * drifting apart mid-breath. The suggestion chip opts out (ring only) — a
 * standing notification that also throbs reads as nagging.
 */
export function CometRing({
  active,
  pulse = false,
  radius = "9999px",
  glow = false,
  children,
}: {
  active: boolean;
  pulse?: boolean;
  /** Border radius for the ring and its wrapper. Defaults to a full pill; pass a smaller
   * value to hug a rounded square (e.g. a result card's photo). */
  radius?: string;
  /** Adds a soft colored halo outside the trail. Used where the ring has to read as
   * "pick this" against busy content rather than as chrome on a solid button. */
  glow?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`relative inline-flex ${active && pulse ? "[animation:subtle-pulse_2.2s_ease-in-out_infinite]" : ""}`}
      style={{ borderRadius: radius, boxShadow: active && glow ? "0 0 1.6cqw 0.35cqw rgba(76, 141, 246, 0.35)" : undefined }}
    >
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute [animation:comet-sweep_1.6s_linear_infinite]"
          style={{
            inset: "-0.3cqw",
            borderRadius: radius,
            background: "conic-gradient(from var(--comet-angle), transparent 0%, #4c8df6 18%, transparent 45%)",
          }}
        />
      )}
      {/* positioned (and later in DOM order) so it paints over the ring — a positioned
          element outranks a static sibling no matter which comes first, so leaving this
          static would let the ring cover the button it's meant to circle */}
      <span className="relative inline-flex" style={{ borderRadius: radius }}>
        {children}
      </span>
    </span>
  );
}

/**
 * "There is more below this box" for any scroll container, plus the floating down-arrow
 * that says so. Nothing in this app auto-scrolls — a visitor has to swipe — so on a
 * touchscreen the cue is the only thing telling them the answer continues past the fold.
 *
 * Watches both directions: the visitor scrolling, and the content growing underneath them
 * as an answer reveals. The growth is caught by observing an inner wrapper rather than the
 * scroll box (whose own size never changes) or its children (whose identity changes every
 * render, which would tear down and rebuild the observer constantly).
 */
export function useScrollCue(scrollRef: RefObject<HTMLDivElement | null>, innerRef: RefObject<HTMLDivElement | null>) {
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    const check = () => setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    ro.observe(inner);
    el.addEventListener("scroll", check);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
    // refs are stable for the life of the component, so this runs once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollForward = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: el.clientHeight * 0.7, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { hasMore, scrollForward };
}

/**
 * The cue itself — a circular down arrow that doubles as a tap target to jump forward,
 * since on a kiosk a chevron nobody can press is just decoration. `size` is the button's
 * diameter in cqw; the caller positions it, because where it sits differs per surface (a
 * full-height column, a floating overlay). Faded rather than unmounted so it can't pop
 * in and out as content reveals.
 *
 * `show` must also account for whether the surface this cue belongs to is the one on
 * screen, not just whether it has more to scroll. `pointer-events: auto` re-enables
 * hit-testing even inside an ancestor that set `pointer-events: none`, so a cue left
 * "live" on a screen that has been faded out goes on silently swallowing taps meant for
 * whatever is now in front of it — which is exactly what a hidden-but-still-mounted
 * response pattern is.
 */
export function ScrollCue({
  show,
  onClick,
  size = 3.6,
  className,
}: {
  show: boolean;
  onClick: () => void;
  /** Diameter in cqw. */
  size?: number;
  /** Positioning and surface colors — everything that differs per placement. */
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll for more"
      tabIndex={show ? 0 : -1}
      className={`flex items-center justify-center rounded-full border text-white transition-opacity duration-300 ${className ?? ""}`}
      style={{
        height: `${size}cqw`,
        width: `${size}cqw`,
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        style={{ height: `${size * 0.45}cqw`, width: `${size * 0.45}cqw` }}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

/** Fades + lifts its children in once `show` flips true, staggered by `index`. */
export function Reveal({
  show,
  index,
  className,
  style,
  children,
}: {
  show: boolean;
  index: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={`transition-all ease-out ${className ?? ""}`}
      style={{
        ...style,
        transitionDuration: `${REVEAL_DURATION_MS}ms`,
        opacity: show ? 1 : 0,
        transform: `${style?.transform ?? ""} ${show ? "translateY(0)" : "translateY(0.8cqw)"}`.trim(),
        transitionDelay: show ? `${index * REVEAL_STEP_MS}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}

/** How long a stagger starting now takes to finish, given the last block's index. */
export function revealDurationMs(lastIndex: number) {
  return lastIndex * REVEAL_STEP_MS + REVEAL_DURATION_MS;
}

/** The prompt bubble appears immediately; everything else waits for the inline
 * "thinking" beat to finish before it starts staggering in. Shared by every
 * pattern that needs this same two-step timing, however it renders it. */
export function useThinkingPhase(active: boolean) {
  const [showThinking, setShowThinking] = useState(true);
  useEffect(() => {
    setShowThinking(true);
    if (!active) return;
    const t = setTimeout(() => setShowThinking(false), THINKING_DURATION_MS);
    return () => clearTimeout(t);
  }, [active]);
  return { showThinking, contentShown: active && !showThinking };
}

export function Bullet({ size = 0.55 }: { size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full border-muted"
      style={{
        marginTop: `${size}cqw`,
        height: `${size}cqw`,
        width: `${size}cqw`,
        borderWidth: `${size * 0.16}cqw`,
      }}
    />
  );
}

export function PromptBubble({ lines, size = 1 }: { lines: string[]; size?: number }) {
  return (
    <div className="flex justify-end">
      <div
        className="relative overflow-hidden rounded-tl-[2.7cqw] rounded-tr-[0.34cqw] rounded-bl-[2.7cqw] rounded-br-[2.7cqw] bg-surface-card text-white"
        style={{
          width: `${24.8 * size}cqw`,
          height: `${6.7 * size}cqw`,
          padding: `${1 * size}cqw ${2.06 * size}cqw 0`,
          fontSize: `${1.2 * size}cqw`,
          lineHeight: `${1.8 * size}cqw`,
        }}
      >
        {/* joined into one flowing sentence rather than rendered as forced per-line breaks —
            `lines` is just how each prompt is authored as data, not where it should wrap */}
        <p>{lines.join(" ")}</p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3cqw] bg-gradient-to-t from-surface-card to-transparent" />
      </div>
    </div>
  );
}

function SectionHeading({ children, size = 1 }: { children: ReactNode; size?: number }) {
  return (
    <p className="font-bold text-white" style={{ fontSize: `${1.47 * size}cqw`, lineHeight: `${2.06 * size}cqw` }}>
      {children}
    </p>
  );
}

function SectionItem({ section, lines, size = 1 }: { section: Section; lines: string[]; size?: number }) {
  return (
    <div className="flex text-white" style={{ gap: `${0.7 * size}cqw`, fontSize: `${1.25 * size}cqw`, lineHeight: `${1.8 * size}cqw` }}>
      {section.bulleted && <Bullet size={0.55 * size} />}
      <span>
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}

/** A bulleted fact with a bold lead-in ("Getting there: …"). Unlike `SectionItem` the
 * text is one whole sentence that wraps to whatever width it's given — the design files
 * author these as prose, not as pre-broken display lines. */
function LabelledBullet({ bullet, size = 1 }: { bullet: PlaceBullet; size?: number }) {
  return (
    <div className="flex text-white" style={{ gap: `${0.7 * size}cqw`, fontSize: `${1.25 * size}cqw`, lineHeight: `${1.8 * size}cqw` }}>
      <Bullet size={0.55 * size} />
      <span>
        <span className="font-medium">{bullet.label}</span> {bullet.text}
      </span>
    </div>
  );
}

/**
 * The venue / hotel / restaurant card under a section heading. Every proportion is the
 * design's own, expressed against the 42cqw column the content is authored for and then
 * scaled: the thumbnail is 36.97% of the column (246.3 / 666.19 in the source), the gap
 * beside it 6.42%. Inert — a text answer has nothing to tap, which is what separates this
 * from the visually identical card in `GoOutResponse`, where the photo is the pick target.
 */
function PlaceCardRow({ place, size = 1 }: { place: PlaceCard; size?: number }) {
  const dim = { fontSize: `${1.03 * size}cqw`, lineHeight: `${1.57 * size}cqw` };
  return (
    <div className="flex" style={{ gap: `${2.7 * size}cqw` }}>
      <div
        className="shrink-0 overflow-hidden bg-surface-card"
        style={{ height: `${15.53 * size}cqw`, width: `${15.53 * size}cqw`, borderRadius: `${1.78 * size}cqw` }}
      >
        <img src={place.image} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="flex min-w-0 flex-col justify-center" style={{ gap: `${0.1 * size}cqw` }}>
        <span style={{ fontSize: `${1.25 * size}cqw`, lineHeight: `${1.77 * size}cqw`, color: "#e0e0e0" }}>{place.name}</span>
        <span className="flex items-center" style={{ ...dim, gap: `${0.25 * size}cqw` }}>
          <span style={{ color: "#e0e0e0" }}>{place.rating}</span>
          <svg
            viewBox="0 0 24 24"
            style={{ height: `${0.96 * size}cqw`, width: `${0.96 * size}cqw`, color: "#e0e0e0" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          >
            <path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.6l6.3-.8z" />
          </svg>
          <span style={{ color: "#8d8d8d" }}>{place.meta}</span>
        </span>
        <span style={{ ...dim, color: "#8d8d8d" }}>📍 {place.address}</span>
        <span style={dim}>
          <span className="font-bold" style={{ color: "#0ebc5f" }}>
            {place.status}
          </span>{" "}
          <span style={{ color: "#8d8d8d" }}>{place.statusTail}</span>
        </span>
        <span style={{ ...dim, color: "#8d8d8d" }}>{place.note}</span>
      </div>
    </div>
  );
}

/**
 * The map that heads an answer covering several places — a Google Maps still with a pin
 * per venue. The ground image and the road overlay are two separate exports layered in
 * that order, as the design draws them; pins are placed as fractions of the card's own
 * box so it scales to any column width without re-measuring anything.
 */
function MapCardBlock({ map, size = 1 }: { map: MapCard; size?: number }) {
  return (
    <div
      className="relative w-full overflow-hidden bg-[#0b0c10]"
      style={{ aspectRatio: `${map.aspectRatio}`, borderRadius: `${1.78 * size}cqw` }}
    >
      {/* object-top, not centered: the design clips this panel from the bottom (a 370.09
          tall map shown in a 316.66 window), so centering the crop would shave the top too */}
      <img src={map.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
      <img src={map.overlay} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />

      {map.pins.map((pin) => (
        <div key={pin.label} className="absolute" style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}>
          <div className="relative" style={{ height: `${3.15 * size}cqw`, width: `${3.15 * size}cqw`, marginLeft: `${-1.58 * size}cqw`, marginTop: `${-3.15 * size}cqw` }}>
            <img src="/gemini/band-tour/map-pin.svg" alt="" className="h-full w-full" />
            {/* the chip hangs off whichever side keeps it inside the card — with two pins
                this close together, both hanging the same way would overlap */}
            <span
              className="absolute flex items-center whitespace-nowrap rounded-full bg-black/72 text-white"
              style={{
                height: `${3.87 * size}cqw`,
                borderRadius: `${1.04 * size}cqw`,
                paddingLeft: `${1.33 * size}cqw`,
                paddingRight: `${1.33 * size}cqw`,
                fontSize: `${1.0 * size}cqw`,
                [pin.side === "right" ? "left" : "right"]: `${3.9 * size}cqw`,
                [pin.vAlign === "below" ? "top" : "bottom"]: `${0.2 * size}cqw`,
              }}
            >
              {pin.label}
            </span>
          </div>
        </div>
      ))}

      <span
        className="absolute"
        style={{ left: `${0.78 * size}cqw`, bottom: `${0.92 * size}cqw`, fontSize: `${0.96 * size}cqw`, color: "rgba(0,0,0,0.55)" }}
      >
        Google Maps
      </span>
      {/* the design's own fullscreen chip, exported whole — it's a shaded disc with the
          glyph baked in, not a flat icon that could be dropped onto a background here */}
      <img
        src="/gemini/band-tour/map-expand.png"
        alt=""
        className="absolute"
        style={{ right: `${0.78 * size}cqw`, top: `${0.78 * size}cqw`, height: `${5.32 * size}cqw`, width: `${5.32 * size}cqw` }}
      />
    </div>
  );
}

// generic line-icon props shared by every glyph in the footer row, matching the app's existing
// stroke-icon convention (HomeButton, persona glyphs, etc.) rather than a new asset per icon
const FOOTER_ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * The reference-frame the client shared: Gemini's own post-answer action row
 * (rate, regenerate, share, copy, more, read-aloud) and disclaimer — inert
 * decoration here (no handlers), matching how the rest of this demo renders
 * chrome it can't make functional as plain visuals rather than dead buttons.
 * Appended as the last block of every text answer (not the Friday-night
 * task-automation flow, which doesn't use `buildContentBlocks` at all).
 */
function ResponseFooter({ size = 1 }: { size?: number }) {
  const iconStyle = { height: `${1.5 * size}cqw`, width: `${1.5 * size}cqw` };
  return (
    <div className="flex flex-col" style={{ gap: `${0.9 * size}cqw` }}>
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center" style={{ gap: `${1.1 * size}cqw` }}>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <path d="M17 14V2" />
            <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
          </svg>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
          <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <svg viewBox="0 0 24 24" fill="currentColor" style={iconStyle} className="shrink-0">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </div>
        <svg {...FOOTER_ICON_PROPS} style={iconStyle} className="shrink-0">
          <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6a1.4 1.4 0 0 1-1 .4H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5Z" />
          <path d="M16 9a5 5 0 0 1 0 6" />
          <path d="M19.4 18.4a9 9 0 0 0 0-12.7" />
        </svg>
      </div>
      <p className="text-muted" style={{ fontSize: `${0.85 * size}cqw`, lineHeight: `${1.2 * size}cqw` }}>
        Gemini can make mistakes, so double-check it. Your privacy &amp; Gemini
      </p>
    </div>
  );
}

export type ContentBlock = {
  id: string;
  node: ReactNode;
  isHeading: boolean;
  /** This block must not be the last one in a column — a section heading stranded at the
   * foot of column one, with everything it introduces over in column two, reads as a
   * mistake. A pattern that splits the flow pulls any trailing run of these down with
   * whatever follows them. */
  keepWithNext?: boolean;
};

/**
 * The answer's body (everything after the prompt bubble) as a flat, ordered
 * list of blocks — intro paragraph, then each section's heading and items as
 * their own entries. Flat rather than nested so a pattern can measure and
 * split it at an arbitrary point (e.g. "these fit in column one, the rest go
 * in column two") without needing to know anything about section boundaries
 * itself.
 */
export function buildContentBlocks(content: ResponseContent, size = 1): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // the map heads the answer, above even the intro — it's the answer's "here is where all
  // of this is" before any of the prose
  if (content.map) {
    blocks.push({ id: "map", isHeading: true, node: <MapCardBlock map={content.map} size={size} /> });
  }

  // joined into one flowing paragraph rather than one <p> per authored line —
  // `introLines` is just how the intro is authored as data, not where it should wrap
  blocks.push({ id: "intro", isHeading: true, node: <p>{content.introLines.join(" ")}</p> });

  content.sections.forEach((section) => {
    blocks.push({
      id: `${section.id}-heading`,
      isHeading: true,
      keepWithNext: true,
      node: <SectionHeading size={size}>{section.heading}</SectionHeading>,
    });

    if (section.place) {
      // deliberately NOT keep-with-next: a heading plus its card is a perfectly good way for
      // a column to end, with the prose carrying on in the next one. Flagging the card too
      // would mean "heading + card + at least one paragraph, or none of it" — which threw
      // a whole card's worth of height (11cqw) away every time the paragraph didn't fit.
      blocks.push({ id: `${section.id}-place`, isHeading: true, node: <PlaceCardRow place={section.place} size={size} /> });
    }

    // each paragraph is its own block so a column split can fall between two of them
    section.body?.forEach((para, i) => {
      blocks.push({ id: `${section.id}-body-${i}`, isHeading: true, node: <p>{para}</p> });
    });

    section.bullets?.forEach((bullet, i) => {
      blocks.push({ id: `${section.id}-bullet-${i}`, isHeading: false, node: <LabelledBullet bullet={bullet} size={size} /> });
    });

    // the older pre-broken shape (the weekend answer); a section uses one list form or the other
    section.items?.forEach((lines, i) => {
      blocks.push({ id: `${section.id}-item-${i}`, isHeading: false, node: <SectionItem section={section} lines={lines} size={size} /> });
    });
  });

  if (content.closingLines) {
    blocks.push({ id: "closing", isHeading: true, node: <p>{content.closingLines.join(" ")}</p> });
  }

  blocks.push({ id: "footer", isHeading: true, node: <ResponseFooter size={size} /> });
  return blocks;
}

const block: CSSProperties = { breakInside: "avoid" };

/** A block's own gap above it — headings (and the two lead blocks) get the
 * looser "new section" spacing, list items stay tight under their heading. */
export function blockGapStyle(b: ContentBlock, size: number): CSSProperties {
  return { ...block, marginTop: `${(b.isHeading ? 1.3 : 0.6) * size}cqw` };
}

/**
 * The whole answer as ONE continuous flowing document — no notion of
 * "sections to browse," just the same paragraph/heading/list order a real
 * Gemini answer would render in, at a phone-like reading width. This is the
 * shared substrate for every pattern that reveals content by measuring or
 * moving through real rendered height rather than pre-declared structure.
 * Every direct child has `break-inside: avoid` so CSS multi-column layout
 * (or any other slicing) never cuts through the middle of a block.
 */
export function ContinuousFlow({
  content,
  size = 1,
  active = true,
  onRevealChange,
  onRevealComplete,
}: {
  content: ResponseContent;
  size?: number;
  /** When provided, each block stagger-reveals in once this flips true (the "response just generated" moment). */
  active?: boolean;
  /** Fires whenever the "rest of the answer" starts (true) or stops (false) being shown — i.e. the thinking beat just ended, or `active` just went false. Pass a stable callback (a state setter works well) since it's called from an effect. */
  onRevealChange?: (contentShown: boolean) => void;
  /** Fires once, after the very last staggered block has finished animating in. Pass a stable callback. */
  onRevealComplete?: () => void;
}) {
  const blocks = buildContentBlocks(content, size);
  const { showThinking, contentShown } = useThinkingPhase(active);

  useEffect(() => {
    onRevealChange?.(contentShown);
    // onRevealChange intentionally omitted — callers pass a stable setState reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentShown]);

  useEffect(() => {
    if (!contentShown) return;
    const t = setTimeout(() => onRevealComplete?.(), revealDurationMs(blocks.length));
    return () => clearTimeout(t);
    // onRevealComplete intentionally omitted — callers pass a stable setState reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentShown, blocks.length]);

  const thinkingCaptions = ["Thinking…", "Putting your answer together…"];

  return (
    <div className="flex flex-col text-white" style={{ fontSize: `${1.25 * size}cqw`, lineHeight: `${1.8 * size}cqw` }}>
      {/* wrapper's own height is just the bubble's — the indicator is positioned
          absolute so it never adds to (or removes from) this flow's measured
          height, which would otherwise make a height-measuring pattern (e.g.
          Measured Columns) flicker once the indicator unmounts */}
      <div className="relative" style={block}>
        <Reveal show={active} index={0}>
          <PromptBubble lines={content.promptLines} size={size} />
        </Reveal>
        {showThinking && (
          <div className="absolute left-0" style={{ top: `calc(100% + ${1.3 * size}cqw)` }}>
            <Reveal show={active} index={0.5}>
              <ThinkingIndicator captions={thinkingCaptions} />
            </Reveal>
          </div>
        )}
      </div>
      {blocks.map((b, i) => (
        <Reveal key={b.id} show={contentShown} index={i + 1} style={blockGapStyle(b, size)}>
          {b.node}
        </Reveal>
      ))}
    </div>
  );
}
