"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PATTERNS } from "@/components/kiosk/patterns";
import { LANDING_LAYOUTS } from "@/components/kiosk/landing";
import {
  BAND_TOUR_RESPONSE,
  FRIDAY_NIGHT_TASK,
  GO_OUT_MESSAGES,
  GO_OUT_SEARCH,
  PERSONAS,
  RUNDOWNS,
  STAY_IN_MESSAGES,
  WEEKEND_RESPONSE,
  type ChatBubble,
  type Persona,
  type PatternId,
  type LandingLayoutId,
  type ResponseContent,
} from "@/components/kiosk/types";
import TypingLines from "@/components/kiosk/TypingLines";
import RundownScreen from "@/components/kiosk/RundownScreen";
import FridayNightChoiceScreen from "@/components/kiosk/FridayNightChoiceScreen";
import TaskAutomationResponse from "@/components/kiosk/TaskAutomationResponse";
import GoOutResponse from "@/components/kiosk/GoOutResponse";
import MessagesScene, { MessagesTopBar } from "@/components/kiosk/MessagesScene";

type Stage = "landing" | "rundown" | "fridayNightChoice" | "idle" | "typed" | "response";

// which built demo the compose bar / response area are currently playing
type DemoId = "weekend" | "fridayNight" | "goOut" | "bandTour";

// pill id -> the demo it plays; every other pill renders disabled on the rundown screen
const PILL_DEMOS: Record<string, DemoId> = {
  "friends-weekend": "weekend",
  "band-tour": "bandTour",
  // "friday-night" is deliberately absent — it routes through the fridayNightChoice
  // screen instead, which sets activeDemo to "fridayNight" or "goOut" itself
};

// demos that are a text-generation answer (rendered via the scroll/measured-column patterns)
// rather than the friday-night agentic task flow, keyed by the same DemoId
const RESPONSE_CONTENT_BY_DEMO: Partial<Record<DemoId, ResponseContent>> = {
  weekend: WEEKEND_RESPONSE,
  bandTour: BAND_TOUR_RESPONSE,
};

// which conversation the Friday-night messages scene opens on, per branch
const MESSAGES_BY_DEMO: Partial<Record<DemoId, ChatBubble[]>> = {
  fridayNight: STAY_IN_MESSAGES,
  goOut: GO_OUT_MESSAGES,
};

const DEFAULT_RUNDOWN_PERSONA = PERSONAS.find((p) => p.id === "traveler")!;

const PROMPT_LINES_BY_DEMO: Record<DemoId, string[]> = {
  weekend: [
    "Sort the friends weekend. Everyone lands at a",
    "different time: build the weekend around the",
    "arrivals, match the plan to the preferences",
    "sheet everyone filled in, and put together a",
    "packing list.",
  ],
  fridayNight: FRIDAY_NIGHT_TASK.promptLines,
  goOut: GO_OUT_SEARCH.promptLines,
  bandTour: BAND_TOUR_RESPONSE.promptLines,
};

// the expanded (multi-line) compose box's height must fit whatever text is currently visible,
// growing as it's typed rather than jumping straight to a final size — a hardcoded per-demo
// height silently breaks the next time a prompt's text changes. So the height is always
// "chrome" (the fixed padding/gap/toolbar around the text, below) plus however much of the
// live text is currently visible, measured directly off the real typed-text element as it
// grows — never guessed, and never backed out of an unrelated calibrated value that can drift
// out of sync with this structure. All demos share the same bottom edge (matches the idle
// pill's own: 45.94 + 7.33 = 53.27cqw) so the box grows upward from there. Deliberately no
// minimum "bento" floor here — a floor would hold the box at a fixed size while text fills it
// (pushing the toolbar down within that fixed space) and only start real growth once text
// exceeds the floor, reading as two different animations instead of one continuous grow.
const COMPOSE_BOTTOM_CQW = 53.27;
// matches the typed text's own text-[1.4cqw] leading-[1.9cqw] classes
const COMPOSE_LINE_HEIGHT_CQW = 1.9;
// the multi-line layout's own padding/gap/toolbar — see the compose box's JSX below; kept as
// named constants (rather than re-measuring) since they're values this file itself sets, not
// values coming from unrelated content
const MULTILINE_PT_CQW = 2.1;
const MULTILINE_GAP_CQW = 0.6;
const MULTILINE_TOOLBAR_ROW_CQW = 2.62; // matches the toolbar row's tallest icon, the Send button (h-[2.62cqw])
const MULTILINE_PB_CQW = 1.3;
const CHROME_CQW = MULTILINE_PT_CQW + MULTILINE_GAP_CQW + MULTILINE_TOOLBAR_ROW_CQW + MULTILINE_PB_CQW;
// pause before any characters appear, once the compose box has taken its bento shape
const TYPING_START_DELAY_MS = 1500;
// ms per character — slower than the default so the prompt reads as deliberate, not rushed
const TYPING_TICK_MS = 45;

