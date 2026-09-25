"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StudyNotebookContent } from "./types";
import { GradientPillButton, PulseRings, RisingDotsCue, useScrollCue, useScrolledOnce } from "./shared";

// the column every other answer sits in, so the notebook reads as the same kiosk
const COLUMN_CQW = 42;

// sampled from the design
const ACCENT = "#93b3f2"; // active tab underline, checked boxes
const PANEL = "#1e1f20"; // the input and the sources tray
const PANEL_EDGE = "#3c3d3f";
const ROW = "#292a2b";
const CITE = "#1c2963";
const STEP_NUMBER = "#3b3d40";

// prompts type at the compose bar's own pace; generated content streams faster, the way
// an answer outruns someone typing
const PROMPT_TICK_MS = 45;
const PROMPT_START_MS = 900;
const GENERATE_TICK_MS = 16;
const GENERATE_CHARS = 2;
// the sources land one at a time, each checking itself a beat after it appears
const SOURCE_BEAT_MS = 380;
// held on the fully loaded list before the notebook moves on to Chat
const SOURCES_SETTLE_MS = 1200;
// "Responding…" before the study guide starts to stream
const RESPOND_MS = 1300;
// after the guide's last word, before its source list and then the quiz button come in
const GUIDE_SOURCES_MS = 300;
const GUIDE_DONE_MS = 900;
const CUE_DELAY_MS = 900;

type Phase = "setup" | "loading" | "chatPrompt" | "answering" | "studio";
type Tab = "Sources" | "Chat" | "Studio";

const TAB_FOR_PHASE: Record<Phase, Tab> = {
  setup: "Sources",
  loading: "Sources",
  chatPrompt: "Chat",
  answering: "Chat",
  studio: "Studio",
};

/**
 * Counts characters out at a steady pace once `active`, from zero, after `startDelayMs`.
 * Several strings share one counter (see `slice`), so a block of generated content types
 * as one continuous stream — heading, then its body, then the next heading.
 */
function useTyped(total: number, active: boolean, { tickMs, chars = 1, startDelayMs = 0 }: { tickMs: number; chars?: number; startDelayMs?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => setN((v) => Math.min(total, v + chars)), tickMs);
    }, startDelayMs);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [active, total, tickMs, chars, startDelayMs]);
  return { n, done: n >= total };
}

/** The share of a shared typing counter that falls on each string, in order. */
function slice(texts: string[], n: number) {
  let offset = 0;
  return texts.map((t) => {
    const shown = Math.max(0, Math.min(t.length, n - offset));
    offset += t.length;
    return shown;
  });
}

function Caret() {
  return <span className="ml-[0.1em] inline-block h-[0.9em] w-[0.09em] translate-y-[0.12em] animate-pulse bg-current align-middle" />;
}

/** `text` typed up to `shown` characters, with the caret riding the write position until it's all out. */
function Typed({ text, shown }: { text: string; shown: number }) {
  return (
    <>
      {text.slice(0, shown)}
      {shown > 0 && shown < text.length && <Caret />}
    </>
  );
}

/**
 * "Build a study notebook" — a NotebookLM-style notebook ("Gemini Notebook") that the
 * student builds and studies from, in five beats that run on their own except where the
 * visitor has something real to do:
 *
 *   1. Sources, empty. The setup prompt types into the notebook's own input; tap Send.
 *   2. Sources load one by one, each checking itself as it lands, while the input says
 *      "Responding…". The notebook then moves itself to Chat.
 *   3. Chat. The exam prompt types in; tap Send.
 *   4. The study guide streams in, heading by heading, then its source list, then
 *      "Start the Biology quiz".
 *   5. Studio: a six-card flip quiz (tap to flip, arrows to move) and an Audio Overview
 *      whose play button types out the transcript. The demo counts as done on arrival.
 *
 * The tabs are the app's own chrome and only ever show where the notebook is — like the
 * Ask Gemini bar elsewhere in the demo, they're display, not navigation. Remounted per run
 * by page.tsx, so nothing here resets itself.
 */
