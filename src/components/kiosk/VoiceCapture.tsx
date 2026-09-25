"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { VoiceSegment } from "./types";
import { PHONE_COLUMN } from "./MessagesScene";

/** ms per character while the dictation is coming in — slower than Gemini's own streaming,
 * because this is someone talking, not a model writing. */
const SPEAK_TICK_MS = 18;
/** Held on the finished dictation before the filler starts greying out. */
const MARK_DELAY_MS = 800;
/** ...and before the first greyed word leaves. */
const DROP_DELAY_MS = 1200;
/** How long one word takes to lift, blur and go. */
const DROP_MS = 1100;
/** Gap between one word leaving and the next, so the paragraph clears front to back rather
 * than all at once — the sweep is what shows the editing being done. */
const DROP_STAGGER_MS = 260;
/** How long the words that stay take to slide into their new places once the filler is
 * gone. They travel rather than snapping, because the sentence closing up is the payoff. */
const REFLOW_MS = 750;
/** Held on the finished message, after it has closed up, before it is handed to the RCS
 * bar — long enough to read what Gemini made of the recording. */
const SETTLE_HOLD_MS = REFLOW_MS + 1100;

type Phase = "speaking" | "marked" | "dropping" | "settled";

/**
 * The voice capture that plays over the thread: the dictation arrives word by word, Gemini
 * greys out the hesitation, the greyed words lift and blur away one after another, and what
 * is left slides together into the message.
 *
 * The beats are deliberately separate. Greying *then* removing is what shows the judgement
 * being made — if the filler simply never appeared, Gemini would look like a transcriber
 * rather than an editor, which is the whole claim of this flow. The removal sweeps from the
 * start of the paragraph to its end for the same reason: it reads as being gone through.
 *
 * `onSettled` fires once the message is ready. The capsule's own controls are scenery, like
 * the rest of the RCS bar: the message goes to the bar by itself, and the visitor's one tap
 * is the send.
 */