// spinning "comet" ring — a conic-gradient trail circling a primed action button (a send
// button once its text is fully typed, or the "back to home" button as soon as it appears).
// Plain DOM layering rather than CSS masking (which needs the prefixed and unprefixed
// mask/mask-composite properties kept in exact sync, and is easy to silently break): an
// oversized gradient disc behind everything, with an opaque inner disc — matching the
// button's own fill — painted on top of it to cover the center, leaving only a thin halo
// visible around the edge. Geometry (inset/radius/position) is inline style rather than
// Tailwind classes here — this component's classes are the one place in the file that
// showed up unapplied, so inline CSS sidesteps whatever was eating them. Works on any
// rounded shape, circle or elongated pill, and must be the FIRST child so the button's
// label paints after it, not underneath it.
function CometRing({ coverColor = "#1f3b9b" }: { coverColor?: string }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: "-0.35cqw",
        borderRadius: "9999px",
        pointerEvents: "none",
        background: "conic-gradient(from 0deg, transparent 0%, #4c8df6 18%, transparent 45%)",
        animation: "spin 1.6s linear infinite",
      }}
    >
      <span style={{ position: "absolute", inset: "0.18cqw", borderRadius: "9999px", backgroundColor: coverColor }} />
    </span>
  );
}

function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-6 top-6 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-3.5 pr-4 text-sm font-medium text-neutral-200 hover:bg-white/10"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
      Home
    </button>
  );
}

