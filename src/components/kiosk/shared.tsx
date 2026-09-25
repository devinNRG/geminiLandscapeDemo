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
 * A spinning "comet" trail circling a button that wants attention — "Back to
 * home" when it appears, a "pick this" result card, the Gemini Intelligence
 * suggestion chip. (The send button used to be the fourth; it emits concentric
 * rings instead now — see PulseRings below.)
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
 *
 * `trail` picks what sweeps. The default is Gemini's blue, which is what the
 * ring means on Gemini's own chrome. "spectrum" is for the one place the ring
 * appears *outside* it — the Gemini Intelligence chip in the Messages app,
 * where the design hands it the full iridescent sweep instead: a white head
 * with the spectrum trailing behind it, which is how that chip announces
 * Gemini inside someone else's app rather than on Gemini's own surface.
 */
const COMET_TRAILS = {
  blue: "transparent 0%, #4c8df6 18%, transparent 45%",
  // hue order read off the design: the head is white, and the tail runs back through
  // violet, magenta, red, orange, amber, green and teal before it fades out
  spectrum: [
    "transparent 0%",
    "rgba(56,189,248,0.45) 5%",
    "rgba(74,222,128,0.65) 11%",
    "rgba(255,209,102,0.8) 17%",
    "rgba(255,138,80,0.92) 23%",
    "rgba(255,107,157,1) 29%",
    "rgba(199,125,255,1) 35%",
    "#ffffff 41%",
    "transparent 49%",
  ].join(", "),
} as const;

export function CometRing({
  active,
  pulse = false,
  radius = "9999px",
  glow = false,
  trail = "blue",
  children,
}: {
  active: boolean;
  pulse?: boolean;
  /** Which sweep the trail paints — see COMET_TRAILS above. */
  trail?: keyof typeof COMET_TRAILS;
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
            background: `conic-gradient(from var(--comet-angle), ${COMET_TRAILS[trail]})`,
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

const PULSE_RING_DURATION_MS = 2200;

/**
 * Concentric rings pulsing out of a button that wants attention — what the send button
 * uses once its prompt has finished typing, in place of the comet trail above.
 *
 * Wraps its button the same way CometRing does, and for the same reason: the wrapper
 * shrink-wraps whatever it's handed and each ring is drawn on that border box, so it
 * needs no per-button tuning. Where the two differ is what they say. A comet trail is one
 * mark travelling *around* a target — it circles, which points at the button but doesn't
 * move away from it. These rings leave: each one starts flush with the button's edge and
 * travels outward, so the motion has a source, and the source is the thing to tap.
 *
 * `count` rings share one animation, evenly offset across its duration — that offset is
 * the whole effect. Two rings half a cycle apart is what puts a bright ring at the button
 * while a faint one is still on its way out, which is what makes it read as concentric
 * rather than as one ring blinking.
 *
 * Deliberately no breathing scale on the button itself (CometRing's `pulse`): the rings
 * already carry the motion, and a button that also throbs underneath them reads as two
 * animations competing rather than one cue.
 */
export function PulseRings({
  active,
  radius = "9999px",
  count = 2,
  spread,
  children,
}: {
  active: boolean;
  /** Border radius for the rings and their wrapper. Defaults to a full pill. */
  radius?: string;
  /** How many rings are in flight at once, evenly spread across one cycle. */
  count?: number;
  /** For a button that isn't round: how far (cqw) each ring travels out, the same on every
   * side, instead of scaling with the button. Left unset, rings scale (right for a circle). */
  spread?: number;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-flex" style={{ borderRadius: radius }}>
      {active &&
        Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute inset-0 border-[0.1cqw] border-white"
            style={
              {
                borderRadius: radius,
                "--spread": spread === undefined ? undefined : `${spread}cqw`,
                animation: `${spread === undefined ? "pulse-ring" : "pulse-ring-spread"} ${PULSE_RING_DURATION_MS}ms ease-out infinite`,
                animationDelay: `${(i * PULSE_RING_DURATION_MS) / count}ms`,
              } as CSSProperties
            }
          />
        ))}
      {/* positioned (and later in DOM order) so it paints over the rings — a positioned
          element outranks a static sibling no matter which comes first, so leaving this
          static would let a ring cross the button it's meant to be leaving */}
      <span className="relative inline-flex" style={{ borderRadius: radius }}>
        {children}
      </span>
    </span>
  );
}

