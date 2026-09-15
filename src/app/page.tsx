"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PATTERNS } from "@/components/kiosk/patterns";
import {
  BAND_TOUR_RESPONSE,
  FRIDAY_NIGHT_TASK,
  PERSONAS,
  RUNDOWNS,
  WEEKEND_RESPONSE,
  type Persona,
  type PatternId,
  type ResponseContent,
} from "@/components/kiosk/types";
import TypingLines from "@/components/kiosk/TypingLines";
import LandingScreen from "@/components/kiosk/LandingScreen";
import RundownScreen from "@/components/kiosk/RundownScreen";
import TaskAutomationResponse from "@/components/kiosk/TaskAutomationResponse";
import MessagesScene, { MessagesTopBar } from "@/components/kiosk/MessagesScene";

type Stage = "landing" | "rundown" | "idle" | "typed" | "response";

// which built demo the compose bar / response area are currently playing
type DemoId = "weekend" | "fridayNight" | "bandTour";
const DEMO_IDS: DemoId[] = ["weekend", "fridayNight", "bandTour"];

// pill id -> the demo it plays; every other pill renders disabled on the rundown screen
const PILL_DEMOS: Record<string, DemoId> = {
  "friends-weekend": "weekend",
  "friday-night": "fridayNight",
  "band-tour": "bandTour",
};

// demos that are a text-generation answer (rendered via the paginated/measured-column patterns)
// rather than the friday-night agentic task flow, keyed by the same DemoId
const RESPONSE_CONTENT_BY_DEMO: Partial<Record<DemoId, ResponseContent>> = {
  weekend: WEEKEND_RESPONSE,
  bandTour: BAND_TOUR_RESPONSE,
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
  bandTour: BAND_TOUR_RESPONSE.promptLines,
};

