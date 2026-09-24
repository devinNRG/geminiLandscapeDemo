"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import GlassPillsLayout from "@/components/kiosk/landing/GlassPillsLayout";
import {
  BAND_TOUR_RESPONSE,
  FRIDAY_NIGHT_TASK,
  GO_OUT_MESSAGES,
  GO_OUT_SEARCH,
  GO_OUT_SUGGESTION,
  PERSONAS,
  RUNDOWNS,
  SEMESTER_PLAN,
  STAY_IN_MESSAGES,
  STAY_IN_SUGGESTION,
  STUDY_NOTEBOOK,
  WEEKEND_RESPONSE,
  type ChatBubble,
  type MessagesSuggestion,
  type RestaurantResult,
  type Persona,
  type ResponseContent,
} from "@/components/kiosk/types";
import TypingLines from "@/components/kiosk/TypingLines";
import RundownScreen from "@/components/kiosk/RundownScreen";
import FridayNightChoiceScreen from "@/components/kiosk/FridayNightChoiceScreen";
import TaskAutomationResponse from "@/components/kiosk/TaskAutomationResponse";
import GoOutResponse, { GO_OUT_CUE_DELAY_MS } from "@/components/kiosk/GoOutResponse";
import MessagesScene from "@/components/kiosk/MessagesScene";
import SemesterPlanResponse from "@/components/kiosk/SemesterPlanResponse";
import StudyNotebook from "@/components/kiosk/StudyNotebook";
import ScrollPattern from "@/components/kiosk/patterns/ScrollPattern";
import { BackButton, GradientPillButton, PulseRings, useThinkingPhase } from "@/components/kiosk/shared";

type Stage = "landing" | "rundown" | "fridayNightChoice" | "idle" | "typed" | "response";

// which built demo the compose bar / response area are currently playing
type DemoId = "weekend" | "fridayNight" | "goOut" | "bandTour" | "semester" | "notebook";

// pill id -> the demo it plays; every other pill renders disabled on the rundown screen
const PILL_DEMOS: Record<string, DemoId> = {
  "friends-weekend": "weekend",
  "band-tour": "bandTour",
  "study-semester": "semester",
  "study-notebook": "notebook",
  // "friday-night" is deliberately absent — it routes through the fridayNightChoice
  // screen instead, which sets activeDemo to "fridayNight" or "goOut" itself
};

// demos that are a text-generation answer (rendered by ScrollPattern)
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
  semester: SEMESTER_PLAN.promptLines,
  // typed into the notebook's own input, not the Ask Gemini bar (see StudyNotebook)
  notebook: [STUDY_NOTEBOOK.setupPrompt],
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

// Go out's pick prompt, centred on the idle compose pill's own middle (53.27 - 7.33 / 2)
const PICK_PROMPT_HEIGHT_CQW = 5.2;
const PICK_PROMPT_TOP_CQW = COMPOSE_BOTTOM_CQW - 7.33 / 2 - PICK_PROMPT_HEIGHT_CQW / 2;
// gap between the results panel's scroll cue appearing and this prompt sliding up
const PICK_PROMPT_AFTER_CUE_MS = 700;

const PICK_RING_MS = 2400;
const PICK_RING_COUNT = 3;

/**
 * "Tap on your chosen restaurant" — a black pill with no rim of its own, and rings that close
 * *in* on it: each starts wide and faint and homes onto the pill's edge, slowing as it
 * arrives (`pill-converge` in globals.css). Send's rings leave the button; these arrive at
 * the label, pulling the eye onto the instruction rather than away from it.
 */
function PickPrompt({ active }: { active: boolean }) {
  return (
    <div
      className="relative flex items-center whitespace-nowrap rounded-full bg-black px-[3cqw] text-[1.6cqw] text-white"
      style={{ height: `${PICK_PROMPT_HEIGHT_CQW}cqw` }}
    >
      {active &&
        Array.from({ length: PICK_RING_COUNT }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-[0.12cqw] border-white opacity-0"
            style={{
              animation: `pill-converge ${PICK_RING_MS}ms cubic-bezier(0.2, 0.7, 0.3, 1) infinite`,
              animationDelay: `${(i * PICK_RING_MS) / PICK_RING_COUNT}ms`,
            }}
          />
        ))}
      Tap on your chosen restaurant
    </div>
  );
}