/**
 * "There is more below this box" for any scroll container; `RisingDotsCue` below is
 * what says so. Nothing in this app auto-scrolls — a visitor has to swipe — so on a
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
 * Whether the visitor has scrolled this answer yet — latched on the first real scroll, so
 * the rising-dots cue stops once it has done its job. Re-armed whenever `armed` changes
 * (a new answer opening or an old one closing, or a flow moving to its next screen), adjusted during render rather than in an
 * effect so the cue never shows a frame of the previous answer's "already scrolled". The
 * small threshold keeps a caller's own reset to the top from counting as the visitor's.
 */
export function useScrolledOnce(scrollRef: RefObject<HTMLDivElement | null>, armed: unknown) {
  const [scrolled, setScrolled] = useState(false);
  const [prevArmed, setPrevArmed] = useState(armed);
  if (armed !== prevArmed) {
    setPrevArmed(armed);
    setScrolled(false);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop > 8) setScrolled(true);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
    // refs are stable for the life of the component, so this runs once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return scrolled;
}

// RisingDotsCue geometry in cqw; the dots' travel is whatever the pill leaves them after its padding
const CUE_W = 3;
const CUE_H = 12;
const CUE_DOT = 1.3;
const CUE_PAD = (CUE_W - CUE_DOT) / 2;
const CUE_TRAVEL = CUE_H - 2 * CUE_PAD - CUE_DOT;
const CUE_CYCLE_MS = 2400;
// leader first and brightest, each follower dimmer, so the bunch at the top reads as a
// trail catching up rather than four equal dots
const CUE_DOTS = ["#ffffff", "#d2d2d4", "#9d9da2", "#6c6c72"];

/**
 * The demo's scroll cue: a glassy vertical pill with dots rising up it, looping until the
 * visitor scrolls (see `useScrolledOnce`). Used wherever something scrolls — Gemini's
 * floating panel, the full-frame text answers, the semester calendar. The caller positions
 * it, centred over what it belongs to. Faded rather than unmounted so it can't pop in and
 * out as content reveals.
 *
 * `show` must also account for whether the surface this cue belongs to is the one on
 * screen, not just whether it has more to scroll. `pointer-events: auto` re-enables
 * hit-testing even inside an ancestor that set `pointer-events: none`, so a cue left
 * "live" on a screen that has been faded out goes on silently swallowing taps meant for
 * whatever is now in front of it — which is exactly what a hidden-but-still-mounted
 * response pattern is.
 */
export function RisingDotsCue({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll for more"
      tabIndex={show ? 0 : -1}
      className="relative block overflow-hidden rounded-full border border-white/25 backdrop-blur-md transition-opacity duration-300"
      style={{
        // the glass sheen sits on a dark base: centred in the panel, the cue often lands on
        // the light map, and a sheen alone turns milky there and swallows the white dots
        background: "linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0.05)), rgba(22,22,26,0.78)",
        width: `${CUE_W}cqw`,
        height: `${CUE_H}cqw`,
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
      }}
    >
      {/* reversed so the leader paints last and sits on top of the bunch it arrives into */}
      {CUE_DOTS.map((color, i) => ({ color, i })).reverse().map(({ color, i }) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-full"
          style={
            {
              // centred off the pill's midline rather than offset by CUE_PAD: absolute
              // children measure from inside the border, so a CUE_PAD offset lands the
              // dot a border-width right of centre
              left: "50%",
              marginLeft: `${-CUE_DOT / 2}cqw`,
              top: `${CUE_PAD}cqw`,
              width: `${CUE_DOT}cqw`,
              height: `${CUE_DOT}cqw`,
              backgroundColor: color,
              "--travel": `${CUE_TRAVEL}cqw`,
              animation: show ? `scroll-dot-${i + 1} ${CUE_CYCLE_MS}ms ease-in-out infinite` : "none",
            } as CSSProperties
          }
        />
      ))}
    </button>
  );
}

/**
 * The demo's primary call to action — "Back to your rundown", "Start the Biology quiz":
 * the design's blue gradient pill (brighter at the ends than just left of centre), with
 * rings stepping out a fixed distance on every side so they keep an even gap around a
 * pill far wider than it is tall.
 */
export function GradientPillButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <PulseRings active spread={1.4}>
      <button
        type="button"
        onClick={onClick}
        className="rounded-full bg-[linear-gradient(90deg,#4a82f6_0%,#436feb_40%,#6199f6_100%)] px-[1.8cqw] py-[1cqw] text-[1.2cqw] font-medium whitespace-nowrap text-white active:brightness-90"
      >
        {children}
      </button>
    </PulseRings>
  );
}

