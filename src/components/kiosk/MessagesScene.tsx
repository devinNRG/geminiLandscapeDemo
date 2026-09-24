"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ChatBubble } from "./types";
import { CometRing } from "./shared";
import TypingLines from "./TypingLines";

const CREW_AVATARS = [
  "/gemini/friday-night/avatar-crew-1.png",
  "/gemini/friday-night/avatar-crew-2.png",
  "/gemini/friday-night/avatar-crew-3.png",
  "/gemini/friday-night/avatar-crew-4.png",
];

/**
 * The width of the simulated phone surface inside the kiosk's landscape frame.
 * The source design is a 750.63px-wide portrait phone screen; everything here is
 * adapted to this column at ~0.0444cqw per source px — the scale the scene's body
 * text was already tuned to (1.25cqw ↔ the design's 28.15px), so the new chrome
 * lands in proportion with the bubbles instead of at the phone's own literal size,
 * which would have dwarfed the rest of the kiosk's typography.
 */
export const PHONE_COLUMN = "46cqw";

/**
 * The Messages app is drawn on its own surface rather than floating on the kiosk's black:
 * a lighter header strip with rounded top corners, and a darker body sheet under it holding
 * the thread, the suggestion chip and the RCS bar. Both are wider than the content column
 * they wrap, and the body is wider than the header by a hair — that is measured off the
 * design, not a rounding slip, so don't "fix" the two to match.
 */
const HEADER_PANEL = "49.2cqw";
const BODY_PANEL = "49.7cqw";
const PANEL_RADIUS = "2.7cqw";
/** Gap from the RCS bar's bottom edge down to the body sheet's. Chosen so the bar still
 * rests exactly where the kiosk's own Gemini compose bar does (2.98cqw off the frame's
 * bottom), which is what lets Gemini's pill slide up and sit on top of it. */
const RCS_INSET_CQW = 1.68;
/** How far the sheet stops short of the frame's bottom edge — the rest of the sum above. */
const SHEET_BOTTOM_CQW = 1.3;

// The thread plays out one message at a time rather than landing all at once. Only the
// user's own outgoing message gets a live typewriter — you never watch someone else's
// text appear letter by letter in a real chat, you watch their typing indicator and then
// the finished message arrives, which is what the incoming ones do.
const CHAT_TICK_MS = 40; // matches the compose bar's own typing cadence
const CHAT_INDICATOR_MS = 900; // how long a "…is typing" bubble holds before its message
const CHAT_SETTLE_MS = 400; // beat between one message landing and the next starting

/**
 * How long `messages` will take to play out. Exported so callers that have to wait for the
 * thread (the "go out" flow, before it offers its exit button) can ask rather than keep a
 * hand-tuned constant in step with it — that constant was already within 0.4s of breaking
 * the moment anyone lengthened a drafted message.
 */
export function threadDurationMs(messages: ChatBubble[]) {
  return messages.reduce(
    (total, m) => total + (m.kind === "outgoing" ? m.text.length * CHAT_TICK_MS : CHAT_INDICATOR_MS) + CHAT_SETTLE_MS,
    0,
  );
}

/** Stroke-drawn rather than the design's Material Symbols font — the kiosk doesn't
 * load an icon font, and the rest of the app's inline SVGs (ResponseFooter, the home
 * button) already use this same stroke language. */