/**
 * The shared exit affordance every demo hands off to once its content has played out — a
 * text answer finished revealing, or FoodOrder was paid — rather than each demo authoring
 * its own "back" button inside its own content.
 *
 * Goes back to the persona's rundown, not the landing page: every demo is started from a
 * rundown pill, so that's the screen the visitor came from and the one with the next
 * demo on it.
 *
 * Floated into the frame's bottom-right corner, with the QR code opposite it.
 */
function BackToRundownButton({ onClick }: { onClick: () => void }) {
  return <GradientPillButton onClick={onClick}>Back to your rundown</GradientPillButton>;
}

/**
 * Pairs with the button above — same trigger, and the take-it-with-you half of the ending.
 * Floated into the frame's bottom-left corner, reading left-to-right (code then label) so it
 * stays short and out of the answer's way.
 */
function QrPrompt() {
  return (
    <div className="flex items-center gap-[0.9cqw]">
      <img src="/gemini/qr-code.jpg" alt="" className="h-[5cqw] w-[5cqw] rounded-[0.5cqw] object-cover" />
      <span className="max-w-[7cqw] text-[0.95cqw] leading-[1.2cqw] text-muted">Scan to try Gemini on your phone</span>
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
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
  const [goOutPick, setGoOutPick] = useState<RestaurantResult | null>(null);

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

  // gates the send button's attention-grabbing ring pulse — the rings only start once every
  // character has actually appeared, not the moment the button itself shows up
  const [typingDone, setTypingDone] = useState(false);
  useEffect(() => {
    if (!composeExpanded) setTypingDone(false);
  }, [composeExpanded]);

  const composeHeightCqw = multiLineLatched ? CHROME_CQW + liveTextHeightCqw : 7.33;

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
  //
  // The semester demo parks it for its whole answer rather than for a single beat: once the
  // prompt is sent that flow is a reasoning rail and then a full-bleed Google Calendar, and
  // the source design shows no compose bar for either. Leaving it up would also squeeze the
  // rail, which needs the band the bar sits in to finish inside the frame.
  //
  // Go out and the band tour park it too, once their results are up. In go out the only
  // thing left to do is pick a restaurant, so the band belongs to the "tap on your chosen
  // restaurant" prompt; the band tour's answer is the end of its flow. Nothing later in
  // either asks Gemini anything, so the bar doesn't come back. Timed off the same thinking
  // beat both answers reveal on, so the bar leaves as the results land.
  const { contentShown: resultsUp } = useThinkingPhase(
    showResponse && (activeDemo === "goOut" || activeDemo === "bandTour"),
  );
  const goOutResultsUp = resultsUp && activeDemo === "goOut";
  // The study notebook parks it for the whole demo: the notebook has an input of its own.
  const composeParked =
    (showMessagesScene && showHero) ||
    (showResponse && (activeDemo === "semester" || activeDemo === "notebook")) ||
    resultsUp;
  // ...and the pick prompt comes last, a beat after the answer's scroll cue, so results,
  // cue and prompt each get their own moment instead of landing as one
  const [pickPromptDue, setPickPromptDue] = useState(false);
  useEffect(() => {
    if (!goOutResultsUp) return;
    const t = setTimeout(() => setPickPromptDue(true), GO_OUT_CUE_DELAY_MS + PICK_PROMPT_AFTER_CUE_MS);
    return () => {
      clearTimeout(t);
      setPickPromptDue(false);
    };
  }, [goOutResultsUp]);
  const showPickPrompt = pickPromptDue && goOutResultsUp && !goOutPick;

  // Stable identities on purpose: the response components hold these in effect dependency
  // arrays alongside their own timers, so a fresh closure each render would tear down and
  // restart the timer every render and the sequence would never advance.
  const handleDemoComplete = useCallback(() => setDemoComplete(true), []);
  const handleLeaveChat = useCallback(() => setChatVisibleInResponse(false), []);

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
    // the notebook is its own app with its own input, so it skips the Ask Gemini typing
    // beat and opens straight onto its empty Sources tab
    if (demo === "notebook") {
      setActiveDemo(demo);
      setStage("response");
      return;
    }
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

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1f1f1f] p-8">
      <div
        ref={frameRef}
        className="@container relative flex flex-col overflow-hidden rounded-[2.5cqw] border-[0.35cqw] border-black bg-black"
        style={{
          aspectRatio: "16 / 9",
          // this page's own p-8 (2rem top and bottom) and nothing else. It used to also
          // subtract a control bar above the frame; that bar is gone, and its band is frame.
          width: "min(100%, calc((100vh - 4rem) * 16 / 9))",
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

        {/* The way out of a demo. The landing screen is home so it needs none, and the
            rundown and the friday-night choice draw their own (theirs step back one screen
            rather than all the way out). This is for everything after that: once a demo is
            playing there is otherwise nothing to tap until it finishes, which on a kiosk
            means a visitor who changes their mind is stuck watching an animation. */}
        {showChat && <BackButton onClick={() => setStage("landing")} />}

        {/* chat flow — top bar, hero/response, faded out while the landing screen is up */}
        <div
          className="relative z-10 flex min-h-0 flex-1 flex-col transition-opacity duration-500"
          style={{ opacity: showChat ? 1 : 0, pointerEvents: showChat ? "auto" : "none" }}
        >
          {/* top bar — a spacer, and only ever that. The Messages demos used to swap their
              app's own header in here; that header now belongs to MessagesScene, drawn on the
              app's own surface where the design puts it rather than on the kiosk's. */}
          <div className="px-[2.87cqw] py-[1.88cqw]" />

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
                // Gemini holds the foreground from the chip tap onward — first its compose
                // bar, then its answer panel — so the chat behind it steps back for both.
                // Picking a restaurant closes that panel and hands the thread back, so the
                // drafted plan and the replies land at full brightness.
                dimmed={showMessagesScene && !showHero && !goOutPick}
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
              ) : activeDemo === "semester" ? (
                <SemesterPlanResponse
                  /* remounted per run rather than reset from the inside: this demo's own
                     state is all per-run, and an effect that clears it lands a render
                     late — the same trap the chat state above is kept out of */
                  key={showResponse ? "run" : "idle"}
                  content={SEMESTER_PLAN}
                  active={showResponse}
                  onComplete={handleDemoComplete}
                />
              ) : activeDemo === "notebook" ? (
                <StudyNotebook
                  // remounted per run, like the semester demo, so every run starts empty
                  key={showResponse ? "run" : "idle"}
                  content={STUDY_NOTEBOOK}
                  active={showResponse}
                  onComplete={handleDemoComplete}
                />
              ) : activeDemo === "goOut" ? (
                <GoOutResponse
                  content={GO_OUT_SEARCH}
                  active={showResponse}
                  onComplete={handleDemoComplete}
                  onChoose={setGoOutPick}
                />
              ) : (
                <ScrollPattern
                  content={RESPONSE_CONTENT_BY_DEMO[activeDemo]!}
                  active={showResponse}
                  onComplete={handleDemoComplete}
                />
              )}
            </div>
          </div>
        </div>

        {/* compose — morphs from the idle pill into the typed message box. Display only: it
            shows what the visitor "asked", it isn't how anything is asked. Every demo is
            started by a rundown pill or by a thread's own suggestion chip, so the bar has no
            tap target of its own beyond Send. Parked below the frame during go out's idle
            moment, where the suggestion chip is the entry point and a second visible
            compose field would read as a competing one. */}
        <div
          className="absolute z-20 overflow-hidden rounded-[3.665cqw] bg-surface-raised transition-[height,top,left,transform,opacity] duration-500 ease-in-out"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            // parked clear of the frame's bottom edge while the messaging app owns this
            // band; the frame's own overflow-hidden clips it there, so handing the band
            // over just animates `top` back and reads as a slide up into place. Same
            // property the box later uses to grow upward, but the two never overlap —
            // the slide finishes long before the first character appears.
            top: composeParked ? "58cqw" : `${COMPOSE_BOTTOM_CQW - composeHeightCqw}cqw`,
            width: `${COMPOSE_WIDTH_CQW}cqw`,
            height: `${composeHeightCqw}cqw`,
            opacity: showChat ? 1 : 0,
            // The bar is a picture of a compose field, not a working one: nothing in it
            // starts a demo any more (rundown pills and the in-thread suggestion chip do
            // that), so it's inert and the Send button below opts back in by itself. That
            // also stops it swallowing swipes meant for the answer scrolling underneath it.
            pointerEvents: "none",
          }}
        >
          {/* One continuously-mounted structure rather than two cross-fading overlays, so
              TypingLines never remounts (and its animation never restarts) as this morphs from
              the idle pill through typing to the expanded multi-line box. Phases:
              (1) idle / holding — the plain "Ask Gemini" placeholder, exactly the idle look;
              (2) typing, still one line — the placeholder is replaced by live typed text in
                  that same narrow slot; Live is replaced in place by Send (not yet primed —
                  its ring pulse waits for the text to finish, only the plain button shows);
              (3) multiLineLatched — once the text overflows that narrow slot, the box commits
                  to the wider layout: text moves above a bottom toolbar (+, mic, Send), and
                  the outer box expands to fit — growing only as fast as the text actually
                  does, since the text slot below sizes to its own content, never stretched. */}
          <div
            className={`absolute inset-0 flex text-left ${
              multiLineLatched ? "flex-col justify-start gap-[0.6cqw] px-[2.2cqw] pt-[2.1cqw] pb-[1.3cqw]" : "flex-row items-center gap-[1.65cqw] px-[2.38cqw]"
            }`}
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
                  <PulseRings active={typingDone}>
                    <button
                      type="button"
                      onClick={() => setStage("response")}
                      className="pointer-events-auto flex h-[4.4cqw] w-[4.4cqw] items-center justify-center rounded-full bg-[#1f3b9b]"
                    >
                      <img src="/gemini/icon-send.svg" alt="Send" className="h-[1.8cqw] w-[1.8cqw]" />
                    </button>
                  </PulseRings>
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
                  <PulseRings active={typingDone}>
                    <button
                      type="button"
                      onClick={() => setStage("response")}
                      className="pointer-events-auto flex h-[2.62cqw] w-[2.62cqw] items-center justify-center rounded-full bg-[#1f3b9b]"
                    >
                      <img src="/gemini/icon-send.svg" alt="Send" className="h-[1.3cqw] w-[1.3cqw]" />
                    </button>
                  </PulseRings>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Go out's pick prompt, in the band the Ask Gemini bar just vacated, riding the same
            slide in from below the frame. A label, not a button: the restaurant photos are
            what get tapped, and this only says so. Leaves the same way once one is picked. */}
        <div
          className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 transition-[top,opacity] duration-500 ease-in-out"
          style={{ top: showPickPrompt ? `${PICK_PROMPT_TOP_CQW}cqw` : "58cqw", opacity: showPickPrompt ? 1 : 0 }}
        >
          <PickPrompt active={showPickPrompt} />
        </div>

        {/* the demo's ending — floated into opposite bottom corners of the frame. The
            entrance animation always lives on a wrapper, never on the button itself, so it
            can't fight anything the button (or its rings) animate on `transform`. */}
        {showResponse && demoComplete && (
          <>
            <div className="absolute bottom-[2.5cqw] right-[2.87cqw] z-20 [animation:fade-in-up_400ms_ease-out]">
              <BackToRundownButton onClick={() => setStage("rundown")} />
            </div>
            <div className="absolute bottom-[2.5cqw] left-[2.87cqw] z-20 [animation:fade-in-up_400ms_ease-out]">
              <QrPrompt />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