/**
 * The way out, in the frame's top-left corner — on every screen past the landing one.
 *
 * A kiosk has no browser chrome and no gestures a passer-by knows about, so if a screen does
 * not draw an exit it does not have one. That used to be covered by a Home button in a bar
 * *outside* the frame; with that bar gone this is the only way back, which is why it is not
 * optional per screen and why it sits above everything (`z-30`) rather than wherever its
 * screen happens to stack it — including over the compose bar, which is `z-20`.
 *
 * Where it goes is the screen's own business: one step back from a sub-choice, all the way
 * home from inside a demo.
 */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="absolute left-[2.6cqw] top-[5.94cqw] z-30 flex h-[3.23cqw] w-[3.23cqw] items-center justify-center"
    >
      <img src="/gemini/rundown/back-button.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <span className="relative text-[1.55cqw] text-white/96">&lsaquo;</span>
    </button>
  );
}

/**
 * "For position only" — marks a photo that is a stand-in whose rights aren't settled, so a
 * screenshot of it can't circulate as if the image were signed off. Every stand-in photo
 * gets one; retire the chip (not the photo) once that image is cleared.
 *
 * Two sizes, because there are two kinds of stand-in on screen. The default marks a screen's
 * full-bleed backdrop and is positioned against the frame's own chrome inset, so it lands in
 * the same spot on every screen. `inline` marks a single photo *inside* a component — the
 * persona thumbnails in the landing pills — so it's sized to that photo and pinned to the
 * bottom of whichever positioned box wraps it, rather than to the frame.
 *
 * `pointer-events-none` is deliberate in both: it's a margin note, not a control, and nothing
 * inside the kiosk frame is allowed to look tappable without being tappable. Either size
 * carries its own scrim + blur because it has to stay legible over whatever the photo happens
 * to be doing behind it.
 */