function Icon({ paths, className }: { paths: string[]; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const ARROW_BACK = ["M20 12H4", "M10 18l-6-6 6-6"];
const ADD_CIRCLE = ["M12 2a10 10 0 100 20 10 10 0 000-20z", "M12 8v8", "M8 12h8"];
const IMAGE = ["M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z", "M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", "M21 15l-5-5L5 21"];

/**
 * The Messages app's own top bar — replaces the kiosk's usual Gemini header at the
 * start of this demo, matching how the source design opens directly on the messaging
 * app rather than on Gemini's own chrome.
 *
 * Just the group's identity, centered. The source design also carries a back arrow and
 * call/video/overflow icons; those are all dead controls in a simulated app, and this
 * demo's standing rule is that nothing inside the frame looks tappable unless it is.
 * The avatar cluster stays because it reads as identity rather than as an affordance.
 */
/**
 * The thread's own header strip. It used to be handed to page.tsx and drawn as the kiosk
 * frame's top bar, which put it outside the app it belongs to; here it is the top of the
 * Messages surface, on its own lighter panel, which is what the design shows.
 *
 * Its back arrow is scenery — part of the picture of a messaging app, like the RCS bar
 * below. The working way out of the demo is the kiosk's own button in the frame's corner.
 */
function MessagesHeader() {
  return (
    <div
      className="flex h-[5cqw] shrink-0 items-center gap-[0.94cqw] bg-[#201f23] pl-[2cqw]"
      style={{ width: HEADER_PANEL, borderRadius: `${PANEL_RADIUS} ${PANEL_RADIUS} 0 0` }}
    >
      <Icon paths={ARROW_BACK} className="h-[1.87cqw] w-[1.87cqw] shrink-0 text-[#e4e1e7]" />
      <div className="grid shrink-0 grid-cols-2 gap-[0.1cqw]" style={{ width: "3.13cqw", height: "3.13cqw" }}>
        {CREW_AVATARS.map((src) => (
          <img key={src} src={src} alt="" className="h-full w-full rounded-full object-cover" />
        ))}
      </div>
      <span className="text-[1.4cqw] text-[#e4e1e7]">The Crew</span>
    </div>
  );
}

/**
 * One bubble in the thread — outgoing (the user's own, sent on their behalf by
 * Gemini) or incoming (a named group member). Exported so the "go out" response can
 * replay this same bubble language for its own confirmation exchange without
 * re-authoring the styling.
 *
 * Incoming bubbles keep a tighter top-left corner (0.4cqw against 2cqw elsewhere) —
 * that asymmetry is the tail, and it's in the source design, not an accident. Capped
 * at 75% width so a long message wraps like a real chat bubble instead of stretching
 * edge-to-edge; a short one still hugs its own content.
 */
export function ChatBubbleRow({ bubble, typing = false }: { bubble: ChatBubble; typing?: boolean }) {
  if (bubble.kind === "outgoing") {
    return (
      <div className="flex max-w-[75%] items-center gap-[0.62cqw] self-end rounded-[2cqw] bg-[#414468] py-[0.7cqw] pl-[1.25cqw] pr-[0.62cqw] text-[1.25cqw] leading-[1.63cqw] text-white">
        {/* the user's own message is the one Gemini is sending on their behalf, so it's the
            one that earns a live typewriter — see AnimatedThread */}
        {typing ? <TypingLines lines={[bubble.text]} active tickMs={CHAT_TICK_MS} /> : bubble.text}
        {!typing && <img src="/gemini/friday-night/msg-read-receipt.svg" alt="" className="h-[1.25cqw] w-[1.25cqw] shrink-0" />}
      </div>
    );
  }
  return (
    <div className="flex max-w-[75%] flex-col items-start gap-[0.33cqw]">
      <div className="flex items-center gap-[0.62cqw]">
        <img src={bubble.avatar} alt="" className="h-[1.87cqw] w-[1.87cqw] rounded-full object-cover" />
        <span className="text-[0.94cqw] leading-[1.16cqw] text-[#dfe4ff]">{bubble.name}</span>
      </div>
      <div className="rounded-[2cqw] rounded-tl-[0.4cqw] bg-[#201f23] px-[1.25cqw] py-[0.7cqw] text-[1.25cqw] leading-[1.63cqw] text-[#e4e1e7]">
        {typing ? <TypingDots /> : bubble.text}
      </div>
    </div>
  );
}

/** The three-dot "typing…" filler that stands in for an incoming message's text while
 * its sender is still composing. Sized to occupy roughly one line so the bubble doesn't
 * visibly resize when the real text replaces it. */
function TypingDots() {
  return (
    <span className="flex h-[1.63cqw] items-center gap-[0.3cqw]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[0.42cqw] w-[0.42cqw] rounded-full bg-[#e4e1e7]"
          style={{ animation: `chat-dot 1.1s ease-in-out ${i * 0.16}s infinite` }}
        />
      ))}
    </span>
  );
}

