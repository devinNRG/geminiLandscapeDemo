"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PATTERNS } from "@/components/kiosk/patterns";
import GlassPillsLayout from "@/components/kiosk/landing/GlassPillsLayout";
import {
  BAND_TOUR_RESPONSE,
  FRIDAY_NIGHT_TASK,
  GO_OUT_MESSAGES,
  GO_OUT_SEARCH,
  GO_OUT_SUGGESTION,
  PERSONAS,
  RUNDOWNS,
  STAY_IN_MESSAGES,
  STAY_IN_SUGGESTION,
  WEEKEND_RESPONSE,
  type ChatBubble,
  type MessagesSuggestion,
  type SushiResult,
  type Persona,
  type PatternId,
  type ResponseContent,
} from "@/components/kiosk/types";
import TypingLines from "@/components/kiosk/TypingLines";
import RundownScreen from "@/components/kiosk/RundownScreen";
import FridayNightChoiceScreen from "@/components/kiosk/FridayNightChoiceScreen";
import TaskAutomationResponse from "@/components/kiosk/TaskAutomationResponse";
import GoOutResponse from "@/components/kiosk/GoOutResponse";
import MessagesScene, { MessagesTopBar } from "@/components/kiosk/MessagesScene";
import { CometRing } from "@/components/kiosk/shared";
import {
  COLUMN_BASELINE_CQW,
  COLUMN_SCALE,
  COLUMN_TOP_CQW,
  COLUMN_WIDTH_CQW,
  columnCenterCqw,
} from "@/components/kiosk/patterns/columnLayout";

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

// the Gemini Intelligence chip that starts each Friday-night branch, in place of the usual
// idle "Ask Gemini" pill — both branches open on a thread and are entered by tapping one
const SUGGESTION_BY_DEMO: Partial<Record<DemoId, MessagesSuggestion>> = {
  fridayNight: STAY_IN_SUGGESTION,
  goOut: GO_OUT_SUGGESTION,
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
// the box's width never changes — the expanded multi-line width is also the idle pill's, so
// the box only ever grows downward, line by line. It used to widen (31.77 -> 35.43) the moment
// the text outgrew one line, which landed a sideways nudge in the middle of the height growth
// and read as a second, competing animation.
const COMPOSE_WIDTH_CQW = 35.43;
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
// pause before any characters appear, once the compose box is in place
const TYPING_START_DELAY_MS = 1500;
// how long the box takes to slide up from below the frame — matches the compose bar's own
// transition duration. Branches that slide wait this out *before* the pause above starts,
// so the "hold" is always measured from the box actually being in position, not from the tap.
const COMPOSE_SLIDE_MS = 500;
// ms per character — slower than the default so the prompt reads as deliberate, not rushed
const TYPING_TICK_MS = 45;

/**
 * The shared exit affordance every demo hands off to once its content has played out — a
 * text answer finished revealing, or FoodOrder was paid — rather than each demo authoring
 * its own "back" button inside its own content.
 *
 * Split out from its placement because it now has two: floated into the frame's corners for
 * most of the app, and stacked inside column three when the measured-columns frame is up.
 */
function BackHomeButton({ onClick }: { onClick: () => void }) {
  return (
    <CometRing active pulse>
      <button
        type="button"
        onClick={onClick}
        className="rounded-full bg-[#1f3b9b] px-[1.8cqw] py-[1cqw] text-[1.2cqw] font-medium text-white active:bg-[#17307d]"
      >
        Back to home
      </button>
    </CometRing>
  );
}

/**
 * Pairs with the button above — same trigger, and the take-it-with-you half of the ending.
 *
 * Two arrangements, because the two placements want different things: floated into the
 * frame's bottom-left corner it reads left-to-right, code then label, keeping it short and
 * out of the answer's way. Standing in column three it's a centered stack instead — it has
 * a whole column's width to sit in, and a centered stack is what lines up with the
 * "Back to home" button under it rather than hanging off to one side of it.
 */
function QrPrompt({ stacked = false }: { stacked?: boolean }) {
  return (
    <div className={`flex gap-[0.9cqw] ${stacked ? "flex-col items-center" : "items-center"}`}>
      <img
        src="/gemini/qr-code.jpg"
        alt=""
        className={`object-cover ${stacked ? "h-[7cqw] w-[7cqw] rounded-[0.7cqw]" : "h-[5cqw] w-[5cqw] rounded-[0.5cqw]"}`}
      />
      <span
        className={`text-[0.95cqw] leading-[1.2cqw] text-muted ${stacked ? "max-w-[13cqw] text-center" : "max-w-[7cqw]"}`}
      >
        Scan to try Gemini on your phone
      </span>
    </div>
  );
}

function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-3.5 pr-4 text-sm font-medium text-neutral-200 hover:bg-white/10"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
      Home
    </button>
  );
}

