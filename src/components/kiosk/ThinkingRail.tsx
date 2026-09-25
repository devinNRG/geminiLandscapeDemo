"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ThinkingStep } from "./types";
import { GradientPillButton } from "./shared";

/** Beat before the first "Thinking it through…" row lands, once the card is up. */
const FIRST_STEP_MS = 650;
/** Gap between each subsequent row appearing. */
const STEP_MS = 800;
/** Held after the last row before the CTA turns up, so "Task complete" is read as an
 * outcome rather than as one more thing scrolling past. */
const CTA_DELAY_MS = 700;

/**
 * Act one of every agentic answer: Gemini narrating what it is doing, one row at a time,
 * with the mark of whichever Google app each step touched. It is deliberately not a
 * spinner — the demo's claim is that Gemini went and did the work, so the rail has to show
 * it, and it grows as it goes rather than revealing inside a fixed box, so the card
 * visibly accumulates rather than filling a shape that was already there.
 *
 * Shared by the semester plan and the meeting brief; what differs is only what the CTA
 * says, what it opens, and whether a file chip sits between the two.
 */
export default function ThinkingRail({
  steps,
  active,
  ctaLabel,
  onCta,
  file,
}: {
  steps: ThinkingStep[];
  active: boolean;
  ctaLabel: string;
  onCta: () => void;
  /** The file the rail produced, shown as a chip between the card and the CTA. */
  file?: ReactNode;
}) {
  const [stepsShown, setStepsShown] = useState(0);
  const [showCta, setShowCta] = useState(false);

  // the rail advances a row at a time; the first waits a touch longer so the card is
  // visibly in place before anything is written into it
  useEffect(() => {
    if (!active || stepsShown >= steps.length) return;
    const t = setTimeout(() => setStepsShown((n) => n + 1), stepsShown === 0 ? FIRST_STEP_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [active, stepsShown, steps.length]);

  useEffect(() => {
    if (!active || stepsShown < steps.length) return;
    const t = setTimeout(() => setShowCta(true), CTA_DELAY_MS);
    return () => clearTimeout(t);
  }, [active, stepsShown, steps.length]);

  return (
    <div className="flex flex-col items-center gap-[1.8cqw]">
      <div className="w-full rounded-[1.7cqw] bg-surface-card px-[1.7cqw] py-[1.5cqw]">
        <div className="flex items-center gap-[0.6cqw]">
          <span className="text-[1.45cqw] leading-[1.9cqw] text-[#c4c7c5]">Thinking it through&hellip;</span>
          <ChevronGlyph />
        </div>

        {/* only the rows revealed so far are mounted, so the card grows with the rail
            instead of the rail filling a box that was always this tall */}
        <ol className="mt-[1.1cqw] flex flex-col">
          {steps.slice(0, stepsShown).map((step, i) => (
            <StepRow key={i} step={step} last={i === steps.length - 1} />
          ))}
        </ol>

        {showCta && (
          <div className="mt-[1.1cqw] [animation:fade-in-up_400ms_ease-out]">
            <FeedbackRow />
          </div>
        )}
      </div>

      {showCta && file && <div className="w-full [animation:fade-in-up_400ms_ease-out]">{file}</div>}

      {showCta && (
        <div className="[animation:fade-in-up_400ms_ease-out]">
          <GradientPillButton onClick={onCta}>{ctaLabel}</GradientPillButton>
        </div>
      )}
    </div>
  );
}

function StepRow({ step, last }: { step: ThinkingStep; last: boolean }) {
  return (
    <li className={`flex items-stretch gap-[0.9cqw] [animation:fade-in-up_400ms_ease-out] ${last ? "" : "pb-[0.85cqw]"}`}>
      {/* the icon column doubles as the rail: the dashed run below each mark stretches to
          whatever height that row's text needs, so the line never has to be measured */}
      <div className="flex w-[1.9cqw] shrink-0 flex-col items-center">
        <StepGlyph step={step} />
        {!last && <span className="w-0 flex-1 border-l border-dashed border-white/25" />}
      </div>
      <p className="pt-[0.15cqw] text-[1.1cqw] leading-[1.55cqw] text-[#c4c7c5]">{step.text}</p>
    </li>
  );
}

function StepGlyph({ step }: { step: ThinkingStep }) {
  if (step.kind === "done") return <CheckGlyph />;
  if (step.kind === "thought") return <ClockGlyph />;
  if (step.app === "drive") return <DriveGlyph />;
  if (step.app === "gmail") return <AppGlyph src="/v81-image-assets-inuse/assets/products/gmail.svg" />;
  if (step.app === "docs") return <AppGlyph src="/v81-image-assets-inuse/assets/products/docs.svg" inset />;
  return <CalendarGlyph />;
}

/** A mark that needs nothing behind it, drawn at the rail's own icon size. `inset` is for
 * a tall mark (Docs' page) that would otherwise overpower the square ones beside it. */
function AppGlyph({ src, inset = false }: { src: string; inset?: boolean }) {
  return (
    <span className="flex h-[1.9cqw] w-[1.9cqw] shrink-0 items-center justify-center">
      <img src={src} alt="" className={inset ? "h-[1.75cqw] w-[1.3cqw]" : "h-[1.6cqw] w-[1.9cqw]"} />
    </span>
  );
}

/* Drive and Calendar are the official marks from the shared asset set; the clock, check and
   chevron below are drawn, since they are generic UI shapes with no brand to get wrong. */

function ClockGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.9cqw] w-[1.9cqw] shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="11.2" fill="#242527" />
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="#9aa0a6" strokeWidth="1.3" />
      <path d="M12 6.4V12l3.7 2.3" fill="none" stroke="#9aa0a6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.9cqw] w-[1.9cqw] shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="11.2" fill="#1e2a1f" />
      <path
        d="M6.4 12.6l3.9 3.9 7.3-8.9"
        fill="none"
        stroke="#5bd07f"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Drive's mark sits on its own tile, the way the design draws it — the logo is a hollow
 * triangle, so without something behind it the card's background shows through the middle
 * and it stops reading as an app icon next to Calendar's solid one.
 *
 * Sized 1.89 x 1.75 rather than square: the source carries `preserveAspectRatio="none"`, so
 * a square box would quietly stretch it. Those are its own 51.93 x 48.125 proportions. */
function DriveGlyph() {
  return (
    <span className="flex h-[1.9cqw] w-[1.9cqw] shrink-0 items-center justify-center rounded-[0.42cqw] bg-[#242527]">
      <img src="/v81-image-assets-inuse/assets/products/drive.svg" alt="" className="h-[1.32cqw] w-[1.42cqw]" />
    </span>
  );
}

export function CalendarGlyph() {
  return (
    <img
      src="/v81-image-assets-inuse/assets/products/calendar.svg"
      alt=""
      className="h-[1.9cqw] w-[1.9cqw] shrink-0"
    />
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1cqw] w-[1.1cqw] shrink-0" fill="none" stroke="#9aa0a6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 9l7 7 7-7" />
    </svg>
  );
}