/**
 * Plays the thread out one message at a time instead of revealing it all at once.
 *
 * Each message's duration is derived, not hand-tuned per message: an outgoing one runs
 * as long as its own text takes to type, an incoming one holds its typing indicator for
 * a fixed beat. That means a single timer per step is enough to drive the whole
 * sequence, and appending messages later (the drafted plan at the end of the "go out"
 * flow) just continues it — `placed` only ever counts up, so already-landed messages are
 * never replayed. Callers must keep `messages` referentially stable between renders, or
 * the in-flight step's timer restarts on every render and the thread never advances.
 *
 * Replaying from the top is handled by remounting (see the `key` at the call site) rather
 * than by an effect that resets `placed` — same result, without a synchronous setState in
 * an effect body.
 */
function AnimatedThread({
  messages,
  active,
  trailing,
}: {
  messages: ChatBubble[];
  active: boolean;
  /** Rendered after the last message, but only once the whole thread has landed — the
   * suggestion chip is a reaction to the conversation, so it can't beat it on screen. */
  trailing?: ReactNode;
}) {
  const [placed, setPlaced] = useState(0);

  useEffect(() => {
    if (!active || placed >= messages.length) return;
    const m = messages[placed];
    const duration =
      m.kind === "outgoing" ? m.text.length * CHAT_TICK_MS + CHAT_SETTLE_MS : CHAT_INDICATOR_MS + CHAT_SETTLE_MS;
    const t = setTimeout(() => setPlaced((p) => p + 1), duration);
    return () => clearTimeout(t);
  }, [active, placed, messages]);

  return (
    <>
      {messages.slice(0, placed + 1).map((bubble, i) => (
        <div key={i} className="flex flex-col [animation:fade-in-up_400ms_ease-out]">
          <ChatBubbleRow bubble={bubble} typing={i === placed} />
        </div>
      ))}
      {placed >= messages.length && trailing}
    </>
  );
}

/**
 * The "go out" branch's entry point — a Gemini Intelligence suggestion surfaced
 * inline in the group chat, standing in for how a real device would proactively
 * notice "sushi" and "gluten free" in the thread. Styled and positioned as part of
 * the thread itself (right-aligned, like the user's own messages) rather than a
 * separate floating card, and replaces the usual idle "Ask Gemini" pill for this one
 * branch: tapping it is what kicks off the compose bar.
 *
 * The pill's background is a single baked asset (not CSS) — the client's reference
 * design bakes its own soft gradient plus a 4-color ("4C") glow into the bottom-inside
 * edge of the pill, kept inside the pill's own rounded bounds rather than bleeding
 * onto the surrounding screen the way an earlier CSS-glow attempt did. The comet ring
 * marks this as the one tappable item in the thread; unlike the Send button it never
 * pulses — a standing notification that also throbs reads as nagging.
 */
function MessagesSuggestionChip({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <span className="inline-flex">
      <CometRing active trail="spectrum">
        <button
          type="button"
          onClick={onClick}
          className="relative flex items-center gap-[1cqw] overflow-hidden rounded-full bg-surface-card px-[1.4cqw] py-[0.95cqw] text-left transition-transform duration-150 active:scale-[0.97]"
        >
          {/* the asset itself is a mostly-transparent dark overlay — only its baked-in
              4-color glow near the bottom has real opacity — so it's layered on this solid
              dark fill rather than standing in as the pill's own background */}
          <img src="/gemini/friday-night/suggestion-pill-4c-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <img src="/gemini/friday-night/suggestion-pill-sparkle.svg" alt="" className="relative h-[2cqw] w-[2cqw] shrink-0" />
          {/* one line, at the thread's own body size — it is an offer phrased like a message,
              not a notification with a source line under it */}
          <span className="relative whitespace-nowrap text-[1.25cqw] font-medium text-white">{title}</span>
        </button>
      </CometRing>
    </span>
  );
}

/**
 * The Messages app's own RCS compose bar. Purely scene-setting: it sits in exactly the
 * band the kiosk's Gemini compose bar occupies, and page.tsx trades the two so they are
 * never both on screen — the messaging app holds that band until Gemini actually starts
 * typing, then hands it over. That swap *is* the handoff beat for both Friday-night
 * branches, and it's why the opening reads as Messages rather than as a chat with a
 * missing input.
 *
 * Inert by construction — the whole scene is `pointer-events: none` from page.tsx, and
 * only the suggestion chip opts back in.
 */