/**
 * Which of the two answer layouts the text demos play in. It reads as a mode you pick and
 * then run end to end, not as a control you reach for halfway through an answer — so it's
 * a standing segmented toggle beside the Home button rather than a dropdown that appears
 * over a response, and choosing the other one restarts at the landing screen instead of
 * re-rendering the answer already on screen underneath you. Same destination as the Home
 * button it sits next to, which is what makes the reset read as "start the other demo"
 * rather than as losing your place.
 *
 * Outside the device frame, so hover states are fine here — the no-hover rule is about
 * what's on the touchscreen.
 */
function PatternToggle({ pattern, onChange }: { pattern: PatternId; onChange: (id: PatternId) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {PATTERNS.map((p) => {
        const active = p.id === pattern;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            aria-pressed={active}
            title={p.description}
            className={`rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${
              active ? "bg-white/15 text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The strip above the kiosk holding everything that drives the demo but is not part of it:
 * the Home button and the layout toggle. They used to float in the corners *over* the
 * stage, which left it ambiguous whether they were chrome or part of the product being
 * shown — a fair question to have when the thing on screen is a mockup of a kiosk UI.
 *
 * So they get their own band: a lighter surface than the stage below it, a rule under it,
 * and a label saying what it is. Everything in here is allowed hover states and ordinary
 * app-sized type (px, not cqw) precisely because it is *not* the kiosk — the 16:9 frame
 * below is the only thing pretending to be a product.
 */
function DemoControlBar({
  pattern,
  onPatternChange,
  onHome,
}: {
  pattern: PatternId;
  onPatternChange: (id: PatternId) => void;
  onHome: () => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#2a2a2c] px-6">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
          Demo controls
        </span>
        <span className="h-5 w-px bg-white/10" />
        <HomeButton onClick={onHome} />
      </div>
      <PatternToggle pattern={pattern} onChange={onPatternChange} />
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  const [pattern, setPattern] = useState<PatternId>("scroll");
  const [rundownPersona, setRundownPersona] = useState<Persona>(DEFAULT_RUNDOWN_PERSONA);
  const [activeDemo, setActiveDemo] = useState<DemoId>("weekend");
  // whichever demo is playing, once its content has fully finished — shows the shared
  // "back to landing" corner button in place of each demo authoring its own exit affordance
  const [demoComplete, setDemoComplete] = useState(false);
  // Gemini answers *over* the group chat rather than replacing it, so the chat stays up
  // through the response. Only stay in eventually leaves it, when its task takes the whole
  // screen; go out never does — it ends by drafting back into the same thread.
  const [chatVisibleInResponse, setChatVisibleInResponse] = useState(true);
  // the result picked in go out, appended to the thread as Gemini's drafted plan
  const [goOutPick, setGoOutPick] = useState<SushiResult | null>(null);

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
  // Only demoComplete is reset here. Per-run chat state (chatVisibleInResponse, goOutPick)
  // is reset in handleFridayNightChoice instead — an effect lands one render *after*
  // showResponse flips, and for a single frame `showMessagesScene` would compute false off
  // the previous run's leftovers. That frame unmounted the thread and the correction
  // remounted it, replaying the whole conversation from the top the moment you hit send.
  useEffect(() => {
    if (showResponse) setDemoComplete(false);
  }, [showResponse, activeDemo]);

  // both Friday-night branches open on a group chat and are entered by tapping its
  // suggestion chip, so their compose box slides up from below the frame rather than
  // simply being there — the other demos' boxes are already in place and just fade in
  const composeSlidesUp = activeDemo === "fridayNight" || activeDemo === "goOut";

  // the beat where the box already looks like the idle pill (still showing the "Ask
  // Gemini" placeholder) before any characters start appearing
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  useEffect(() => {
    if (!composeExpanded) {
      setHasStartedTyping(false);
      return;
    }
    const t = setTimeout(() => setHasStartedTyping(true), TYPING_START_DELAY_MS + (composeSlidesUp ? COMPOSE_SLIDE_MS : 0));
    return () => clearTimeout(t);
  }, [composeExpanded, activeDemo, composeSlidesUp]);

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

  // The measured-columns pattern isn't a block of content inside the frame — it's a
  // three-column frame the whole screen is divided into, and two of those columns are
  // filled by chrome this file owns rather than by the pattern. So while it's on screen the
  // compose bar and the exit affordances leave their usual frame-centered / frame-corner
  // positions and take up their column's slot instead. Geometry comes from columnLayout so
  // both files are placing things in the same grid.
  const inColumnFrame = showResponse && pattern === "measuredColumns" && activeDemo in RESPONSE_CONTENT_BY_DEMO;
  // Scaled, not re-laid-out: the box keeps its authored 35.43cqw width (so its text wraps to
  // exactly the same lines it did while being typed, and the height measurement above stays
  // valid) and is simply drawn at the column's scale. 35.43/42 and 23.62/28 are the same
  // ratio, so it sits in a column exactly as it sat in the full-width layout.
  const composeScale = inColumnFrame ? COLUMN_SCALE : 1;
  // what column one has to keep clear beneath its blocks — the box as actually drawn. The
  // gap below it down to the frame's edge isn't included: that's the floor every column
  // already stops at (COLUMN_BASELINE_CQW), not something column one reserves for itself.
  const composeDrawnHeightCqw = composeHeightCqw * composeScale;
  // Both friday-night branches open on their own group chat instead of the generic hero,
  // and now stay on it through the response — Gemini's answer floats over the thread
  // rather than replacing it. Stay in is the only one that eventually leaves.
  const showMessagesScene =
    (activeDemo === "fridayNight" || activeDemo === "goOut") &&
    (showHero || composeExpanded || (showResponse && chatVisibleInResponse));

  // go out's drafted plan, plus the group's answers, appended to the thread once a result
  // is picked. Memoised because AnimatedThread keys its in-flight timer off this array's
  // identity — a fresh array each render would restart the message it's mid-way through.
  const messagesForScene = useMemo(() => {
    const base = MESSAGES_BY_DEMO[activeDemo] ?? STAY_IN_MESSAGES;
    // guarded on the demo as well as the pick: the two branches are separate conversations,
    // so go out's drafted plan must never turn up appended to stay in's thread
    if (activeDemo !== "goOut" || !goOutPick) return base;
    return [...base, { kind: "outgoing" as const, text: goOutPick.draftText }, ...GO_OUT_SEARCH.replies];
  }, [activeDemo, goOutPick]);

  // The messaging app's own RCS field is part of the phone, so it stays put the whole time
  // the chat is up. Gemini's box doesn't trade places with it — it waits parked below the
  // frame until the suggestion chip is tapped, then slides up and sits *on top of* it for
  // the rest of the flow. The RCS field is the wider of the two, so its ends stay visible
  // either side of Gemini's pill; that overlap is the source design's, not an accident.
  const composeParked = showMessagesScene && showHero;

  const showMessagesTopBar = showMessagesScene;

  // Stable identities on purpose: the response components hold these in effect dependency
  // arrays alongside their own timers, so a fresh closure each render would tear down and
  // restart the timer every render and the sequence would never advance.
  const handleDemoComplete = useCallback(() => setDemoComplete(true), []);
  const handleLeaveChat = useCallback(() => setChatVisibleInResponse(false), []);

  const ActivePattern = PATTERNS.find((p) => p.id === pattern)!.Component;

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

  // both branches open on their group chat, where that thread's own Gemini suggestion chip
  // (not the usual idle "Ask Gemini" pill) is what actually brings the compose bar up.
  // This is the only way into either branch, so clearing the pick here is what guarantees
  // a run always starts from a clean thread — including re-running go out itself, where a
  // leftover pick would show the drafted plan already in the chat before it was asked for.
  const handleFridayNightChoice = (choice: "goOut" | "stayIn") => {
    setGoOutPick(null);
    setChatVisibleInResponse(true);
    setActiveDemo(choice === "stayIn" ? "fridayNight" : "goOut");
    setStage("idle");
  };

  const handleSuggestionTap = () => setStage("typed");

  // Picking the other layout is picking the other demo, so it starts that demo from the top
  // rather than re-laying-out the answer currently on screen. Without this you can watch a
  // measured-column answer reflow into a scrolling one mid-sentence, which reads as a bug
  // in the design rather than as two alternatives being compared.
  const handlePatternChange = (id: PatternId) => {
    if (id === pattern) return;
    setPattern(id);
    setStage("landing");
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#1f1f1f]">
      <DemoControlBar pattern={pattern} onPatternChange={handlePatternChange} onHome={() => setStage("landing")} />

      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div
          ref={frameRef}
          className="@container relative flex flex-col overflow-hidden rounded-[2.5cqw] border-[0.35cqw] border-black bg-black"
          style={{
            aspectRatio: "16 / 9",
            // the control bar (h-14 = 3.5rem) plus this row's own p-8 (2rem top and bottom).
            // It used to subtract 9rem, most of which was slack for the Home button floating
            // over the stage — now that the chrome has its own band, that slack is frame.
            width: "min(100%, calc((100vh - 7.5rem) * 16 / 9))",
            maxHeight: "100%",
          }}
        >
          {/* landing — persona picker, shown before the chat flow begins */}
          <div
            className="absolute inset-0 z-10 transition-opacity duration-500"
            style={{ opacity: showLanding ? 1 : 0, pointerEvents: showLanding ? "auto" : "none" }}
          >
            <GlassPillsLayout onSelect={handlePersonaSelect} />
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
            {showMessagesTopBar ? (
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
                  messages={messagesForScene}
                  suggestion={
                    SUGGESTION_BY_DEMO[activeDemo]
                      ? { show: showHero, onClick: handleSuggestionTap, ...SUGGESTION_BY_DEMO[activeDemo]! }
                      : undefined
                  }
                  showComposeBar={showMessagesScene}
                />
              </div>

              {/* response — the prompt bubble appears immediately, an inline "thinking" beat
                  follows, then the rest staggers in; which demo plays depends on which
                  rundown pill was tapped */}
              <div className="absolute inset-0" style={{ opacity: showResponse ? 1 : 0, pointerEvents: showResponse ? "auto" : "none" }}>
                {activeDemo === "fridayNight" ? (
                  <TaskAutomationResponse
                    content={FRIDAY_NIGHT_TASK}
                    active={showResponse}
                    onComplete={handleDemoComplete}
                    onLeaveChat={handleLeaveChat}
                  />
                ) : activeDemo === "goOut" ? (
                  <GoOutResponse
                    content={GO_OUT_SEARCH}
                    active={showResponse}
                    onComplete={handleDemoComplete}
                    onChoose={setGoOutPick}
                  />
                ) : (
                  <ActivePattern
                    content={RESPONSE_CONTENT_BY_DEMO[activeDemo]!}
                    active={showResponse}
                    onComplete={handleDemoComplete}
                    composeHeightCqw={composeDrawnHeightCqw}
                  />
                )}
              </div>
            </div>
          </div>

          {/* compose — morphs from the idle pill into the typed message box. Hidden during go
              out's idle moment specifically — the suggestion chip above is that branch's entry
              point instead, and showing both would leave two competing tap targets on screen */}
          <div
            className="absolute z-20 overflow-hidden rounded-[3.665cqw] bg-surface-raised transition-[height,top,left,transform,opacity] duration-500 ease-in-out"
            style={{
              // centered on the frame normally; on column one's center while the
              // measured-columns frame is up, gliding across on the same 500ms as everything
              // else this box animates
              left: inColumnFrame ? `${columnCenterCqw(0)}cqw` : "50%",
              transform: `translateX(-50%) scale(${composeScale})`,
              // scaled from its own bottom edge, so the box's resting line stays put at
              // COMPOSE_BOTTOM_CQW no matter what scale it's drawn at
              transformOrigin: "50% 100%",
              // parked clear of the frame's bottom edge while the messaging app owns this
              // band; the frame's own overflow-hidden clips it there, so handing the band
              // over just animates `top` back and reads as a slide up into place. Same
              // property the box later uses to grow upward, but the two never overlap —
              // the slide finishes long before the first character appears.
              top: composeParked ? "58cqw" : `${COMPOSE_BOTTOM_CQW - composeHeightCqw}cqw`,
              width: `${COMPOSE_WIDTH_CQW}cqw`,
              height: `${composeHeightCqw}cqw`,
              opacity: showChat ? 1 : 0,
              pointerEvents: showChat && !composeParked ? "auto" : "none",
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
                    <CometRing active={typingDone} pulse>
                      <button
                        type="button"
                        onClick={() => setStage("response")}
                        className="flex h-[4.4cqw] w-[4.4cqw] items-center justify-center rounded-full bg-[#1f3b9b]"
                      >
                        <img src="/gemini/icon-send.svg" alt="Send" className="h-[1.8cqw] w-[1.8cqw]" />
                      </button>
                    </CometRing>
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
                    <CometRing active={typingDone} pulse>
                      <button
                        type="button"
                        onClick={() => setStage("response")}
                        className="flex h-[2.62cqw] w-[2.62cqw] items-center justify-center rounded-full bg-[#1f3b9b]"
                      >
                        <img src="/gemini/icon-send.svg" alt="Send" className="h-[1.3cqw] w-[1.3cqw]" />
                      </button>
                    </CometRing>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* the demo's ending, in whichever shape the current layout calls for. The entrance
              animation always lives on a wrapper, never on the button itself: it and the
              comet ring's pulse both drive `transform`, so on one element the later one
              simply wins and the other silently does nothing. For the same reason the
              column-three chrome is positioned by `left`/`top`/`bottom` alone rather than a
              centering translate — fade-in-up would overwrite that translate mid-entrance. */}
          {showResponse &&
            demoComplete &&
            (inColumnFrame ? (
              /* column three of the measured-columns frame, which exists for exactly this:
                 the answer fills columns one and two, and the way out lives in the third.
                 This box spans the column's whole band — from where column content starts
                 down to the shared floor — and centers the pair inside it, so the exit sits
                 level with the middle of the answer rather than hugging its bottom edge. */
              <div
                className="absolute z-20 flex flex-col items-center justify-center"
                style={{
                  left: `${columnCenterCqw(2) - COLUMN_WIDTH_CQW / 2}cqw`,
                  width: `${COLUMN_WIDTH_CQW}cqw`,
                  top: `${COLUMN_TOP_CQW}cqw`,
                  bottom: `${COLUMN_BASELINE_CQW}cqw`,
                }}
              >
                {/* the entrance animation stays on this inner wrapper — on the box above it
                    would drive `transform` against the centering layout */}
                <div className="flex flex-col items-center gap-[2cqw] [animation:fade-in-up_400ms_ease-out]">
                  <QrPrompt stacked />
                  <BackHomeButton onClick={() => setStage("landing")} />
                </div>
              </div>
            ) : (
              /* everywhere else — floated into opposite bottom corners of the frame */
              <>
                <div className="absolute bottom-[2.5cqw] right-[2.87cqw] z-20 [animation:fade-in-up_400ms_ease-out]">
                  <BackHomeButton onClick={() => setStage("landing")} />
                </div>
                <div className="absolute bottom-[2.5cqw] left-[2.87cqw] z-20 [animation:fade-in-up_400ms_ease-out]">
                  <QrPrompt />
                </div>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