/** Gemini's own rate-this row under a finished answer. Inert, like everything else inside
 * the frame that isn't the one thing the visitor is meant to tap. */
function FeedbackRow() {
  return (
    <div className="flex items-center gap-[1.5cqw] text-[#9aa0a6]">
      <svg viewBox="0 0 24 24" className="h-[1.5cqw] w-[1.5cqw]" fill="currentColor" aria-hidden>
        <path d="M2 10h3.2v11H2zM7 21h9.8a2 2 0 0 0 1.9-1.4l2.2-6.8A1.6 1.6 0 0 0 19.4 11H14l.9-4.4A1.9 1.9 0 0 0 13 4.2L12.4 4 7 10.3z" />
      </svg>
      <svg viewBox="0 0 24 24" className="h-[1.5cqw] w-[1.5cqw]" fill="currentColor" aria-hidden>
        <path d="M22 14h-3.2V3H22zM17 3H7.2a2 2 0 0 0-1.9 1.4L3.1 11.2A1.6 1.6 0 0 0 4.6 13H10l-.9 4.4A1.9 1.9 0 0 0 11 19.8l.6.2L17 13.7z" />
      </svg>
      <svg viewBox="0 0 24 24" className="h-[1.5cqw] w-[1.5cqw]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="7" width="12" height="14" rx="2.5" />
        <path d="M8 4.2A2 2 0 0 1 9.8 3H19a2 2 0 0 1 2 2v11.2a2 2 0 0 1-1.2 1.8" />
      </svg>
    </div>
  );
}
