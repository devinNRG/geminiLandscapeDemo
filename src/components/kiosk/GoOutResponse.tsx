"use client";

import { useEffect, useState } from "react";
import type { SushiResult, SushiSearchContent } from "./types";
import { PromptBubble, Reveal, useThinkingPhase } from "./shared";
import { ChatBubbleRow } from "./MessagesScene";
import ThinkingIndicator from "./ThinkingIndicator";

const SINGLE_COLUMN_WIDTH = "42cqw";
const THINKING_CAPTIONS = ["Thinking…", "Checking what's open…", "Matching everyone's asks…"];
// holds on the confirmed plan before the demo is considered done — mirrors the FoodOrder
// flow's own settle delay so the shared "back to home" button doesn't appear instantly
const CONFIRM_SETTLE_MS = 1400;

/**
 * The "go out" branch's response: a local-search answer (intro + map + a
 * short list of results) rather than a text answer or a task-automation
 * flow. Tapping the one active result hands off to a confirmation exchange
 * in the group chat, reusing the same bubble styling as `MessagesScene` —
 * this is Gemini drafting into the thread, not a fresh screen.
 */
export default function GoOutResponse({
  content,
  active,
  onComplete,
}: {
  content: SushiSearchContent;
  active: boolean;
  onComplete?: () => void;
}) {
  const { showThinking, contentShown } = useThinkingPhase(active);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!active) {
      setChosenId(null);
      setSettled(false);
    }
  }, [active]);

  useEffect(() => {
    if (!chosenId) return;
    const t = setTimeout(() => setSettled(true), CONFIRM_SETTLE_MS);
    return () => clearTimeout(t);
  }, [chosenId]);

  useEffect(() => {
    if (settled) onComplete?.();
  }, [settled, onComplete]);

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto px-[10cqw] pt-[2.3cqw] pb-[11.5cqw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-col" style={{ width: SINGLE_COLUMN_WIDTH }}>
        {!chosenId ? (
          <>
            <div className="relative">
              <Reveal show={active} index={0}>
                <PromptBubble lines={content.promptLines} />
              </Reveal>
              {showThinking && (
                <div className="absolute left-0" style={{ top: "calc(100% + 1.3cqw)" }}>
                  <Reveal show={active} index={0.5}>
                    <ThinkingIndicator captions={THINKING_CAPTIONS} />
                  </Reveal>
                </div>
              )}
            </div>

            <Reveal show={contentShown} index={1} style={{ marginTop: "1.3cqw" }}>
              <p className="text-white" style={{ fontSize: "1.25cqw", lineHeight: "1.8cqw" }}>
                {content.introText}
              </p>
            </Reveal>

            <Reveal show={contentShown} index={2} style={{ marginTop: "1.3cqw" }}>
              <img src={content.mapImage} alt="" className="w-full rounded-[1.5cqw] object-cover" />
            </Reveal>

            <div className="flex flex-col" style={{ gap: "0.7cqw", marginTop: "1.3cqw" }}>
              {content.results.map((result, i) => (
                <Reveal key={result.id} show={contentShown} index={3 + i}>
                  <ResultCard result={result} onChoose={() => result.active && setChosenId(result.id)} />
                </Reveal>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col" style={{ gap: "1cqw" }}>
            {content.confirmation.map((bubble, i) => (
              <Reveal key={i} show={true} index={i} className="flex flex-col [animation:fade-in-up_500ms_ease-out]">
                <ChatBubbleRow bubble={bubble} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center" style={{ gap: "0.25cqw", fontSize: "0.9cqw" }}>
      <span className="font-medium text-white">{rating}</span>
      <span style={{ color: "#f6b93b" }}>{"★★★★★".slice(0, Math.round(rating))}</span>
      <span className="text-muted">{"★★★★★".slice(Math.round(rating))}</span>
    </span>
  );
}

// no real restaurant photography exists for this mockup — a plain initial badge (same
// convention as the FoodOrder card's restaurant-initial circle) stands in for a thumbnail
function ResultCard({ result, onChoose }: { result: SushiResult; onChoose: () => void }) {
  return (
    <button
      type="button"
      disabled={!result.active}
      onClick={onChoose}
      className={`flex items-center rounded-[1.2cqw] p-[0.7cqw] text-left ${result.active ? "active:bg-white/5" : "pointer-events-none opacity-45"}`}
      style={{ gap: "1cqw" }}
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-[0.9cqw] font-semibold text-white"
        style={{ height: "3.6cqw", width: "3.6cqw", fontSize: "1.3cqw", backgroundColor: "#3a3a3a" }}
      >
        {result.name[0]}
      </span>
      <div className="flex flex-col" style={{ gap: "0.2cqw" }}>
        <span className="font-semibold text-white" style={{ fontSize: "1.1cqw" }}>
          {result.name}
        </span>
        <StarRating rating={result.rating} />
        <span className="text-muted" style={{ fontSize: "0.85cqw" }}>
          <span style={{ color: "#34a853" }}>{result.status}</span> · {result.closesAt} · {result.address} · {result.distance}
        </span>
      </div>
    </button>
  );
}
