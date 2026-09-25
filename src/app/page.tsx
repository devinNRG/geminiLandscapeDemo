"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import GlassPillsLayout from "@/components/kiosk/landing/GlassPillsLayout";
import {
  BAND_TOUR_RESPONSE,
  FRIDAY_NIGHT_TASK,
  GO_OUT_MESSAGES,
  GO_OUT_SEARCH,
  DINNER_PLAN,
  DINNER_RESERVATION,
  CITY_CHOICES,
  CITY_GUIDES,
  GO_OUT_SUGGESTION,
  KID_RESTAURANTS,
  MEETING_BRIEF,
  PARTY_PLAN,
  PLAY_DATE_CALENDAR_CARD,
  PLAY_DATE_CONFIRM,
  PLAY_DATE_CONTACT,
  PLAY_DATE_SCHEDULE_CARD,
  PLAY_DATE_SUGGESTIONS,
  PLAY_DATE_THREAD_ASK,
  PLAY_DATE_THREAD_FREE,
  PARTY_THEMES,
  PERSONAS,
  RUNDOWNS,
  SEMESTER_PLAN,
  STAY_IN_MESSAGES,
  STAY_IN_SUGGESTION,
  STUDY_NOTEBOOK,
  VOICE_UPDATE,
  WEEKEND_RESPONSE,
  type ChatBubble,
  type MessagesSuggestion,
  type RestaurantResult,
  type Persona,
  type ResponseContent,
} from "@/components/kiosk/types";
import TypingLines from "@/components/kiosk/TypingLines";
import RundownScreen from "@/components/kiosk/RundownScreen";
import IntroScreen from "@/components/kiosk/IntroScreen";
import PersonaCompleteScreen from "@/components/kiosk/PersonaCompleteScreen";
import RotatingChoiceScreen from "@/components/kiosk/RotatingChoiceScreen";
import FridayNightChoiceScreen from "@/components/kiosk/FridayNightChoiceScreen";
import TaskAutomationResponse from "@/components/kiosk/TaskAutomationResponse";
import GoOutResponse, { GO_OUT_CUE_DELAY_MS } from "@/components/kiosk/GoOutResponse";
import PlayDateOverlay from "@/components/kiosk/PlayDateOverlay";
import VoiceCapture from "@/components/kiosk/VoiceCapture";
import MessagesScene from "@/components/kiosk/MessagesScene";
import DinnerPlanResponse from "@/components/kiosk/DinnerPlanResponse";
import DinnerReservation from "@/components/kiosk/DinnerReservation";
import MeetingBriefResponse from "@/components/kiosk/MeetingBriefResponse";
import SemesterPlanResponse from "@/components/kiosk/SemesterPlanResponse";
import StudyNotebook from "@/components/kiosk/StudyNotebook";
import ScrollPattern from "@/components/kiosk/patterns/ScrollPattern";
import { BackButton, GradientPillButton, PulseRings, useThinkingPhase } from "@/components/kiosk/shared";

type Stage = "intro" | "landing" | "rundown" | "fridayNightChoice" | "cityChoice" | "partyChoice" | "complete" | "idle" | "typed" | "response";

// which built demo the compose bar / response area are currently playing
type DemoId = "weekend" | "fridayNight" | "goOut" | "bandTour" | "semester" | "notebook" | "meeting" | "dinner" | "city" | "party" | "playDate" | "dinnerPlan" | "voice";

// pill id -> the demo it plays; every other pill renders disabled on the rundown screen
const PILL_DEMOS: Record<string, DemoId> = {
  "friends-weekend": "weekend",
  "band-tour": "bandTour",
  "study-semester": "semester",
  "study-notebook": "notebook",
  "partnerships-vp": "meeting",
  "saturday-dinner": "dinner",
  "play-date": "playDate",
  "tonight-dinner": "dinnerPlan",
  "voice-update": "voice",
  // "friday-night" is deliberately absent — it routes through the fridayNightChoice
  // screen instead, which sets activeDemo to "fridayNight" or "goOut" itself
};