export default function VoiceCapture({
  transcript,
  show,
  onSettled,
}: {
  transcript: VoiceSegment[];
  show: boolean;
  onSettled?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("speaking");
  const [spoken, setSpoken] = useState(0);

  const full = transcript.map((s) => s.text).join(" ");
  // every dropped word's place in the sweep, so each one knows its own delay
  const dropOrder = new Map<number, number>();
  transcript.forEach((segment, i) => {
    if (!segment.keep) dropOrder.set(i, dropOrder.size);
  });
  const dropSweepMs = (dropOrder.size - 1) * DROP_STAGGER_MS + DROP_MS;

  useEffect(() => {
    if (spoken >= full.length) return;
    const t = setInterval(() => setSpoken((n) => Math.min(full.length, n + 1)), SPEAK_TICK_MS);
    return () => clearInterval(t);
  }, [spoken, full.length]);

  useEffect(() => {
    if (spoken < full.length) return;
    const a = setTimeout(() => setPhase("marked"), MARK_DELAY_MS);
    const b = setTimeout(() => setPhase("dropping"), MARK_DELAY_MS + DROP_DELAY_MS);
    const c = setTimeout(() => setPhase("settled"), MARK_DELAY_MS + DROP_DELAY_MS + dropSweepMs);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [spoken, full.length, dropSweepMs]);

  // Reflow, animated: the kept words are measured while the filler is still in the layout,
  // then again once it has gone, and each one is played from where it was to where it now
  // is. Without this the sentence snaps together in a single frame and the closing up —
  // the whole point of the edit — is over before it can be seen.
  const wordRefs = useRef(new Map<number, HTMLSpanElement>());
  const beforeRects = useRef(new Map<number, DOMRect>());

  useLayoutEffect(() => {
    if (phase !== "dropping") return;
    // positions hold steady through the drop: a dropped word keeps its space until it is
    // removed, so one measurement at the start of the sweep is enough
    wordRefs.current.forEach((el, i) => beforeRects.current.set(i, el.getBoundingClientRect()));
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "settled") return;
    wordRefs.current.forEach((el, i) => {
      const before = beforeRects.current.get(i);
      if (!before) return;
      const after = el.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }], {
        duration: REFLOW_MS,
        easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      });
    });
  }, [phase]);

  // the message hands itself to the RCS bar; the only tap left is the send
  useEffect(() => {
    if (phase !== "settled") return;
    const t = setTimeout(() => onSettled?.(), SETTLE_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, onSettled]);

  // how much of each segment has been spoken so far, walked from one running count rather
  // than a reassigned outer variable (which the lint rule reads as render-time mutation)
  const shown = transcript.reduce<number[]>((acc, segment, i) => {
    const offset = transcript.slice(0, i).reduce((n, prev) => n + prev.text.length + 1, 0);
    acc.push(Math.max(0, Math.min(segment.text.length, spoken - offset)));
    return acc;
  }, []);

  const done = spoken >= full.length;

  return (
    <div
      // the capture belongs to the phone, so it is the thread's own column wide rather than
      // the frame's — at full width the dictation runs out past the app it is spoken into
      className="pointer-events-none absolute bottom-[7.6cqw] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-[1.4cqw] transition-opacity duration-300"
      style={{ width: PHONE_COLUMN, opacity: show ? 1 : 0 }}
    >
      <p className="text-center text-[1.4cqw] leading-[2.1cqw] font-medium">
        {transcript.map((segment, i) => {
          if (shown[i] === 0) return null;
          const dropped = !segment.keep;
          // settled drops the filler from the layout entirely, which is what lets the words
          // that stay close up into a sentence
          if (dropped && phase === "settled") return null;
          const text = segment.text.slice(0, shown[i]);
          const delay = (dropOrder.get(i) ?? 0) * DROP_STAGGER_MS;
          return (
            // the gap between words is a sibling of the word, not the last thing inside it:
            // a trailing space inside an inline-block is trimmed, and the sentence would run
            // together the moment the words became measurable
            <Fragment key={i}>
              <span
                ref={(el) => {
                  if (dropped) return;
                  if (el) wordRefs.current.set(i, el);
                  else wordRefs.current.delete(i);
                }}
                className="relative inline-block"
              >
                {/* the word animates, the glints do not: the blur that carries it away would
                    carry them off with it */}
                <span
                  className="inline-block transition-colors duration-700"
                  style={{
                    color: dropped && phase !== "speaking" ? "#7b7b7f" : "#ffffff",
                    animation: dropped && phase === "dropping" ? `word-drop ${DROP_MS}ms ease-in ${delay}ms forwards` : undefined,
                  }}
                >
                  {text}
                </span>
                {dropped && phase === "dropping" && <Sparkles seed={i} delay={delay} />}
              </span>{" "}
            </Fragment>
          );
        })}
        {!done && <span className="ml-[0.1em] inline-block h-[0.9em] w-[0.1em] translate-y-[0.1em] animate-pulse bg-[#8ab4f8] align-middle" />}
      </p>

      {/* The capsule, drawn rather than exported: a near-black pill with the light gathered
          along its bottom inside edge, and two soft swells sliding across each other in it —
          which is what reads as a voice rather than as a progress bar. Everything slows once
          the talking stops. */}
      <div
        className="relative h-[4.2cqw] w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "#08090c", boxShadow: "inset 0 0 0 0.08cqw rgba(74,110,180,0.32)" }}
      >
        {/* the standing glow on the floor of the capsule — shallow, so most of the pill
            stays black and the swells have somewhere to show */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%]"
          style={{ background: "linear-gradient(to top, rgba(86,129,220,0.9), rgba(60,95,171,0.2) 55%, rgba(8,9,12,0) 100%)" }}
        />
        {/* the two swells that move over it */}
        <div
          className="pointer-events-none absolute -bottom-[58%] left-[4%] h-[110%] w-[56%] rounded-[50%]"
          style={{
            background: "radial-gradient(closest-side, rgba(138,180,248,0.9), rgba(86,129,220,0.35) 62%, rgba(86,129,220,0) 100%)",
            filter: "blur(0.6cqw)",
            animation: `voice-swell ${done ? "5.4s" : "2.4s"} ease-in-out infinite`,
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-[64%] right-[6%] h-[105%] w-[44%] rounded-[50%]"
          style={{
            background: "radial-gradient(closest-side, rgba(108,152,232,0.7), rgba(60,95,171,0.28) 64%, rgba(60,95,171,0) 100%)",
            filter: "blur(0.65cqw)",
            animation: `voice-swell-alt ${done ? "6.6s" : "3.1s"} ease-in-out infinite`,
          }}
        />
        <span className="absolute left-[0.5cqw] top-1/2 flex h-[2.9cqw] w-[2.9cqw] -translate-y-1/2 items-center justify-center rounded-full bg-[#123a75] text-white">
          <svg viewBox="0 0 24 24" className="h-[1.4cqw] w-[1.4cqw]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </span>
        <span
          className="absolute right-[0.5cqw] top-1/2 flex h-[2.9cqw] w-[2.9cqw] -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-500"
          style={{
            backgroundColor: phase === "settled" ? "#a8c7fa" : "#16243f",
            color: phase === "settled" ? "#0b2a5b" : "#ffffff",
          }}
        >
          <svg viewBox="0 0 24 24" className="h-[1.4cqw] w-[1.4cqw]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/** Glints over a word on its way out. They sit outside the word's own animation so the blur
 * that carries it away doesn't take them too, and they are sized to be seen: a sparkle
 * smaller than a full stop is a sparkle nobody notices. */
function Sparkles({ seed, delay }: { seed: number; delay: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {[0, 1, 2, 3].map((i) => {
        const n = seed * 7 + i * 13;
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${8 + ((n * 17) % 80)}%`,
              top: `${-10 + ((n * 29) % 90)}%`,
              height: "0.45cqw",
              width: "0.45cqw",
              boxShadow: "0 0 0.6cqw 0.18cqw rgba(190,215,255,0.95)",
              animation: `word-sparkle ${640 + ((n * 37) % 300)}ms ease-out ${delay + ((n * 11) % 320)}ms both`,
            }}
          />
        );
      })}
    </span>
  );
}