export function FpoChip({ inline = false }: { inline?: boolean } = {}) {
  const base =
    "pointer-events-none absolute z-10 rounded-full border border-white/25 bg-black/40 font-medium tracking-[0.1em] text-white/85 backdrop-blur-md";
  return (
    <span
      className={
        inline
          ? `${base} bottom-[0.5cqw] left-1/2 -translate-x-1/2 px-[0.5cqw] py-[0.1cqw] text-[0.6cqw]`
          : `${base} right-[2.87cqw] top-[2.87cqw] px-[0.95cqw] py-[0.38cqw] text-[0.85cqw]`
      }
    >
      FPO
    </span>
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

function SectionHeading({ children, size = 1, plain = false }: { children: ReactNode; size?: number; plain?: boolean }) {
  return (
    <p
      className={plain ? "font-normal text-[#e3e3e3]" : "font-bold text-white"}
      style={{ fontSize: `${(plain ? 1.55 : 1.47) * size}cqw`, lineHeight: `${2.06 * size}cqw` }}
    >
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
 * author these as prose, not as pre-broken display lines. `number` swaps the hollow bullet
 * for "1." and so on; `children` nest one level in, under the text rather than the marker. */
function LabelledBullet({ bullet, number, size = 1 }: { bullet: PlaceBullet; number?: number; size?: number }) {
  return (
    <div className="flex text-white" style={{ gap: `${0.7 * size}cqw`, fontSize: `${1.25 * size}cqw`, lineHeight: `${1.8 * size}cqw` }}>
      {number === undefined ? (
        <Bullet size={0.55 * size} />
      ) : (
        <span className="shrink-0 tabular-nums" style={{ minWidth: `${1.3 * size}cqw` }}>
          {number}.
        </span>
      )}
      <div className="flex min-w-0 flex-col" style={{ gap: `${0.6 * size}cqw` }}>
        <span>
          {bullet.label && <span className="font-medium">{bullet.label}</span>}
          {bullet.label && bullet.text ? " " : null}
          {bullet.text}
        </span>
        {bullet.children?.map((child, i) => (
          <LabelledBullet key={i} bullet={child} size={size} />
        ))}
      </div>
    </div>
  );
}

/** A paragraph under a place card that opens on the place's name gets the name
 * dotted-underlined, like a link back to the card — the design's own treatment. */
function PlaceParagraph({ text, name }: { text: string; name?: string }) {
  if (!name || !text.startsWith(name)) return <p>{text}</p>;
  return (
    <p>
      <span className="underline decoration-white/60 decoration-dotted underline-offset-[0.35cqw]">{name}</span>
      {text.slice(name.length)}
    </p>
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
        {place.rating && (
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
            {place.meta && <span style={{ color: "#8d8d8d" }}>{place.meta}</span>}
          </span>
        )}
        {place.address && <span style={{ ...dim, color: "#8d8d8d" }}>📍 {place.address}</span>}
        {place.status && (
          <span style={dim}>
            <span style={{ color: place.statusTone === "closed" ? "#e9bab6" : "#56b969" }}>{place.status}</span>
            {place.statusTail && <span style={{ color: "#8d8d8d" }}> {place.statusTail}</span>}
          </span>
        )}
        {place.note && <span style={{ ...dim, color: "#8d8d8d" }}>{place.note}</span>}
      </div>
    </div>
  );
}

/**
 * The Google Maps card that heads an answer about several places: a still with a pin and a
 * name chip per place, and optionally the drive between them. The box is its own size
 * container, so every measurement inside is a share of the map's width (`cqw` here means
 * the map, not the kiosk frame) — taken off the design at that scale, and it holds at
 * whatever width the column gives it. Radius is the caller's, since that's the one thing
 * measured against the kiosk.
 */
export function PinnedMap({ map, radius = "1.4cqw" }: { map: MapCard; radius?: string }) {
  const pinColor = map.pinColor ?? "#4A84F7";
  return (
    <div
      className="relative w-full overflow-hidden [container-type:inline-size]"
      style={{ aspectRatio: `${map.aspectRatio}`, borderRadius: radius }}
    >
      {/* object-top: when the still is taller than the card, what matters sits in its
          upper part */}
      <img src={map.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />

      {map.route && (
        // one unit per 0.1% of the width on both axes, so the stroke keeps its weight
        <svg
          viewBox={`0 0 1000 ${1000 / map.aspectRatio}`}
          className="absolute inset-0 h-full w-full"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points={routePoints(map)} stroke="#2C59B6" strokeWidth={11} />
          <polyline points={routePoints(map)} stroke="#5383EC" strokeWidth={7} />
        </svg>
      )}

      {map.pins.map((pin) => (
        <div key={pin.label} className="absolute" style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}>
          {/* Google's teardrop with a white dot, anchored at the head's centre so the chip
              beside it can centre on the same point */}
          <svg viewBox="0 0 24 32" className="absolute h-[5.1cqw] w-[3.8cqw] -translate-x-1/2" style={{ top: "-1.9cqw" }}>
            <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0z" fill={pinColor} />
            <circle cx="12" cy="11.7" r="4.2" fill="#fff" />
          </svg>
          <span
            className="absolute flex h-[8cqw] -translate-y-1/2 items-center whitespace-nowrap rounded-[1.3cqw] bg-[#2d3135]/90 px-[2.25cqw] text-[2.7cqw] text-white"
            style={{ [pin.side === "right" ? "left" : "right"]: "4.4cqw" }}
          >
            {pin.label}
          </span>
        </div>
      ))}

      <span className="absolute bottom-[2.2cqw] left-[1.9cqw] text-[3.2cqw] leading-none text-[#5f6368]">Google Maps</span>
      {/* the fullscreen chip: the exported disc carries no glyph, so the two corner
          brackets are drawn over it */}
      <div className="absolute right-[3.5cqw] top-[2.7cqw] flex h-[10cqw] w-[10cqw] items-center justify-center">
        <img src="/gemini/band-tour/map-expand.png" alt="" className="absolute inset-0 h-full w-full" />
        <svg
          viewBox="0 0 24 24"
          className="relative h-[4.4cqw] w-[4.4cqw]"
          fill="none"
          stroke="white"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 4h6v6M10 20H4v-6" />
        </svg>
      </div>
    </div>
  );
}

function routePoints(map: MapCard) {
  const h = 1000 / map.aspectRatio;
  return map.route!.map(([x, y]) => `${x * 1000},${y * h}`).join(" ");
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
    blocks.push({ id: "map", isHeading: true, node: <PinnedMap map={content.map} radius={`${1.78 * size}cqw`} /> });
  }

  // joined into one flowing paragraph rather than one <p> per authored line —
  // `introLines` is just how the intro is authored as data, not where it should wrap
  if (content.introLines?.length) {
    blocks.push({ id: "intro", isHeading: true, node: <p>{content.introLines.join(" ")}</p> });
  }

  content.sections.forEach((section) => {
    blocks.push({
      id: `${section.id}-heading`,
      isHeading: true,
      keepWithNext: true,
      node: (
        <SectionHeading size={size} plain={content.plainHeadings}>
          {section.heading}
        </SectionHeading>
      ),
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
      blocks.push({ id: `${section.id}-body-${i}`, isHeading: true, node: <PlaceParagraph text={para} name={section.place?.name} /> });
    });

    section.bullets?.forEach((bullet, i) => {
      blocks.push({
        id: `${section.id}-bullet-${i}`,
        isHeading: false,
        node: <LabelledBullet bullet={bullet} number={section.numbered ? i + 1 : undefined} size={size} />,
      });
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

  const thinkingCaptions = content.loading ? [content.loading.caption] : ["Thinking…", "Putting your answer together…"];

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
              <ThinkingIndicator captions={thinkingCaptions} icon={content.loading?.icon} />
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