export default function StudyNotebook({
  content,
  active,
  onComplete,
}: {
  content: StudyNotebookContent;
  active: boolean;
  onComplete?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const tab = TAB_FOR_PHASE[phase];

  // ---- 1. setup prompt ----
  const setup = useTyped(content.setupPrompt.length, active && phase === "setup", {
    tickMs: PROMPT_TICK_MS,
    startDelayMs: PROMPT_START_MS,
  });

  // ---- 2. sources: one beat to show a row, the next to check it ----
  const [sourceBeat, setSourceBeat] = useState(0);
  const lastBeat = content.sources.length * 2;
  useEffect(() => {
    if (phase !== "loading") return;
    if (sourceBeat < lastBeat) {
      const t = setTimeout(() => setSourceBeat((b) => b + 1), SOURCE_BEAT_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("chatPrompt"), SOURCES_SETTLE_MS);
    return () => clearTimeout(t);
  }, [phase, sourceBeat, lastBeat]);
  const sourcesShown = Math.min(content.sources.length, Math.ceil(sourceBeat / 2));
  const sourcesChecked = phase === "setup" ? 0 : phase === "loading" ? Math.floor(sourceBeat / 2) : content.sources.length;

  // ---- 3. chat prompt ----
  const chat = useTyped(content.chatPrompt.length, phase === "chatPrompt", {
    tickMs: PROMPT_TICK_MS,
    startDelayMs: 700,
  });

  // ---- 4. study guide ----
  const [responding, setResponding] = useState(false);
  useEffect(() => {
    if (phase !== "answering") return;
    const t = setTimeout(() => setResponding(true), RESPOND_MS);
    return () => clearTimeout(t);
  }, [phase]);
  const guideTexts = [content.guideTitle, ...content.guide.flatMap((item) => [item.heading, item.body])];
  const guide = useTyped(
    guideTexts.reduce((sum, t) => sum + t.length, 0),
    responding,
    { tickMs: GENERATE_TICK_MS, chars: GENERATE_CHARS },
  );
  const guideShown = slice(guideTexts, guide.n);
  const [guideSources, setGuideSources] = useState(false);
  const [guideDone, setGuideDone] = useState(false);
  useEffect(() => {
    if (!guide.done) return;
    const a = setTimeout(() => setGuideSources(true), GUIDE_SOURCES_MS);
    const b = setTimeout(() => setGuideDone(true), GUIDE_SOURCES_MS + GUIDE_DONE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [guide.done]);

  // ---- 5. studio: the demo is over once the visitor is in it ----
  useEffect(() => {
    if (phase === "studio") onComplete?.();
  }, [phase, onComplete]);

  // ---- scroll cue, re-armed for each screen ----
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { hasMore, scrollForward } = useScrollCue(scrollRef, innerRef);
  const scrolled = useScrolledOnce(scrollRef, phase);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [phase]);
  const cueScreenReady = (phase === "answering" && guideDone) || phase === "studio";
  const [cueReady, setCueReady] = useState(false);
  useEffect(() => {
    if (!cueScreenReady) return;
    const t = setTimeout(() => setCueReady(true), CUE_DELAY_MS);
    return () => {
      clearTimeout(t);
      setCueReady(false);
    };
  }, [cueScreenReady, phase]);

  const showInput = phase !== "studio" && !(phase === "answering" && guideDone);

  return (
    <div className="flex h-full flex-col items-center pb-[2.5cqw]">
      <div className="flex min-h-0 flex-1 flex-col" style={{ width: `${COLUMN_CQW}cqw` }}>
        <NotebookHeader title={content.notebookTitle} tab={tab} />

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto pt-[1.2cqw] pb-[1.5cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div ref={innerRef}>
              {phase === "loading" && (
                <SourcesTray sources={content.sources} shown={sourcesShown} checked={sourcesChecked} beat={sourceBeat} />
              )}

              {phase === "answering" && responding && (
                <StudyGuide content={content} shown={guideShown} showSources={guideSources} />
              )}

              {phase === "studio" && <Studio content={content} />}
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <RisingDotsCue show={cueReady && hasMore && !scrolled} onClick={scrollForward} />
          </div>
        </div>

        <div className="mt-[0.8cqw] shrink-0">
          {showInput && (
            <>
              {/* only once the prompt is fully typed, so it lands as an instruction rather
                  than competing with the words still coming in */}
              <p
                className="mb-[0.8cqw] text-center text-[1.05cqw] text-[#9a9b9c] transition-opacity duration-500"
                style={{ opacity: phase === "chatPrompt" && chat.done ? 1 : 0 }}
              >
                Tap send to ask.
              </p>
              <NotebookInput
                text={
                  phase === "setup" ? (
                    <Typed text={content.setupPrompt} shown={setup.n} />
                  ) : phase === "chatPrompt" ? (
                    <Typed text={content.chatPrompt} shown={chat.n} />
                  ) : (
                    "Responding…"
                  )
                }
                sourceCount={phase === "chatPrompt" || phase === "answering" ? content.sources.length : sourcesChecked}
                mode={phase === "loading" || phase === "answering" ? "stop" : "send"}
                primed={(phase === "setup" && setup.done) || (phase === "chatPrompt" && chat.done)}
                onSend={() => setPhase(phase === "setup" ? "loading" : "answering")}
              />
            </>
          )}

          {phase === "answering" && guideDone && (
            <div className="flex flex-col items-center gap-[1.6cqw] [animation:fade-in-up_400ms_ease-out]">
              <Disclaimer text={content.disclaimer} />
              <GradientPillButton onClick={() => setPhase("studio")}>Start the Biology quiz</GradientPillButton>
            </div>
          )}

          {phase === "studio" && <Disclaimer text={content.disclaimer} />}
        </div>
      </div>
    </div>
  );
}

function NotebookHeader({ title, tab }: { title: string; tab: Tab }) {
  return (
    <div className="shrink-0">
      <div className="flex items-center gap-[1.1cqw]">
        <img src="/v81-image-assets-inuse/assets/products/notebooklm.svg" alt="" className="h-[2.6cqw] w-[2.6cqw]" />
        <span className="flex-1 text-[1.9cqw] leading-[2.4cqw] text-white">{title}</span>
        <span className="text-[1.05cqw] text-[#9a9b9c]">Gemini Notebook</span>
      </div>

      <div className="mt-[0.8cqw] flex border-b-[0.07cqw] border-[#2a2a2a]">
        {(["Sources", "Chat", "Studio"] as Tab[]).map((t) => (
          <div key={t} className="relative flex-1 py-[0.9cqw] text-center text-[1.35cqw] transition-colors duration-300" style={{ color: t === tab ? "#fff" : "#6b6b6b" }}>
            {t}
            <span
              className="absolute inset-x-0 -bottom-[0.07cqw] h-[0.2cqw] transition-opacity duration-300"
              style={{ backgroundColor: ACCENT, opacity: t === tab ? 1 : 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The notebook's own input. `mode` is Send (an arrow, which the visitor taps once the
 * prompt is typed — Send's pulse rings say so) or Stop (the blue square shown while the
 * notebook is responding, display only).
 */
function NotebookInput({
  text,
  sourceCount,
  mode,
  primed,
  onSend,
}: {
  text: ReactNode;
  sourceCount: number;
  mode: "send" | "stop";
  primed: boolean;
  onSend: () => void;
}) {
  return (
    <div className="rounded-[1.3cqw] border-[0.07cqw] px-[1.6cqw] pt-[1.3cqw] pb-[1cqw]" style={{ backgroundColor: PANEL, borderColor: PANEL_EDGE }}>
      <p className="min-h-[1.9cqw] text-[1.25cqw] leading-[1.9cqw] text-white">{text}</p>
      <div className="mt-[0.5cqw] flex items-center justify-between">
        <span className="text-[1.1cqw] text-[#9a9b9c]">
          {sourceCount} {sourceCount === 1 ? "source" : "sources"}
        </span>
        {mode === "stop" ? (
          <span className="flex h-[3.2cqw] w-[3.2cqw] items-center justify-center rounded-full bg-[#1c419a]">
            <span className="h-[1cqw] w-[1cqw] rounded-[0.15cqw] bg-white" />
          </span>
        ) : (
          <PulseRings active={primed}>
            <button
              type="button"
              onClick={onSend}
              disabled={!primed}
              aria-label="Send"
              className="flex h-[3.2cqw] w-[3.2cqw] items-center justify-center rounded-full bg-[#2b2c2e] text-white transition-opacity duration-300 active:brightness-90 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-[1.5cqw] w-[1.5cqw]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </PulseRings>
        )}
      </div>
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="flex h-[1.5cqw] w-[1.5cqw] shrink-0 items-center justify-center rounded-[0.3cqw] border-[0.12cqw] transition-colors duration-300"
      style={{ backgroundColor: checked ? ACCENT : "transparent", borderColor: checked ? ACCENT : "#7f8080" }}
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-[1.2cqw] w-[1.2cqw] [animation:fade-in-up_250ms_ease-out]" fill="none" stroke="#1b2b4d" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
}

/** The doc glyph the design draws for the syllabus and the slides. */
function DocGlyph() {
  return (
    <svg viewBox="0 0 18 24" className="h-[1.7cqw] w-[1.3cqw] shrink-0">
      <defs>
        <linearGradient id="nb-doc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4c8df6" />
          <stop offset="1" stopColor="#8b7cf6" />
        </linearGradient>
      </defs>
      <path d="M3 0h8.5L18 6.5V21a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3z" fill="url(#nb-doc)" />
      <path d="M11.5 0v4.5a2 2 0 0 0 2 2H18z" fill="#fff" fillOpacity={0.35} />
    </svg>
  );
}

function SourcesTray({
  sources,
  shown,
  checked,
  beat,
}: {
  sources: StudyNotebookContent["sources"];
  shown: number;
  checked: number;
  beat: number;
}) {
  return (
    <div className="[animation:fade-in-up_400ms_ease-out]">
      <div className="mb-[0.8cqw] flex items-center px-[0.4cqw]">
        <svg viewBox="0 0 24 24" className="h-[1.4cqw] w-[1.4cqw] text-[#c4c7c5]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 7h16M4 12h11M4 17h6" />
        </svg>
        <span className="flex-1 text-center text-[1.2cqw] text-[#e3e3e3]">Select all</span>
        <Checkbox checked={beat > 0 && checked === sources.length} />
      </div>

      <div className="flex flex-col gap-[0.25cqw] rounded-[1.6cqw] p-[0.55cqw]" style={{ backgroundColor: PANEL }}>
        {sources.slice(0, shown).map((source, i) => (
          <div
            key={source.title}
            className="flex items-center gap-[1cqw] rounded-[1.1cqw] border-[0.07cqw] px-[0.9cqw] [animation:fade-in-up_400ms_ease-out]"
            style={{ backgroundColor: ROW, borderColor: PANEL_EDGE, height: source.thumb ? "4.4cqw" : "3.6cqw" }}
          >
            {source.thumb ? (
              <img src={source.thumb} alt="" className="h-[3cqw] w-[3.8cqw] shrink-0 rounded-[0.5cqw] object-cover" />
            ) : (
              <DocGlyph />
            )}
            <span className="flex-1 truncate text-[1.2cqw] text-[#e3e3e3]">{source.title}</span>
            <Checkbox checked={i < checked} />
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberDot({ n, size, bg }: { n: number; size: number; bg: string }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-white [animation:fade-in-up_300ms_ease-out]"
      style={{ height: `${size}cqw`, width: `${size}cqw`, backgroundColor: bg, fontSize: `${size * 0.55}cqw` }}
    >
      {n}
    </span>
  );
}

function StudyGuide({
  content,
  shown,
  showSources,
}: {
  content: StudyNotebookContent;
  shown: number[];
  showSources: boolean;
}) {
  // shown[0] is the title; then each item's heading and body in turn
  return (
    <div className="flex flex-col">
      <h3 className="text-[1.6cqw] leading-[2.1cqw] font-medium text-white">
        <Typed text={content.guideTitle} shown={shown[0]} />
      </h3>

      <ol className="mt-[1cqw] flex flex-col gap-[1.2cqw]">
        {content.guide.map((item, i) => {
          const heading = shown[1 + i * 2];
          const body = shown[2 + i * 2];
          if (heading === 0) return null;
          return (
            <li key={item.heading} className="flex gap-[1cqw]">
              <NumberDot n={i + 1} size={1.7} bg={STEP_NUMBER} />
              <div className="flex min-w-0 flex-1 flex-col gap-[0.4cqw]">
                <div className="flex items-center gap-[0.8cqw]">
                  <span className="flex-1 text-[1.25cqw] leading-[1.7cqw] font-medium text-white">
                    <Typed text={item.heading} shown={heading} />
                  </span>
                  {/* citations land with their point, not after the prose around them */}
                  <span className="flex gap-[0.4cqw]">
                    {item.cites.map((c) => (
                      <NumberDot key={c} n={c} size={1.7} bg={CITE} />
                    ))}
                  </span>
                </div>
                {body > 0 && (
                  <p className="text-[1.15cqw] leading-[1.7cqw] text-[#e3e3e3]">
                    <Typed text={item.body} shown={body} />
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {showSources && (
        <div className="mt-[1.4cqw] border-t-[0.07cqw] border-[#2a2a2a] pt-[1cqw]">
          <p className="text-[1.05cqw] font-medium text-[#c4c7c5] [animation:fade-in-up_300ms_ease-out]">Sources</p>
          <ol className="mt-[0.6cqw] flex flex-col gap-[0.45cqw]">
            {content.sources.map((source, i) => (
              <li
                key={source.title}
                className="flex items-center gap-[0.8cqw] text-[1.1cqw] text-[#e3e3e3]"
                style={{ animation: "fade-in-up 350ms ease-out both", animationDelay: `${i * 140}ms` }}
              >
                <NumberDot n={i + 1} size={1.3} bg={STEP_NUMBER} />
                {source.title}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Disclaimer({ text }: { text: string }) {
  return <p className="text-center text-[0.8cqw] text-[#6f7071] [animation:fade-in-up_400ms_ease-out]">{text}</p>;
}

function Chevron({ dir, className }: { dir: "up" | "left" | "right"; className?: string }) {
  const d = { up: "M6 15l6-6 6 6", left: "M15 6l-6 6 6 6", right: "M9 6l6 6-6 6" }[dir];
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>
  );
}

/** Studio: the quiz and the audio overview, landing one after the other. */
function Studio({ content }: { content: StudyNotebookContent }) {
  return (
    <div className="flex flex-col">
      <div className="[animation:fade-in-up_450ms_ease-out_both]">
        <Quiz content={content} />
      </div>
      <div className="[animation:fade-in-up_450ms_ease-out_both]" style={{ animationDelay: "350ms" }}>
        <AudioOverview audio={content.audio} />
      </div>
    </div>
  );
}

function Quiz({ content }: { content: StudyNotebookContent }) {
  const total = content.quiz.length;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // a card counts as answered the first time its answer is seen, not every time it flips
  const [answered, setAnswered] = useState<Set<number>>(() => new Set());
  const card = content.quiz[index];

  const flip = () => {
    setFlipped((f) => !f);
    if (!flipped) setAnswered((a) => new Set(a).add(index));
  };
  const go = (to: number) => {
    setFlipped(false);
    setIndex(to);
  };
  const done = answered.size === total;

  return (
    <div>
      <div className="flex items-center gap-[1.1cqw] px-[0.4cqw]">
        <svg viewBox="0 0 24 24" className="h-[2cqw] w-[2cqw] text-[#c4c7c5]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="3" width="14" height="16" rx="2" />
          <path d="M4 7v12a2 2 0 0 0 2 2h10" />
          <path d="M11 9a2 2 0 1 1 2.6 1.9c-.6.2-.6.7-.6 1.1M13 15h.01" />
        </svg>
        <div className="flex flex-1 flex-col">
          <span className="text-[1.3cqw] leading-[1.7cqw] text-white">{content.quizTitle}</span>
          <span className="text-[0.95cqw] text-[#9a9b9c]">
            {total} questions &middot; {content.sources.length} sources
          </span>
        </div>
        <Chevron dir="up" className="h-[1.5cqw] w-[1.5cqw] text-[#9a9b9c]" />
      </div>

      <p className="mt-[0.8cqw] text-[1.05cqw] text-white">{done ? `Quiz complete · ${total} of ${total}` : `${answered.size} of ${total} answered`}</p>
      <div className="mt-[0.5cqw] h-[0.35cqw] overflow-hidden rounded-full bg-[#1f1f1f]">
        <div className="h-full rounded-full bg-[#436dea] transition-[width] duration-500 ease-out" style={{ width: `${(answered.size / total) * 100}%` }} />
      </div>

      {/* a 3D flip: both faces share one box, the back pre-turned so it reads correctly once
          the card has spun round */}
      <button
        type="button"
        onClick={flip}
        aria-label={flipped ? "Show the question" : "Show the answer"}
        className="mt-[0.9cqw] block h-[9.8cqw] w-full [perspective:120cqw]"
      >
        <div
          className="relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          <CardFace label={`Q${index + 1}`} text={card.question} hint="Tap the card to see the answer" bg="#141414" edge="#3a3a3a" />
          <CardFace label={`A${index + 1}`} text={card.answer} bg="#0c1528" edge="#2a4480" back />
        </div>
      </button>

      <div className="mt-[0.7cqw] flex items-center justify-center gap-[2.2cqw]">
        <NavButton dir="left" disabled={index === 0} onClick={() => go(index - 1)} />
        <span className="min-w-[4cqw] text-center text-[1.1cqw] text-white">
          {index + 1} of {total}
        </span>
        <NavButton dir="right" disabled={index === total - 1} onClick={() => go(index + 1)} />
      </div>
    </div>
  );
}

function CardFace({ label, text, hint, bg, edge, back = false }: { label: string; text: string; hint?: string; bg: string; edge: string; back?: boolean }) {
  return (
    <div
      className="absolute inset-0 flex flex-col rounded-[1.3cqw] border-[0.08cqw] px-[1.6cqw] py-[1.1cqw] [backface-visibility:hidden]"
      style={{ backgroundColor: bg, borderColor: edge, transform: back ? "rotateY(180deg)" : undefined }}
    >
      <span className="text-left text-[1cqw] text-[#c4c7c5]">{label}</span>
      <span className="flex flex-1 items-center justify-center px-[1cqw] text-center text-[1.45cqw] leading-[2cqw] text-white">{text}</span>
      {hint && <span className="text-center text-[1.05cqw] text-[#c4c7c5]">{hint}</span>}
    </div>
  );
}

function NavButton({ dir, disabled, onClick }: { dir: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Previous question" : "Next question"}
      className="flex h-[3.1cqw] w-[3.1cqw] items-center justify-center rounded-full transition-colors duration-200 active:brightness-90"
      style={{ backgroundColor: disabled ? "#121313" : "#333537", color: disabled ? "#4a4b4c" : "#fff" }}
    >
      <Chevron dir={dir} className="h-[1.5cqw] w-[1.5cqw]" />
    </button>
  );
}

function AudioOverview({ audio }: { audio: StudyNotebookContent["audio"] }) {
  const [playing, setPlaying] = useState(false);
  const lines = audio.transcript.map((t) => t.line);
  const typed = useTyped(
    lines.reduce((sum, l) => sum + l.length, 0),
    playing,
    { tickMs: 34, startDelayMs: 500 },
  );
  const shown = slice(lines, typed.n);

  return (
    <div className="mt-[1cqw]">
      <div className="flex items-center gap-[1.1cqw] border-b-[0.07cqw] border-[#2a2a2a] px-[0.4cqw] pb-[0.9cqw]">
        <svg viewBox="0 0 24 24" className="h-[2cqw] w-[2cqw] text-[#c4c7c5]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
        </svg>
        <div className="flex flex-1 flex-col">
          <span className="text-[1.3cqw] leading-[1.7cqw] text-white">{audio.title}</span>
          <span className="text-[0.95cqw] text-[#9a9b9c]">{audio.meta}</span>
        </div>
        {/* primed until it's been played, the same "act here" rings as Send */}
        <PulseRings active={!playing}>
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play the audio overview"
            className="flex h-[3.1cqw] w-[3.1cqw] items-center justify-center rounded-full bg-[#2b2c2e] text-white active:brightness-90"
          >
            <PlayGlyph className="h-[1.4cqw] w-[1.4cqw]" />
          </button>
        </PulseRings>
      </div>

      {playing && (
        <div className="mt-[0.9cqw] [animation:fade-in-up_400ms_ease-out]">
          <span className="ml-[0.6cqw] flex h-[3cqw] w-[3cqw] items-center justify-center rounded-full bg-[#294988] text-[#8fb0f0]">
            <PlayGlyph className="h-[1.5cqw] w-[1.5cqw]" />
          </span>
          <div className="mt-[0.8cqw] grid grid-cols-[6.5cqw_1fr] gap-x-[1cqw] gap-y-[0.6cqw] text-[1.2cqw] leading-[1.75cqw]">
            {audio.transcript.map((t, i) =>
              shown[i] > 0 ? (
                <div key={i} className="contents">
                  <span className="text-[#8e8e8e]">{t.speaker}</span>
                  <span className="text-white">
                    <Typed text={t.line} shown={shown[i]} />
                  </span>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}