// demos that are a text-generation answer (rendered by ScrollPattern)
// rather than the friday-night agentic task flow, keyed by the same DemoId
const RESPONSE_CONTENT_BY_DEMO: Partial<Record<DemoId, ResponseContent>> = {
  weekend: WEEKEND_RESPONSE,
  bandTour: BAND_TOUR_RESPONSE,
  party: PARTY_PLAN,
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
  weekend: WEEKEND_RESPONSE.promptLines,
  fridayNight: FRIDAY_NIGHT_TASK.promptLines,
  goOut: GO_OUT_SEARCH.promptLines,
  bandTour: BAND_TOUR_RESPONSE.promptLines,
  semester: SEMESTER_PLAN.promptLines,
  // typed into the notebook's own input, not the Ask Gemini bar (see StudyNotebook)
  notebook: [STUDY_NOTEBOOK.setupPrompt],
  meeting: MEETING_BRIEF.promptLines,
  dinner: DINNER_RESERVATION.promptLines,
  // the city flow's prompt names the city, so it comes from the picked guide instead —
  // see `promptLines` below. This entry is only the fallback before one is picked.
  city: [],
  playDate: KID_RESTAURANTS.promptLines,
  dinnerPlan: DINNER_PLAN.answer.promptLines,
  // spoken, not typed — the Ask Gemini bar never comes up in this flow
  voice: [],
  party: PARTY_PLAN.promptLines,
};

// Demos whose answer takes the frame once it lands, so the compose bar parks for the rest of
// the flow. (The semester demo parks from the moment its prompt is sent — see below.)
const ANSWER_DEMOS: ReadonlySet<DemoId> = new Set<DemoId>(["goOut", "bandTour", "weekend", "dinner", "city", "party", "playDate", "dinnerPlan"]);

// A file attached to the prompt, shown as a chip at the top of the compose box.
// A file attaches as a named chip; a photo attaches as the photo, cropped square, the way
// an image sits in a compose box rather than being described in words.
type ComposeAttachment = { image: string; name?: string };
const ATTACHMENT_BY_DEMO: Partial<Record<DemoId, ComposeAttachment>> = {
  weekend: { name: "NYC weekend preferences", image: "/v81-image-assets-inuse/assets/products/sheets.png" },
  dinnerPlan: { image: "/v81-image-assets-inuse/assets/ph-fridge.jpg" },
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
// matches the typed text's own text-[1.4cqw] leading-[2.2cqw] classes
const COMPOSE_LINE_HEIGHT_CQW = 2.2;
// the multi-line layout's own padding/gap/toolbar — see the compose box's JSX below; kept as
// named constants (rather than re-measuring) since they're values this file itself sets, not
// values coming from unrelated content. Spacing is the design's (Screenshot 2026-09-24 at
// 9.45.25 PM): a roomier inset than the box first had, and Send at full size.
const MULTILINE_PT_CQW = 2.2;
const MULTILINE_GAP_CQW = 1.2;
const MULTILINE_TOOLBAR_ROW_CQW = 4.4; // matches the toolbar row's tallest item, the Send button (h-[4.4cqw])
const MULTILINE_PB_CQW = 1.9;
const CHROME_CQW = MULTILINE_PT_CQW + MULTILINE_GAP_CQW + MULTILINE_TOOLBAR_ROW_CQW + MULTILINE_PB_CQW;
// an attached file's chip rides above the prompt: its own height, and the gap below it. With
// a chip the box's top inset tightens to the chip's own (ATTACHMENT_PT_CQW), as drawn.
const ATTACHMENT_CHIP_CQW = 4.1;
const ATTACHMENT_GAP_CQW = 1.2;
const ATTACHMENT_PT_CQW = 1.5;
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
function PickPrompt({ active, label }: { active: boolean; label: string }) {
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
      {label}
    </div>
  );
}