// the expanded compose box's height must fit each demo's own prompt — a fixed height sized
// for the weekend prompt leaves a visible gap above the toolbar row for a shorter one, and a
// hardcoded per-demo height silently breaks again the next time either prompt's text changes.
// So only the weekend height is a tuned constant; every other demo's height is derived at
// runtime from its own measured (naturally-wrapped) text height plus the weekend box's own
// "chrome" (padding + toolbar), backed out from that one known-good calibration. All demos
// share the same bottom edge (33.85 + 19.42 = 53.27cqw) so the box grows upward from there.
const WEEKEND_COMPOSE_HEIGHT_CQW = 19.42;
const COMPOSE_TOP_CQW = 33.85;
const COMPOSE_BOTTOM_CQW = COMPOSE_TOP_CQW + WEEKEND_COMPOSE_HEIGHT_CQW;
// matches the typed text container: compose width minus its own horizontal padding (2.2cqw each side)
const COMPOSE_TEXT_WIDTH_CQW = 35.43 - 2 * 2.2;

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

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  const [pattern, setPattern] = useState<PatternId>("paginated");
  const [rundownPersona, setRundownPersona] = useState<Persona>(DEFAULT_RUNDOWN_PERSONA);
  const [activeDemo, setActiveDemo] = useState<DemoId>("weekend");

  const frameRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef<Partial<Record<DemoId, HTMLParagraphElement>>>({});
  const [composeHeightCqw, setComposeHeightCqw] = useState<Record<DemoId, number>>(
    Object.fromEntries(DEMO_IDS.map((id) => [id, WEEKEND_COMPOSE_HEIGHT_CQW])) as Record<DemoId, number>,
  );

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const weekendEl = measureRefs.current.weekend;
    if (!frame || !weekendEl) return;

    const measure = () => {
      const frameWidth = frame.getBoundingClientRect().width;
      if (!frameWidth) return;
      const pxToCqw = (px: number) => (px / frameWidth) * 100;
      // back the box's fixed "chrome" (padding + toolbar) out of the one calibrated height,
      // then any other demo's height is just that same chrome plus its own text height
      const chromeCqw = WEEKEND_COMPOSE_HEIGHT_CQW - pxToCqw(weekendEl.scrollHeight);
      const next = {} as Record<DemoId, number>;
      for (const id of DEMO_IDS) {
        const el = measureRefs.current[id];
        next[id] = id === "weekend" ? WEEKEND_COMPOSE_HEIGHT_CQW : chromeCqw + (el ? pxToCqw(el.scrollHeight) : 0);
      }
      setComposeHeightCqw(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  const showLanding = stage === "landing";
  const showRundown = stage === "rundown";
  const showChat = !showLanding && !showRundown;
  const composeExpanded = stage === "typed";
  const showHero = stage === "idle";
  const showResponse = stage === "response";
  // the friday-night demo opens on its own scene-setting group chat instead of the generic hero
  const showMessagesScene = activeDemo === "fridayNight" && (showHero || composeExpanded);

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
    const demo = PILL_DEMOS[pillId];
    if (demo) {
      setActiveDemo(demo);
      setStage("typed");
    } else {
      setStage("idle");
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col bg-neutral-950">
      {/* always available, outside the device frame — jumps back to the persona picker from anywhere */}
      <HomeButton onClick={() => setStage("landing")} />

      {/* response display pattern — only meaningful once you're actually inside a
          text-generation demo, not just whenever activeDemo happens to default to one
          (e.g. still on the landing/rundown screens before any demo has started) */}
      {showChat && activeDemo in RESPONSE_CONTENT_BY_DEMO && <PatternPicker pattern={pattern} onChange={setPattern} />}

      <div className="flex flex-1 items-center justify-center p-8">
        <div
          ref={frameRef}
          className="@container relative flex flex-col overflow-hidden rounded-[2.5cqw] border-[1.25cqw] border-[#646464] bg-black"
          style={{
            aspectRatio: "16 / 9",
            width: "min(100%, calc((100vh - 9rem) * 16 / 9))",
            maxHeight: "100%",
          }}
        >
          {/* hidden clones of each demo's typed prompt, at the same width/font as the real
              typed text — measured to size the compose box's expanded height to fit exactly */}
          <div className="pointer-events-none absolute opacity-0" style={{ width: `${COMPOSE_TEXT_WIDTH_CQW}cqw`, visibility: "hidden" }} aria-hidden>
            {DEMO_IDS.map((id) => (
              <p
                key={id}
                ref={(el) => {
                  if (el) measureRefs.current[id] = el;
                }}
                className="text-[1.4661cqw] leading-[1.9547cqw]"
              >
                {PROMPT_LINES_BY_DEMO[id].join(" ")}
              </p>
            ))}
          </div>

          {/* landing — persona picker, shown before the chat flow begins */}
          <div
            className="absolute inset-0 z-10 transition-opacity duration-500"
            style={{ opacity: showLanding ? 1 : 0, pointerEvents: showLanding ? "auto" : "none" }}
          >
            <LandingScreen onSelect={handlePersonaSelect} />
          </div>

          {/* rundown — the persona's personalized "here's your daily rundown" suggestion screen */}
          <div
            className="absolute inset-0 z-10 transition-opacity duration-500"
            style={{ opacity: showRundown ? 1 : 0, pointerEvents: showRundown ? "auto" : "none" }}
          >
            <RundownScreen persona={rundownPersona} onBack={() => setStage("landing")} onSelectPill={handlePillSelect} />
          </div>

          {/* ambient glow, anchored to the bottom edge behind everything in the chat flow */}
          <img
            src="/gemini/ph-glow.png"
            alt=""
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[38.49cqw] w-full object-cover transition-opacity duration-500"
            style={{ opacity: showChat ? 1 : 0 }}
          />

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
              <div className="flex items-center justify-between px-[2.87cqw] py-[1.88cqw]">
                <div className="flex items-center gap-[3cqw]">
                  <div className="flex flex-col justify-center gap-[0.43cqw]">
                    <div className="h-[0.18cqw] w-[1.62cqw] rounded-full bg-white" />
                    <div className="h-[0.18cqw] w-[1.62cqw] rounded-full bg-white" />
                  </div>
                  <div className="flex items-center gap-[0.6cqw]">
                    <span className="whitespace-nowrap text-[1.65cqw] text-white">Gemini</span>
                    <span className="whitespace-nowrap text-[1.65cqw] text-[#8c8c8c]">Flash</span>
                    <img src="/gemini/icon-chevron.svg" alt="" className="h-[0.43cqw] w-[0.85cqw]" />
                  </div>
                </div>

                <div className="flex items-center gap-[2.1cqw]">
                  <img src="/gemini/icon-newchat.svg" alt="New chat" className="h-[2.02cqw] w-[2.02cqw]" />
                  <div className="flex h-[2.57cqw] w-[2.57cqw] items-center justify-center rounded-full bg-[#00897b]">
                    <span className="text-[1.28cqw] font-medium text-white">R</span>
                  </div>
                </div>
              </div>
            )}

            {/* middle area — hero and the response occupy the same space */}
            <div className="relative min-h-0 flex-1">
              {/* hero — idle only, and only for demos with no scene-setting backdrop of their own */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-[1.25cqw] transition-opacity duration-500"
                style={{ opacity: showHero && !showMessagesScene ? 1 : 0, pointerEvents: showHero && !showMessagesScene ? "auto" : "none" }}
              >
                <img src="/gemini/ph-spark.png" alt="" className="h-[3.36cqw] w-[3.36cqw] object-cover" />
                <p className="whitespace-nowrap text-[2.93cqw] text-white">Where should we start?</p>
              </div>

              {/* the friday-night demo opens on its own scene-setting backdrop (a group chat)
                  instead of the generic hero, visible behind the compose bar until a response starts */}
              <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: showMessagesScene ? 1 : 0, pointerEvents: "none" }}>
                <MessagesScene active={showMessagesScene} />
              </div>

              {/* response — the prompt bubble appears immediately, an inline "thinking" beat
                  follows, then the rest staggers in; which demo plays depends on which
                  rundown pill was tapped */}
              <div className="absolute inset-0" style={{ opacity: showResponse ? 1 : 0, pointerEvents: showResponse ? "auto" : "none" }}>
                {activeDemo === "fridayNight" ? (
                  <TaskAutomationResponse content={FRIDAY_NIGHT_TASK} active={showResponse} onDone={() => setStage("rundown")} />
                ) : (
                  <ActivePattern content={RESPONSE_CONTENT_BY_DEMO[activeDemo]!} active={showResponse} />
                )}
              </div>
            </div>
          </div>

          {/* compose — morphs from the idle pill into the typed message box */}
          <div
            className="absolute left-1/2 z-20 overflow-hidden rounded-[3.665cqw] bg-[#1c1c1c] transition-[width,height,top,opacity] duration-500 ease-in-out"
            style={{
              transform: "translateX(-50%)",
              top: composeExpanded ? `${COMPOSE_BOTTOM_CQW - composeHeightCqw[activeDemo]}cqw` : "45.94cqw",
              width: composeExpanded ? "35.43cqw" : "31.77cqw",
              height: composeExpanded ? `${composeHeightCqw[activeDemo]}cqw` : "7.33cqw",
              opacity: showChat ? 1 : 0,
              pointerEvents: showChat ? "auto" : "none",
            }}
          >
            {/* idle: click target that kicks off the demo (no persona-specific pill was tapped, so default to the weekend demo) */}
            <button
              type="button"
              onClick={() => {
                setActiveDemo("weekend");
                setStage("typed");
              }}
              tabIndex={composeExpanded ? -1 : 0}
              aria-hidden={composeExpanded}
              className="absolute inset-0 flex items-center gap-[1.65cqw] px-[2.38cqw] transition-opacity duration-300"
              style={{ opacity: composeExpanded ? 0 : 1, pointerEvents: composeExpanded ? "none" : "auto" }}
            >
              <img src="/gemini/icon-plus.svg" alt="" className="h-[2.57cqw] w-[2.57cqw] shrink-0" />
              <span className="flex-1 whitespace-nowrap text-left text-[1.47cqw] text-[#9a9b9c]">Ask Gemini</span>
              <div className="flex shrink-0 items-center gap-[0.92cqw]">
                <img src="/gemini/icon-mic.svg" alt="" className="h-[2.57cqw] w-[2.57cqw]" />
                <div className="flex h-[4.4cqw] w-[4.4cqw] items-center justify-center rounded-full bg-[#192967]">
                  <img src="/gemini/icon-live.svg" alt="" className="h-[2.9cqw] w-[2.9cqw]" />
                </div>
              </div>
            </button>

            {/* typed: the resulting message + toolbar */}
            <div
              className="absolute inset-0 flex flex-col transition-opacity duration-300"
              style={{
                opacity: composeExpanded ? 1 : 0,
                transitionDelay: composeExpanded ? "150ms" : "0ms",
                pointerEvents: composeExpanded ? "auto" : "none",
              }}
            >
              <div className="flex-1 overflow-hidden px-[2.2cqw] pt-[2.1cqw] text-[1.4661cqw] leading-[1.9547cqw] text-white">
                <TypingLines lines={PROMPT_LINES_BY_DEMO[activeDemo]} active={composeExpanded} />
              </div>
              <div className="flex items-center justify-between px-[2.2cqw] pb-[2.1cqw]">
                <img src="/gemini/icon-plus.svg" alt="" className="h-[2.57cqw] w-[2.57cqw]" />
                <div className="flex items-center gap-[1.5cqw]">
                  <img src="/gemini/icon-mic.svg" alt="" className="h-[2.57cqw] w-[2.57cqw]" />
                  <button
                    type="button"
                    onClick={() => setStage("response")}
                    className="flex h-[2.62cqw] w-[2.62cqw] items-center justify-center rounded-full bg-[#1f3b9b]"
                  >
                    <img src="/gemini/icon-send.svg" alt="Send" className="h-[1.3cqw] w-[1.3cqw]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
