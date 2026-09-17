"use client";

import { useEffect, useState } from "react";
import type { SushiResult, SushiSearchContent } from "./types";
import { CometRing, Reveal, useThinkingPhase } from "./shared";
import ThinkingIndicator from "./ThinkingIndicator";
import { threadDurationMs } from "./MessagesScene";
import GeminiOverlay from "./GeminiOverlay";

const THINKING_CAPTIONS = ["Thinking…", "Checking what's open…", "Matching everyone's asks…"];
// a beat after the chat finishes before the demo counts as done, so the last reply gets to
// land rather than being immediately talked over by the exit button
const CONFIRM_TAIL_MS = 900;

/**
 * The "go out" branch's response: a local-search answer that plays out entirely inside
 * the Gemini overlay floating above the group chat, so the thread it came from stays
 * visible the whole time.
 *
 * Each result is a full section — heading, photo card, prose, bullets — and the answer
 * runs about four panels deep, so most of it is below the fold. The photo card is the
 * only tap target in the whole panel, which is why it (and not the section) carries the
 * comet ring and glow: on a kiosk the visitor has to be able to tell at a glance what is
 * pickable without reading. Picking one closes the overlay and hands back to the chat,
 * where `onChoose` lets the caller append that result's drafted message to the thread.
 */
export default function GoOutResponse({
  content,
  active,
  onComplete,
  onChoose,
}: {
  content: SushiSearchContent;
  active: boolean;
  onComplete?: () => void;
  /** Fires with the picked result so the caller can draft it into the group chat. */
  onChoose?: (result: SushiResult) => void;
}) {
  const { showThinking, contentShown } = useThinkingPhase(active);
  const [chosen, setChosen] = useState<SushiResult | null>(null);

  useEffect(() => {
    if (!active) setChosen(null);
  }, [active]);

  // Once the plan is drafted the chat takes over, so this waits out that thread's own
  // animation — asked for rather than guessed, since the drafted message's length (and so
  // its typing time) differs per result.
  useEffect(() => {
    if (!chosen) return;
    const wait = threadDurationMs([{ kind: "outgoing", text: chosen.draftText }, ...content.replies]) + CONFIRM_TAIL_MS;
    const t = setTimeout(() => onComplete?.(), wait);
    return () => clearTimeout(t);
  }, [chosen, content.replies, onComplete]);

  return (
    <GeminiOverlay show={active && !chosen}>
      {showThinking ? (
        <Reveal show={active} index={0}>
          <ThinkingIndicator captions={THINKING_CAPTIONS} />
        </Reveal>
      ) : (
        <div className="flex flex-col gap-[1.1cqw] text-[1.3cqw] leading-[1.85cqw] text-white">
          <Reveal show={contentShown} index={0}>
            <p>{content.introText}</p>
          </Reveal>

          {content.results.map((result, i) => (
            <Reveal key={result.id} show={contentShown} index={1 + i}>
              <ResultSection
                result={result}
                onChoose={() => {
                  setChosen(result);
                  onChoose?.(result);
                }}
              />
            </Reveal>
          ))}

          <Reveal show={contentShown} index={1 + content.results.length}>
            <p>{content.closingText}</p>
          </Reveal>
        </div>
      )}
    </GeminiOverlay>
  );
}

/** One result: the section heading, the tappable card, then its prose and bullets. */
function ResultSection({ result, onChoose }: { result: SushiResult; onChoose: () => void }) {
  return (
    <section className="flex flex-col gap-[1.1cqw] pt-[0.8cqw]">
      <h3 className="text-[1.55cqw] font-bold leading-[2.1cqw] text-white">{result.heading}</h3>

      <div className="flex gap-[1.4cqw]">
        {/* the photo is the pick target, not the whole card — the ring has to sit on
            something with a definite edge, and a full-width hit area would leave the
            visitor guessing which part of a text-heavy section is live */}
        <CometRing active pulse={false} glow radius="1cqw">
          <button
            type="button"
            onClick={onChoose}
            aria-label={`Choose ${result.name}`}
            className="relative block h-[7.5cqw] w-[7.5cqw] shrink-0 overflow-hidden rounded-[1cqw] bg-[#141414] transition-transform duration-150 active:scale-[0.97]"
          >
            {/* deliberately empty — no restaurant photography exists for this mockup yet,
                and a flat panel reads as an intentional placeholder rather than a failure */}
          </button>
        </CometRing>

        <div className="flex min-w-0 flex-col justify-center gap-[0.15cqw] text-[1.05cqw] leading-[1.45cqw]">
          <span className="text-[1.3cqw] leading-[1.75cqw] text-[#e0e0e0]">{result.name}</span>
          <span className="flex items-center gap-[0.25cqw]">
            <span className="text-[#e0e0e0]">{result.rating}</span>
            <svg viewBox="0 0 24 24" className="h-[0.95cqw] w-[0.95cqw] text-[#e0e0e0]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              <path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.6l6.3-.8z" />
            </svg>
            <span className="text-[#8d8d8d]">{result.meta}</span>
          </span>
          <span className="text-[#8d8d8d]">📍 {result.address}</span>
          <span>
            <span className="font-bold text-[#0ebc5f]">Open</span> <span className="text-[#8d8d8d]">{result.closesAt}</span>
          </span>
          <span className="text-[#8d8d8d]">{result.distance}</span>
        </div>
      </div>

      {result.body.map((para, i) => (
        <p key={i}>{para}</p>
      ))}

      <ul className="flex flex-col gap-[0.7cqw]">
        {result.bullets.map((b) => (
          <li key={b.label} className="flex gap-[0.8cqw]">
            <span className="mt-[0.62cqw] h-[0.45cqw] w-[0.45cqw] shrink-0 rounded-full border border-white/45" />
            <span>
              <span className="font-medium">{b.label}</span> {b.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