function MessagesComposeBar({ show }: { show: boolean }) {
  return (
    <div
      className="absolute left-1/2 flex -translate-x-1/2 items-center gap-[0.62cqw] transition-opacity duration-500"
      style={{ width: PHONE_COLUMN, bottom: `${RCS_INSET_CQW}cqw`, opacity: show ? 1 : 0 }}
    >
      <div className="flex h-[4.38cqw] flex-1 items-center gap-[1.25cqw] rounded-[2.8cqw] bg-[#201f23] px-[1.25cqw]">
        <Icon paths={ADD_CIRCLE} className="h-[1.87cqw] w-[1.87cqw] shrink-0 text-[#c7c5d1]" />
        <div className="flex min-w-0 flex-1 items-center gap-[0.08cqw]">
          <span className="h-[1.87cqw] w-[0.06cqw] shrink-0 bg-[#e4e1e7]" />
          <span className="truncate text-[1.25cqw] leading-[1.87cqw] text-[#c7c5d1]">RCS Message</span>
        </div>
        <div className="flex shrink-0 items-center gap-[1.87cqw]">
          <img src="/gemini/friday-night/msg-emoji.svg" alt="" className="h-[1.87cqw] w-[1.87cqw]" />
          <Icon paths={IMAGE} className="h-[1.87cqw] w-[1.87cqw] text-[#c7c5d1]" />
        </div>
      </div>
      <div className="flex h-[4.38cqw] w-[4.38cqw] shrink-0 items-center justify-center rounded-full bg-[#583c61]">
        <img src="/gemini/friday-night/msg-mic.svg" alt="" className="h-[1.87cqw] w-[1.87cqw]" />
      </div>
    </div>
  );
}

/**
 * The "Pixel Messaging"-style group chat this demo opens on — scene-setting for the
 * prompt that follows, shown behind the compose bar during the idle and typed stages,
 * matching how the source design opens on the group chat before Gemini's own panel
 * takes over once a response starts — and the chat stays visible *behind* that panel
 * rather than being replaced by it. The thread plays out message by message (see
 * AnimatedThread) because this is still a conversation, not a block of content.
 * `messages` differs per Friday-night branch (stay in vs. go out open on different
 * conversations) rather than being hardcoded here, and grows at the end of the go out
 * flow when Gemini drafts the plan back in. `suggestion` (shown once the thread has
 * finished) renders as one more entry in the same thread, not a separate overlay.
 */
export default function MessagesScene({
  active,
  messages,
  suggestion,
  showComposeBar = false,
}: {
  active: boolean;
  messages: ChatBubble[];
  suggestion?: { show: boolean; onClick: () => void; title: string };
  showComposeBar?: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col items-center pt-[1cqw]"
      style={{ paddingBottom: `${SHEET_BOTTOM_CQW}cqw` }}
    >
      <MessagesHeader />

      {/* the sheet is the positioning context for everything anchored to the app's bottom
          edge — the RCS bar and the suggestion chip above it */}
      <div
        className="relative flex min-h-0 flex-1 flex-col items-center overflow-hidden bg-[#141317] pt-[1.5cqw]"
        style={{ width: BODY_PANEL, borderRadius: PANEL_RADIUS }}
      >
        <div className="flex flex-col gap-[1cqw]" style={{ width: PHONE_COLUMN }}>
          {/* remounting on `active` is what rewinds the thread for the next run-through */}
          <AnimatedThread
            key={active ? "playing" : "idle"}
            messages={messages}
            active={active}
            trailing={
              suggestion && suggestion.show ? (
                // Still handed to AnimatedThread, because *when* it appears is the point: it
                // is a reaction to the conversation and must not beat it on screen. But it no
                // longer sits in the thread's flow — it is absolute, so it anchors to the
                // sheet and parks just above the RCS bar, which is where the design puts it:
                // an offer from the app's own chrome rather than one more message.
                <div
                  className="absolute left-1/2 flex -translate-x-1/2 justify-end"
                  style={{ width: PHONE_COLUMN, bottom: `${RCS_INSET_CQW + 4.38 + 1.24}cqw` }}
                >
                  {/* the entrance animation stays on this inner wrapper — on the box above it
                      would drive `transform` against the centring translate */}
                  <div className="pointer-events-auto [animation:fade-in-up_400ms_ease-out]">
                    <MessagesSuggestionChip title={suggestion.title} onClick={suggestion.onClick} />
                  </div>
                </div>
              ) : null
            }
          />
        </div>

        <MessagesComposeBar show={showComposeBar} />
      </div>
    </div>
  );
}