/** The dismiss dot on an attachment — inert, like everything else in the compose box. */
function CloseDot() {
  return (
    <span className="flex h-[2cqw] w-[2cqw] shrink-0 items-center justify-center rounded-full bg-white text-[#1c1c1c]">
      <svg viewBox="0 0 24 24" className="h-[1.2cqw] w-[1.2cqw]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        <path d="M7 7l10 10M17 7L7 17" />
      </svg>
    </span>
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
  // the kiosk opens on the intro once, and only on first load: every way back from here
  // goes to the picker, never to this again
  const [stage, setStage] = useState<Stage>("intro");
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
  // The play date's own beats. `playDateCard` is which of Gemini's two calendar cards is
  // open — checking the Saturday, or confirming the event it wrote.
  const [playDateFree, setPlayDateFree] = useState(false);
  const [playDatePick, setPlayDatePick] = useState<RestaurantResult | null>(null);
  const [playDateCard, setPlayDateCard] = useState<"none" | "schedule" | "calendar">("none");
  // The voice update's beats: listening, then holding the message Gemini wrote, then sent.
  const [voicePhase, setVoicePhase] = useState<"idle" | "recording" | "draft">("idle");
  const [voiceSent, setVoiceSent] = useState(false);
  // The rundown pill that started the current flow, and the pills whose flows have been
  // finished this visit. A visitor working through one persona's menu sees what they've
  // done; going home to the persona picker is starting over, so it clears them.
  const [activePill, setActivePill] = useState<string | null>(null);
  // which city "Explore a new city" was answered for
  const [cityId, setCityId] = useState<string | null>(null);
  const [completedPills, setCompletedPills] = useState<ReadonlySet<string>>(() => new Set());

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

  const showIntro = stage === "intro";
  const showLanding = stage === "landing";
  const showRundown = stage === "rundown";
  const showFridayNightChoice = stage === "fridayNightChoice";
  const showCityChoice = stage === "cityChoice";
  const showPartyChoice = stage === "partyChoice";
  const showComplete = stage === "complete";
  const showChat =
    !showIntro &&
    !showLanding &&
    !showRundown &&
    !showFridayNightChoice &&
    !showCityChoice &&
    !showPartyChoice &&
    !showComplete;
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

  // A prompt with an attachment opens straight into the multi-line box the moment typing
  // starts: the chip needs the room, and the prompt then types in underneath it.
  const attachment = ATTACHMENT_BY_DEMO[activeDemo];
  const multiLine = multiLineLatched || (!!attachment && hasStartedTyping);
  const composeHeightCqw = multiLine
    ? CHROME_CQW +
      liveTextHeightCqw +
      (attachment ? ATTACHMENT_CHIP_CQW + ATTACHMENT_GAP_CQW + ATTACHMENT_PT_CQW - MULTILINE_PT_CQW : 0)
    : 7.33;

  // Both friday-night branches open on their own group chat instead of the generic hero,
  // and now stay on it through the response — Gemini's answer floats over the thread
  // rather than replacing it. Stay in is the only one that eventually leaves.
  const showMessagesScene =
    (activeDemo === "fridayNight" ||
      activeDemo === "goOut" ||
      activeDemo === "playDate" ||
      activeDemo === "voice") &&
    (showHero || composeExpanded || (showResponse && chatVisibleInResponse));

  // the city guides all share one demo id, so which one plays is the picked city's
  const cityGuide = cityId ? CITY_GUIDES[cityId] : undefined;
  const responseContent = activeDemo === "city" ? cityGuide : RESPONSE_CONTENT_BY_DEMO[activeDemo];
  const promptLines = activeDemo === "city" && cityGuide ? cityGuide.promptLines : PROMPT_LINES_BY_DEMO[activeDemo];

  // go out's drafted plan, plus the group's answers, appended to the thread once a result
  // is picked. Memoised because AnimatedThread keys its in-flight timer off this array's
  // identity — a fresh array each render would restart the message it's mid-way through.
  const messagesForScene = useMemo(() => {
    // the play date's thread grows a beat at a time rather than being one fixed list
    if (activeDemo === "playDate") {
      if (playDatePick) {
        return [
          ...PLAY_DATE_THREAD_FREE,
          { kind: "outgoing" as const, text: playDatePick.draftText },
          ...PLAY_DATE_CONFIRM,
        ];
      }
      return playDateFree ? PLAY_DATE_THREAD_FREE : PLAY_DATE_THREAD_ASK;
    }
    // the voice update's thread gains the message once it is actually sent
    if (activeDemo === "voice") {
      return voiceSent
        ? [...VOICE_UPDATE.opening, { kind: "outgoing" as const, text: VOICE_UPDATE.message, instant: true }]
        : VOICE_UPDATE.opening;
    }
    const base = MESSAGES_BY_DEMO[activeDemo] ?? STAY_IN_MESSAGES;
    // guarded on the demo as well as the pick: the two branches are separate conversations,
    // so go out's drafted plan must never turn up appended to stay in's thread
    if (activeDemo !== "goOut" || !goOutPick) return base;
    return [...base, { kind: "outgoing" as const, text: goOutPick.draftText }, ...GO_OUT_SEARCH.replies];
  }, [activeDemo, goOutPick, playDateFree, playDatePick, voiceSent]);

  // The messaging app's own RCS field is part of the phone, so it stays put the whole time
  // the chat is up. Gemini's box doesn't trade places with it — it waits parked below the
  // frame until the suggestion chip is tapped, then slides up and sits *on top of* it for
  // the rest of the flow. The RCS field is the wider of the two, so its ends stay visible
  // either side of Gemini's pill; that overlap is the source design's, not an accident.
  //
  // The semester demo and the meeting brief park it for their whole answer rather than for a
  // single beat: once the prompt is sent each is a reasoning rail and then a full-bleed Google
  // app, and the source design shows no compose bar for any of it. Leaving it up would also squeeze the
  // rail, which needs the band the bar sits in to finish inside the frame.
  //
  // The answer demos park it as their content lands. In go out the only thing left to do is
  // pick a restaurant, so the band belongs to the "tap on your chosen restaurant" prompt; the
  // band tour's and the weekend's answers are the end of their flows. Nothing later in any of
  // them asks Gemini anything, so the bar doesn't come back — and an answer that scrolls has
  // the whole frame rather than running under a bar parked over its last two lines. Timed off
  // the same thinking beat the answers reveal on, so the bar leaves as the content lands.
  const { contentShown: resultsUp } = useThinkingPhase(showResponse && ANSWER_DEMOS.has(activeDemo));
  const goOutResultsUp = resultsUp && activeDemo === "goOut";
  // the play date's results are the same answer, so they earn the same "tap one" prompt
  const pickResultsUp = resultsUp && (activeDemo === "goOut" || activeDemo === "playDate");
  const pickedResult = activeDemo === "playDate" ? playDatePick : goOutPick;
  // The study notebook parks it for the whole demo: the notebook has an input of its own.
  const composeParked =
    (showMessagesScene && showHero) ||
    (showResponse && (activeDemo === "semester" || activeDemo === "notebook" || activeDemo === "meeting")) ||
    resultsUp;
  // ...and the pick prompt comes last, a beat after the answer's scroll cue, so results,
  // cue and prompt each get their own moment instead of landing as one
  const [pickPromptDue, setPickPromptDue] = useState(false);
  useEffect(() => {
    if (!pickResultsUp) return;
    const t = setTimeout(() => setPickPromptDue(true), GO_OUT_CUE_DELAY_MS + PICK_PROMPT_AFTER_CUE_MS);
    return () => {
      clearTimeout(t);
      setPickPromptDue(false);
    };
  }, [pickResultsUp]);
  const showPickPrompt = pickPromptDue && pickResultsUp && !pickedResult;

  // Stable identities on purpose: the response components hold these in effect dependency
  // arrays alongside their own timers, so a fresh closure each render would tear down and
  // restart the timer every render and the sequence would never advance.
  const handleDemoComplete = useCallback(() => setDemoComplete(true), []);
  // the play date ends on its calendar card rather than on the answer, so the way out
  // arrives with it
  useEffect(() => {
    if (playDateCard === "calendar") setDemoComplete(true);
  }, [playDateCard]);
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

  // stable, because IntroScreen holds it in an effect that owns the run's timers
  const handleIntroDone = useCallback(() => setStage("landing"), []);

  const goHome = () => {
    setCompletedPills(new Set());
    setStage("landing");
  };

  // a flow counts as finished when the visitor takes its way out, which only appears once
  // it has played through — and that way out leads back to the menu it was started from
  const handleBackToRundown = () => {
    const done = activePill ? new Set(completedPills).add(activePill) : completedPills;
    setCompletedPills(done);
    // when every flow on this rundown has been played there is no rundown left to go back
    // to — the persona's day is over, and that screen is where it ends
    const pills = RUNDOWNS[rundownPersona.id]?.pills ?? [];
    const allDone = pills.filter((pill) => pill.active).every((pill) => done.has(pill.id));
    setStage(allDone ? "complete" : "rundown");
  };

  const handlePillSelect = (pillId: string) => {
    setActivePill(pillId);
    // Friday night now branches into two demos — route through the choice screen instead
    // of straight into the (only-built) stay-in flow
    if (pillId === "friday-night") {
      setStage("fridayNightChoice");
      return;
    }
    // "Explore a new city" branches per city rather than into one flow, so it routes
    // through its own choice screen the same way friday night does
    if (pillId === "new-city") {
      setStage("cityChoice");
      return;
    }
    // and the parent's party branches per theme, the same way
    if (pillId === "party") {
      setStage("partyChoice");
      return;
    }
    const demo = PILL_DEMOS[pillId];
    // the voice flow lives entirely in its thread, so it opens straight onto it
    if (demo === "voice") {
      resetVoice();
      setActiveDemo(demo);
      setStage("idle");
      return;
    }
    // like go out, a re-run has to start from a clean thread
    if (demo === "playDate") {
      resetPlayDate();
      setActiveDemo(demo);
      setStage("idle");
      return;
    }
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
  const resetVoice = () => {
    setVoicePhase("idle");
    setVoiceSent(false);
  };

  const resetPlayDate = () => {
    setPlayDateFree(false);
    setPlayDatePick(null);
    setPlayDateCard("none");
  };

  const handleFridayNightChoice = (choice: "goOut" | "stayIn") => {
    setGoOutPick(null);
    setChatVisibleInResponse(true);
    setActiveDemo(choice === "stayIn" ? "fridayNight" : "goOut");
    setStage("idle");
  };

  // every city is the same answer with its own copy, map and photos, so one demo carries
  // them all and the picked city says which guide to read
  const handleCitySelect = (cityId: string) => {
    setCityId(cityId);
    setActiveDemo("city");
    setStage("typed");
  };

  // The theme picks the menu's backdrop, not the answer — all three play the same plan, as
  // the design has it — so nothing but the route is needed here.
  const handlePartySelect = (themeId: string) => {
    void themeId;
    setActiveDemo("party");
    setStage("typed");
  };

  // The play date is one conversation with three chips in it, so which one shows — and what
  // tapping it does — is the flow's state rather than a fixed per-demo value.
  // the closing card names the lunch that was actually picked
  const playDateCalendarCard = useMemo(
    () => ({
      ...PLAY_DATE_CALENDAR_CARD,
      lines: PLAY_DATE_CALENDAR_CARD.lines.map((line) =>
        line.replace("PLACE", playDatePick?.name ?? "lunch"),
      ),
    }),
    [playDatePick],
  );

  // The voice flow's two taps: the mic starts it, the send arrow ends it. Everything
  // between — the dictation arriving, the filler greying out and leaving — plays on its own,
  // which is the pattern every other flow follows.
  const voiceState = useMemo(
    () =>
      activeDemo === "voice" && !voiceSent
        ? {
            mode: voicePhase,
            draft: VOICE_UPDATE.message,
            onMic: () => setVoicePhase("recording"),
            onSend: () => setVoiceSent(true),
          }
        : undefined,
    [activeDemo, voicePhase, voiceSent],
  );

  // sending it is the end of the flow
  useEffect(() => {
    if (voiceSent) setDemoComplete(true);
  }, [voiceSent]);

  // Most demos finish inside the response layer; the voice update finishes in its thread,
  // which is stage "idle" — so the way out follows the demo, not the stage.
  // ...and the ending belongs to the chat: on any screen after it — the rundown, the
  // persona's completed day — it would just be a second button in the same corner
  const showEnding = demoComplete && showChat && (showResponse || activeDemo === "voice");

  const playDateHandedBack = activeDemo === "playDate" && !!playDatePick;
  // go out offers four results and the pick is the whole point; the play date offers three
  // inside a conversation, so it asks for less
  const pickPromptLabel = activeDemo === "playDate" ? "Tap a restaurant" : "Tap on your chosen restaurant";

  const playDateSuggestion = useMemo(() => {
    if (activeDemo !== "playDate") return undefined;
    if (playDatePick) {
      return { show: showResponse, title: PLAY_DATE_SUGGESTIONS.picked, onClick: () => setPlayDateCard("calendar") };
    }
    if (playDateFree) {
      return { show: showHero, title: PLAY_DATE_SUGGESTIONS.free, onClick: () => setStage("typed") };
    }
    return { show: showHero, title: PLAY_DATE_SUGGESTIONS.ask, onClick: () => setPlayDateCard("schedule") };
  }, [activeDemo, playDatePick, playDateFree, showHero, showResponse]);

  // "Yes, I'm free" is the one message the visitor sends themselves; it closes the card and
  // the thread carries on from there.
  const handlePlayDateFree = () => {
    setPlayDateCard("none");
    setPlayDateFree(true);
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
          <RundownScreen persona={rundownPersona} completed={completedPills} onBack={goHome} onSelectPill={handlePillSelect} />
        </div>

        {/* the intro, above everything: it is what the kiosk opens on */}
        <div
          className="absolute inset-0 z-30 transition-opacity duration-700"
          style={{ opacity: showIntro ? 1 : 0, pointerEvents: showIntro ? "auto" : "none" }}
        >
          <IntroScreen onDone={handleIntroDone} />
        </div>

        {/* the end of a persona's day: every flow played, nothing left on the rundown */}
        <div
          className="absolute inset-0 z-10 transition-opacity duration-500"
          style={{ opacity: showComplete ? 1 : 0, pointerEvents: showComplete ? "auto" : "none" }}
        >
          <PersonaCompleteScreen persona={rundownPersona} onRestart={goHome} />
        </div>

        {/* friday night branches into two demos — this picks which one before routing in */}
        <div
          className="absolute inset-0 z-10 transition-opacity duration-500"
          style={{ opacity: showFridayNightChoice ? 1 : 0, pointerEvents: showFridayNightChoice ? "auto" : "none" }}
        >
          <FridayNightChoiceScreen onBack={() => setStage("rundown")} onSelect={handleFridayNightChoice} />
        </div>

        {/* "Explore a new city" branches per city — five of them, so it gets its own screen
            rather than a fork. The backdrop rotates through the cities on offer. */}
        <div
          className="absolute inset-0 z-10 transition-opacity duration-500"
          style={{ opacity: showCityChoice ? 1 : 0, pointerEvents: showCityChoice ? "auto" : "none" }}
        >
          <RotatingChoiceScreen
            title="Explore a new city"
            options={CITY_CHOICES}
            onBack={() => setStage("rundown")}
            onSelect={handleCitySelect}
          />
        </div>

        {/* the parent's party branches per theme, on the same rotating screen */}
        <div
          className="absolute inset-0 z-10 transition-opacity duration-500"
          style={{ opacity: showPartyChoice ? 1 : 0, pointerEvents: showPartyChoice ? "auto" : "none" }}
        >
          <RotatingChoiceScreen
            title="Plan a kid’s birthday party"
            options={PARTY_THEMES}
            onBack={() => setStage("rundown")}
            onSelect={handlePartySelect}
          />
        </div>

        {/* The way out of a demo. The landing screen is home so it needs none, and the
            rundown and the friday-night choice draw their own (theirs step back one screen
            rather than all the way out). This is for everything after that: once a demo is
            playing there is otherwise nothing to tap until it finishes, which on a kiosk
            means a visitor who changes their mind is stuck watching an animation. */}
        {showChat && <BackButton onClick={goHome} />}

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
                suggestion={playDateSuggestion ?? (
                  SUGGESTION_BY_DEMO[activeDemo]
                    ? { show: showHero, onClick: handleSuggestionTap, ...SUGGESTION_BY_DEMO[activeDemo]! }
                    : undefined
                )}
                thread={
                  activeDemo === "playDate"
                    ? PLAY_DATE_CONTACT
                    : activeDemo === "voice"
                      ? VOICE_UPDATE.thread
                      : undefined
                }
                voice={voiceState}
                showComposeBar={showMessagesScene}
                // Gemini holds the foreground from the chip tap onward — first its compose
                // bar, then its answer panel — so the chat behind it steps back for both.
                // Picking a restaurant closes that panel and hands the thread back, so the
                // drafted plan and the replies land at full brightness.
                // Gemini holds the foreground whenever one of its own surfaces is up — the
                // compose bar, an answer panel, a calendar card — so the chat steps back for
                // all three, and comes back when the thread is handed the result.
                dimmed={
                  (showMessagesScene && !showHero && !pickedResult) ||
                  (activeDemo === "playDate" && playDateCard !== "none")
                }
              />
            </div>

            {/* the voice capture, over the thread: the dictation, then Gemini's edit of it */}
            {/* gated on the chat being the screen: these are the app's own surfaces, and a
                surface left mounted over a screen it does not belong to goes on catching taps */}
            {activeDemo === "voice" && showChat && voicePhase === "recording" && (
              <VoiceCapture
                transcript={VOICE_UPDATE.transcript}
                show
                onSettled={() => setVoicePhase("draft")}
              />
            )}

            {/* Gemini's two calendar cards, over the thread: the free Saturday, then the
                event it wrote. Both belong to the messaging app's surface, not to an
                answer, so they live beside the scene rather than in the response layer. */}
            {activeDemo === "playDate" && showChat && (
              <>
                <PlayDateOverlay
                  card={PLAY_DATE_SCHEDULE_CARD}
                  show={playDateCard === "schedule"}
                  onAction={handlePlayDateFree}
                />
                <PlayDateOverlay card={playDateCalendarCard} show={playDateCard === "calendar"} />
              </>
            )}

            {/* response — the prompt bubble appears immediately, an inline "thinking" beat
                follows, then the rest staggers in; which demo plays depends on which
                rundown pill was tapped */}
            <div
              className="absolute inset-0"
              style={{
                opacity: showResponse ? 1 : 0,
                // the play date hands the thread back once a restaurant is picked: its
                // answer is gone, and this layer must stop covering the chip underneath it
                pointerEvents: showResponse && !playDateHandedBack ? "auto" : "none",
              }}
            >
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
              ) : activeDemo === "dinner" ? (
                <DinnerReservation
                  // remounted per run: the booking it holds is per-run state
                  key={showResponse ? "run" : "idle"}
                  content={DINNER_RESERVATION}
                  active={showResponse}
                  onComplete={handleDemoComplete}
                />
              ) : activeDemo === "meeting" ? (
                <MeetingBriefResponse
                  // remounted per run, like the semester demo: all of its state is per-run
                  key={showResponse ? "run" : "idle"}
                  content={MEETING_BRIEF}
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
              ) : activeDemo === "dinnerPlan" ? (
                <DinnerPlanResponse
                  // remounted per run: the dinner it picked and the order are per-run state
                  key={showResponse ? "run" : "idle"}
                  content={DINNER_PLAN}
                  active={showResponse}
                  onComplete={handleDemoComplete}
                />
              ) : activeDemo === "playDate" ? (
                <GoOutResponse
                  content={KID_RESTAURANTS}
                  active={showResponse}
                  onChoose={setPlayDatePick}
                />
              ) : activeDemo === "goOut" ? (
                <GoOutResponse
                  content={GO_OUT_SEARCH}
                  active={showResponse}
                  onComplete={handleDemoComplete}
                  onChoose={setGoOutPick}
                />
              ) : responseContent ? (
                // the messaging flows answer inside their own thread, so they reach here
                // with nothing for the text pattern to render
                <ScrollPattern
                  content={responseContent}
                  active={showResponse}
                  onComplete={handleDemoComplete}
                />
              ) : null}
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
              (3) multiLine — once the text overflows that narrow slot (or straight away, when
                  the prompt carries an attachment), the box commits to the taller layout: an
                  attachment chip on top, the text below it, a bottom toolbar (+, Send), and the
                  outer box expands to fit — growing only as fast as the text actually does,
                  since the text slot below sizes to its own content, never stretched.
              The mic belongs to an empty box; it goes the moment typing starts. */}
          <div
            className={`absolute inset-0 flex text-left ${
              multiLine ? "flex-col justify-start px-[1.9cqw] pb-[1.9cqw]" : "flex-row items-center gap-[1.65cqw] px-[2.9cqw]"
            }`}
            style={multiLine ? { paddingTop: `${attachment ? ATTACHMENT_PT_CQW : MULTILINE_PT_CQW}cqw` } : undefined}
          >
            {!multiLine && <img src="/gemini/icon-plus.svg" alt="" className="h-[2.57cqw] w-[2.57cqw] shrink-0" />}

            {multiLine && attachment && (
              attachment.name ? (
                <div
                  className="-ml-[0.7cqw] flex max-w-[25cqw] shrink-0 items-center gap-[0.8cqw] self-start rounded-full bg-[#383838] pl-[1.2cqw] pr-[0.8cqw] [animation:fade-in-up_350ms_ease-out]"
                  style={{ height: `${ATTACHMENT_CHIP_CQW}cqw`, marginBottom: `${ATTACHMENT_GAP_CQW}cqw` }}
                >
                  <img src={attachment.image} alt="" className="h-[2cqw] w-[2cqw] shrink-0" />
                  <span className="min-w-0 truncate text-[1.55cqw] font-medium text-white">{attachment.name}</span>
                  <CloseDot />
                </div>
              ) : (
                // a photo needs no label — it is the thumbnail, with the same dismiss dot
                // riding its top-right corner
                <div
                  className="relative shrink-0 self-start [animation:fade-in-up_350ms_ease-out]"
                  style={{
                    height: `${ATTACHMENT_CHIP_CQW}cqw`,
                    width: `${ATTACHMENT_CHIP_CQW}cqw`,
                    marginBottom: `${ATTACHMENT_GAP_CQW}cqw`,
                  }}
                >
                  <img src={attachment.image} alt="" className="h-full w-full rounded-[1cqw] object-cover" />
                  <span className="absolute -right-[0.5cqw] -top-[0.5cqw]">
                    <CloseDot />
                  </span>
                </div>
              )
            )}

            {/* sizes to its own content in both layouts — never flex-1/flex-grow (which would
                stretch it to fill the box's current height and feed a runaway measurement
                loop) and always shrink-0 (without it, the default flex-shrink:1 lets this get
                squeezed to fit the box's still-stale height every render, which freezes its
                own rendered size — and since ResizeObserver only fires on that, not on
                scrollHeight, the measurement stops updating and new text just clips) */}
            <div
              ref={liveTextRef}
              className={`min-w-0 overflow-hidden text-[1.4cqw] leading-[2.2cqw] text-white ${multiLine ? "w-full shrink-0 px-[0.6cqw]" : "flex-1"}`}
            >
              {hasStartedTyping ? (
                <TypingLines lines={promptLines} active={composeExpanded} tickMs={TYPING_TICK_MS} onDone={() => setTypingDone(true)} />
              ) : (
                <p className="whitespace-nowrap text-muted">Ask Gemini</p>
              )}
            </div>

            {!multiLine ? (
              <div className="flex shrink-0 items-center gap-[0.92cqw]">
                {!hasStartedTyping && <img src="/gemini/icon-mic.svg" alt="" className="h-[2.57cqw] w-[2.57cqw]" />}
                {hasStartedTyping ? (
                  <PulseRings active={typingDone}>
                    <button
                      type="button"
                      onClick={() => setStage("response")} style={{ pointerEvents: showChat ? "auto" : "none" }}
                      className="flex h-[4.4cqw] w-[4.4cqw] items-center justify-center rounded-full bg-[#1f3b9b]"
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
              <div className="flex shrink-0 items-center justify-between" style={{ marginTop: `${MULTILINE_GAP_CQW}cqw` }}>
                <img src="/gemini/icon-plus.svg" alt="" className="ml-[0.6cqw] h-[2.57cqw] w-[2.57cqw]" />
                <PulseRings active={typingDone}>
                  <button
                    type="button"
                    onClick={() => setStage("response")} style={{ pointerEvents: showChat ? "auto" : "none" }}
                    className="flex h-[4.4cqw] w-[4.4cqw] items-center justify-center rounded-full bg-[#1f3b9b]"
                  >
                    <img src="/gemini/icon-send.svg" alt="Send" className="h-[1.8cqw] w-[1.8cqw]" />
                  </button>
                </PulseRings>
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
          <PickPrompt active={showPickPrompt} label={pickPromptLabel} />
        </div>

        {/* the demo's ending — floated into opposite bottom corners of the frame. The
            entrance animation always lives on a wrapper, never on the button itself, so it
            can't fight anything the button (or its rings) animate on `transform`. */}
        {showEnding && (
          <>
            <div className="absolute bottom-[2.5cqw] right-[2.87cqw] z-20 [animation:fade-in-up_400ms_ease-out]">
              <BackToRundownButton onClick={handleBackToRundown} />
            </div>
            {/* the dinner flow ends on the widget setup screen, which carries a QR of its
                own — one corner prompt beside it would just be a second one */}
            {activeDemo !== "dinner" && (
              <div className="absolute bottom-[2.5cqw] left-[2.87cqw] z-20 [animation:fade-in-up_400ms_ease-out]">
                <QrPrompt />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