function PatternPicker({ pattern, onChange }: { pattern: PatternId; onChange: (id: PatternId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = PATTERNS.find((p) => p.id === pattern)!;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="absolute right-6 top-6 z-30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-4 pr-3 text-sm font-medium text-neutral-200 hover:bg-white/10"
      >
        {current.label}
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 py-1 shadow-xl">
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors ${
                p.id === pattern ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="text-sm font-medium text-white">{p.label}</span>
              <span className="text-xs text-neutral-400">{p.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// duplicated from PatternPicker rather than shared — the two pickers are slated to be
// unified into one streamlined switcher once more use cases land, so this is deliberately
// throwaway rather than a shared abstraction worth preserving through that rework.
function LandingLayoutPicker({ layout, onChange }: { layout: LandingLayoutId; onChange: (id: LandingLayoutId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANDING_LAYOUTS.find((l) => l.id === layout)!;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="absolute right-6 top-6 z-30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-4 pr-3 text-sm font-medium text-neutral-200 hover:bg-white/10"
      >
        {current.label}
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 py-1 shadow-xl">
          {LANDING_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onChange(l.id);
                setOpen(false);
              }}
              className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors ${
                l.id === layout ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="text-sm font-medium text-white">{l.label}</span>
              <span className="text-xs text-neutral-400">{l.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  const [pattern, setPattern] = useState<PatternId>("scroll");
  const [landingLayout, setLandingLayout] = useState<LandingLayoutId>("cards");
  const [rundownPersona, setRundownPersona] = useState<Persona>(DEFAULT_RUNDOWN_PERSONA);
  const [activeDemo, setActiveDemo] = useState<DemoId>("weekend");
  // whichever demo is playing, once its content has fully finished — shows the shared
  // "back to landing" corner button in place of each demo authoring its own exit affordance
  const [demoComplete, setDemoComplete] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const liveTextRef = useRef<HTMLDivElement>(null);
  const [liveTextHeightCqw, setLiveTextHeightCqw] = useState(0);

  // the real typed-text element's own rendered height, tracked live as characters
  // (and thus lines) are revealed — this is what makes the box grow line-by-line
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const liveEl = liveTextRef.current;
    if (!frame || !liveEl) return;

    const measure = () => {
      const frameWidth = frame.getBoundingClientRect().width;
      if (!frameWidth) return;
      setLiveTextHeightCqw((liveEl.scrollHeight / frameWidth) * 100);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(liveEl);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  const showLanding = stage === "landing";
  const showRundown = stage === "rundown";
  const showFridayNightChoice = stage === "fridayNightChoice";
  const showChat = !showLanding && !showRundown && !showFridayNightChoice;
  const composeExpanded = stage === "typed";
  const showHero = stage === "idle";
  const showResponse = stage === "response";
  useEffect(() => {
    if (showResponse) setDemoComplete(false);
  }, [showResponse, activeDemo]);

  // the ~1s beat where the box already looks like the idle pill (still showing the "Ask
  // Gemini" placeholder) before any characters start appearing
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  useEffect(() => {
    if (!composeExpanded) {
      setHasStartedTyping(false);
      return;
    }
    const t = setTimeout(() => setHasStartedTyping(true), TYPING_START_DELAY_MS);
    return () => clearTimeout(t);
  }, [composeExpanded, activeDemo]);

  // once the typed text overflows the pill's own (narrower) single-line slot, the box commits
  // to the multi-line layout for the rest of this typing session — latched, not re-checked
  // against the wider expanded slot afterward, so it can't flicker back and forth
  const [multiLineLatched, setMultiLineLatched] = useState(false);
  useEffect(() => {
    if (!composeExpanded) {
      setMultiLineLatched(false);
      return;
    }
    if (liveTextHeightCqw > COMPOSE_LINE_HEIGHT_CQW * 1.35) setMultiLineLatched(true);
  }, [composeExpanded, liveTextHeightCqw]);

  // gates the send button's attention-grabbing comet ring — it only spins once every
  // character has actually appeared, not the moment the button itself shows up
  const [typingDone, setTypingDone] = useState(false);
  useEffect(() => {
    if (!composeExpanded) setTypingDone(false);
  }, [composeExpanded]);

  const composeHeightCqw = multiLineLatched ? CHROME_CQW + liveTextHeightCqw : 7.33;
  const composeWidthCqw = multiLineLatched ? 35.43 : 31.77;
  // both friday-night branches open on their own scene-setting group chat instead of the generic hero
  const showMessagesScene = (activeDemo === "fridayNight" || activeDemo === "goOut") && (showHero || composeExpanded);

  const ActivePattern = PATTERNS.find((p) => p.id === pattern)!.Component;
  const ActiveLandingLayout = LANDING_LAYOUTS.find((l) => l.id === landingLayout)!.Component;

  // personas with a built rundown screen go there first; "add yourself" (no rundown design yet) skips straight to the blank chat
  const handlePersonaSelect = (persona: Persona) => {
    if (persona.id in RUNDOWNS) {
      setRundownPersona(persona);
      setStage("rundown");
    } else {
      setStage("idle");
    }
  };

  const handlePillSelect = (pillId: string) => {
    // Friday night now branches into two demos — route through the choice screen instead
    // of straight into the (only-built) stay-in flow
    if (pillId === "friday-night") {
      setStage("fridayNightChoice");
      return;
    }
    const demo = PILL_DEMOS[pillId];
    if (demo) {
      setActiveDemo(demo);
      setStage("typed");
    } else {
      setStage("idle");
    }
  };

  const handleFridayNightChoice = (choice: "goOut" | "stayIn") => {
    if (choice === "stayIn") {
      // stay in's prompt is pre-decided, so it skips straight to typing it out
      setActiveDemo("fridayNight");
      setStage("typed");
    } else {
      // go out opens on the group chat first — the suggestion chip there (not the usual
      // idle "Ask Gemini" pill) is what actually kicks off the compose bar
      setActiveDemo("goOut");
      setStage("idle");
    }
  };

  const handleGoOutSuggestionTap = () => {
    setActiveDemo("goOut");
    setStage("typed");
  };

  return (
    <div className="relative flex h-screen w-screen flex-col bg-[#1f1f1f]">
      {/* always available, outside the device frame — jumps back to the persona picker from anywhere */}
      <HomeButton onClick={() => setStage("landing")} />

      {/* response display pattern — only meaningful once you're actually inside a
          text-generation demo, not just whenever activeDemo happens to default to one
          (e.g. still on the landing/rundown screens before any demo has started) */}
      {showChat && activeDemo in RESPONSE_CONTENT_BY_DEMO && <PatternPicker pattern={pattern} onChange={setPattern} />}
      {showLanding && <LandingLayoutPicker layout={landingLayout} onChange={setLandingLayout} />}

      <div className="flex flex-1 items-center justify-center p-8">
        <div
          ref={frameRef}
          className="@container relative flex flex-col overflow-hidden rounded-[2.5cqw] border-[0.35cqw] border-black bg-black"
          style={{
            aspectRatio: "16 / 9",
            width: "min(100%, calc((100vh - 9rem) * 16 / 9))",
            maxHeight: "100%",
          }}
        >
          {/* landing — persona picker, shown before the chat flow begins */}
          <div
            className="absolute inset-0 z-10 transition-opacity duration-500"
            style={{ opacity: showLanding ? 1 : 0, pointerEvents: showLanding ? "auto" : "none" }}
          >
            <ActiveLandingLayout onSelect={handlePersonaSelect} />
          </div>

          {/* rundown — the persona's personalized "here's your daily rundown" suggestion screen */}
          <div
            className="absolute inset-0 z-10 transition-opacity duration-500"
            style={{ opacity: showRundown ? 1 : 0, pointerEvents: showRundown ? "auto" : "none" }}
          >
            <RundownScreen persona={rundownPersona} onBack={() => setStage("landing")} onSelectPill={handlePillSelect} />
          </div>

          {/* friday night branches into two demos — this picks which one before routing in */}
          <div
            className="absolute inset-0 z-10 transition-opacity duration-500"
            style={{ opacity: showFridayNightChoice ? 1 : 0, pointerEvents: showFridayNightChoice ? "auto" : "none" }}
          >
            <FridayNightChoiceScreen onBack={() => setStage("rundown")} onSelect={handleFridayNightChoice} />
          </div>

          {/* chat flow — top bar, hero/response, faded out while the landing screen is up */}
          <div
            className="relative z-10 flex min-h-0 flex-1 flex-col transition-opacity duration-500"
            style={{ opacity: showChat ? 1 : 0, pointerEvents: showChat ? "auto" : "none" }}
          >
            {/* top bar — replaced by the Messages app's own header at the start of the
                friday-night demo, matching how that demo opens on the messaging app rather
                than on Gemini's own chrome */}
            {showMessagesScene ? (
              <MessagesTopBar />
            ) : (
              <div className="px-[2.87cqw] py-[1.88cqw]" />
            )}

            {/* middle area — hero and the response occupy the same space */}
            <div className="relative min-h-0 flex-1">
              {/* hero — idle only, and only for demos with no scene-setting backdrop of their own */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-[1.25cqw] transition-opacity duration-500"
                style={{ opacity: showHero && !showMessagesScene ? 1 : 0, pointerEvents: showHero && !showMessagesScene ? "auto" : "none" }}
              >
                <img src="/gemini/ph-spark.png" alt="" className="h-[3.36cqw] w-[3.36cqw] object-cover" />
                <p className="whitespace-nowrap text-[2.9cqw] text-white">Where should we start?</p>
              </div>


              {/* both friday-night branches open on their own scene-setting backdrop (a group
                  chat) instead of the generic hero, visible behind the compose bar until a
                  response starts — which conversation depends on which branch was picked. Go
                  out's suggestion chip renders as part of this same thread (see `suggestion`)
                  rather than as a separate floating element, so it reads as one more message. */}
              <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: showMessagesScene ? 1 : 0, pointerEvents: "none" }}>
                <MessagesScene
                  active={showMessagesScene}
                  messages={MESSAGES_BY_DEMO[activeDemo] ?? STAY_IN_MESSAGES}
                  suggestion={activeDemo === "goOut" ? { show: showHero, onClick: handleGoOutSuggestionTap } : undefined}
                />
              </div>

              {/* response — the prompt bubble appears immediately, an inline "thinking" beat
                  follows, then the rest staggers in; which demo plays depends on which
                  rundown pill was tapped */}
              <div className="absolute inset-0" style={{ opacity: showResponse ? 1 : 0, pointerEvents: showResponse ? "auto" : "none" }}>
                {activeDemo === "fridayNight" ? (
                  <TaskAutomationResponse content={FRIDAY_NIGHT_TASK} active={showResponse} onComplete={() => setDemoComplete(true)} />
                ) : activeDemo === "goOut" ? (
                  <GoOutResponse content={GO_OUT_SEARCH} active={showResponse} onComplete={() => setDemoComplete(true)} />
                ) : (
                  <ActivePattern content={RESPONSE_CONTENT_BY_DEMO[activeDemo]!} active={showResponse} onComplete={() => setDemoComplete(true)} />
                )}
              </div>
            </div>
          </div>

          {/* compose — morphs from the idle pill into the typed message box. Hidden during go
              out's idle moment specifically — the suggestion chip above is that branch's entry
              point instead, and showing both would leave two competing tap targets on screen */}
          <div
            className="absolute left-1/2 z-20 overflow-hidden rounded-[3.665cqw] bg-surface-raised transition-[width,height,top,opacity] duration-500 ease-in-out"
            style={{
              transform: "translateX(-50%)",
              top: `${COMPOSE_BOTTOM_CQW - composeHeightCqw}cqw`,
              width: `${composeWidthCqw}cqw`,
              height: `${composeHeightCqw}cqw`,
              opacity: showChat && !(showHero && activeDemo === "goOut") ? 1 : 0,
              pointerEvents: showChat && !(showHero && activeDemo === "goOut") ? "auto" : "none",
            }}
          >
            {/* One continuously-mounted structure rather than two cross-fading overlays, so
                TypingLines never remounts (and its animation never restarts) as this morphs from
                the idle pill through typing to the expanded multi-line box. Phases:
                (1) idle / holding — the plain "Ask Gemini" placeholder, exactly the idle look;
                (2) typing, still one line — the placeholder is replaced by live typed text in
                    that same narrow slot; Live is replaced in place by Send (not yet primed —
                    its comet ring waits for the text to finish, only the plain button shows);
                (3) multiLineLatched — once the text overflows that narrow slot, the box commits
                    to the wider layout: text moves above a bottom toolbar (+, mic, Send), and
                    the outer box expands to fit — growing only as fast as the text actually
                    does, since the text slot below sizes to its own content, never stretched. */}
            <div
              role={composeExpanded ? undefined : "button"}
              tabIndex={composeExpanded ? -1 : 0}
              onClick={composeExpanded ? undefined : () => {
                setActiveDemo("weekend");
                setStage("typed");
              }}
              onKeyDown={
                composeExpanded
                  ? undefined
                  : (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setActiveDemo("weekend");
                        setStage("typed");
                      }
                    }
              }
              className={`absolute inset-0 flex text-left ${
                multiLineLatched ? "flex-col justify-start gap-[0.6cqw] px-[2.2cqw] pt-[2.1cqw] pb-[1.3cqw]" : "flex-row items-center gap-[1.65cqw] px-[2.38cqw]"
              }`}
              style={{ cursor: composeExpanded ? "default" : "pointer" }}
            >
              {!multiLineLatched && <img src="/gemini/icon-plus.svg" alt="" className="h-[2.57cqw] w-[2.57cqw] shrink-0" />}

              {/* sizes to its own content in both layouts — never flex-1/flex-grow (which would
                  stretch it to fill the box's current height and feed a runaway measurement
                  loop) and always shrink-0 (without it, the default flex-shrink:1 lets this get
                  squeezed to fit the box's still-stale height every render, which freezes its
                  own rendered size — and since ResizeObserver only fires on that, not on
                  scrollHeight, the measurement stops updating and new text just clips) */}
              <div
                ref={liveTextRef}
                className={`min-w-0 overflow-hidden text-[1.4cqw] leading-[1.9cqw] text-white ${multiLineLatched ? "w-full shrink-0" : "flex-1"}`}
              >
                {hasStartedTyping ? (
                  <TypingLines lines={PROMPT_LINES_BY_DEMO[activeDemo]} active={composeExpanded} tickMs={TYPING_TICK_MS} onDone={() => setTypingDone(true)} />
                ) : (
                  <p className="whitespace-nowrap text-muted">Ask Gemini</p>
                )}
              </div>

              {!multiLineLatched ? (
                <div className="flex shrink-0 items-center gap-[0.92cqw]">
                  <img src="/gemini/icon-mic.svg" alt="" className="h-[2.57cqw] w-[2.57cqw]" />
                  {hasStartedTyping ? (
                    <button
                      type="button"
                      onClick={() => setStage("response")}
                      className={`relative flex h-[4.4cqw] w-[4.4cqw] items-center justify-center rounded-full bg-[#1f3b9b] ${typingDone ? "[animation:subtle-pulse_2.2s_ease-in-out_infinite]" : ""}`}
                    >
                      {typingDone && <CometRing />}
                      <img src="/gemini/icon-send.svg" alt="Send" className="relative h-[1.8cqw] w-[1.8cqw]" />
                    </button>
                  ) : (
                    <div className="flex h-[4.4cqw] w-[4.4cqw] items-center justify-center rounded-full bg-[#192967]">
                      <img src="/gemini/icon-live.svg" alt="" className="h-[2.9cqw] w-[2.9cqw]" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex shrink-0 items-center justify-between">
                  <img src="/gemini/icon-plus.svg" alt="" className="h-[2.57cqw] w-[2.57cqw]" />
                  <div className="flex items-center gap-[1.5cqw]">
                    <img src="/gemini/icon-mic.svg" alt="" className="h-[2.57cqw] w-[2.57cqw]" />
                    <button
                      type="button"
                      onClick={() => setStage("response")}
                      className={`relative flex h-[2.62cqw] w-[2.62cqw] items-center justify-center rounded-full bg-[#1f3b9b] ${typingDone ? "[animation:subtle-pulse_2.2s_ease-in-out_infinite]" : ""}`}
                    >
                      {typingDone && <CometRing />}
                      <img src="/gemini/icon-send.svg" alt="Send" className="relative h-[1.3cqw] w-[1.3cqw]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* shared exit affordance for every demo — appears once that demo's content has
              fully played out (a text answer finished revealing, or FoodOrder was paid),
              rather than each demo authoring its own "back" button in its own content */}
          {showResponse && demoComplete && (
            <button
              type="button"
              onClick={() => setStage("landing")}
              className="absolute bottom-[2.5cqw] right-[2.87cqw] z-20 rounded-full bg-[#1f3b9b] px-[1.8cqw] py-[1cqw] text-[1.2cqw] font-medium text-white [animation:fade-in-up_400ms_ease-out,subtle-pulse_2.2s_ease-in-out_0.4s_infinite] active:bg-[#17307d]"
            >
              Back to home
            </button>
          )}

          {/* pairs with the back button above — same trigger, opposite corner */}
          {showResponse && demoComplete && (
            <div className="absolute bottom-[2.5cqw] left-[2.87cqw] z-20 flex items-center gap-[0.9cqw] [animation:fade-in-up_400ms_ease-out]">
              <img src="/gemini/qr-code.jpg" alt="" className="h-[5cqw] w-[5cqw] rounded-[0.5cqw] object-cover" />
              <span className="max-w-[7cqw] text-[0.95cqw] leading-[1.2cqw] text-muted">Scan to try Gemini on your phone</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
