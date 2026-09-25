"use client";

import type { PlayDateCard } from "./types";

/**
 * The card Gemini opens over the play date thread — twice: once to say the Saturday is
 * free, and once to say the event has been written to the calendar.
 *
 * It sits on the messaging app rather than replacing it, the same way `GeminiOverlay` does
 * for an answer, but it is a notice rather than a panel: a headline, the day it is about,
 * and at most one thing to do. The second card has no action at all — by then there is
 * nothing left to answer, and a button that only dismisses is a button that lies about
 * having a choice.
 */
export default function PlayDateOverlay({
  card,
  show,
  onAction,
}: {
  card: PlayDateCard;
  show: boolean;
  onAction?: () => void;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[10.5cqw] z-20 flex justify-center transition-[opacity,transform] duration-500 ease-out"
      style={{
        opacity: show ? 1 : 0,
        transform: `translateY(${show ? "0" : "1.5cqw"})`,
      }}
    >
      <div
        className="w-[40cqw] rounded-[2.2cqw] border border-white/10 bg-[#1b1c1e] px-[1.9cqw] py-[1.7cqw] shadow-[0_0.6cqw_2.4cqw_rgba(0,0,0,0.6)]"
        style={{ pointerEvents: show ? "auto" : "none" }}
      >
        <div className="flex items-start gap-[1cqw]">
          <img src="/gemini/friday-night/suggestion-pill-sparkle.svg" alt="" className="mt-[0.2cqw] h-[1.9cqw] w-[1.9cqw] shrink-0" />
          <p className="flex-1 text-[1.6cqw] leading-[2.1cqw] font-medium text-white">{card.title}</p>
          {/* the sheet's collapse chevron in the source design — scenery, like the RCS bar */}
          <svg viewBox="0 0 24 24" className="mt-[0.4cqw] h-[1.4cqw] w-[1.4cqw] shrink-0 text-[#c4c7c5]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 15l6-6 6 6" />
          </svg>
        </div>

        <div className="mt-[1.3cqw] flex items-center gap-[1.8cqw] rounded-[1.6cqw] bg-[#121315] px-[1.6cqw] py-[1.2cqw]">
          {/* the date block reads down the way a calendar chip does: weekday, month, day */}
          <div className="shrink-0 text-[#e4e1e7]">
            <div className="text-[0.95cqw] leading-[1.3cqw]">{card.weekday}</div>
            <div className="text-[1.5cqw] leading-[1.8cqw]">{card.month}</div>
            <div className="text-[1.5cqw] leading-[1.8cqw]">{card.day}</div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[0.35cqw]">
            {card.lines.map((line) => (
              <span key={line} className="truncate text-[1.2cqw] leading-[1.7cqw] text-[#c4c7c5]">
                {line}
              </span>
            ))}
          </div>
        </div>

        {card.action && (
          <div className="mt-[1.4cqw] flex justify-end">
            <button
              type="button"
              onClick={onAction}
              tabIndex={show ? 0 : -1}
              style={{ pointerEvents: show ? "auto" : "none" }}
              className="rounded-full border border-white/40 px-[2.4cqw] py-[0.85cqw] text-[1.35cqw] text-white transition-transform duration-150 active:scale-[0.97]"
            >
              {card.action}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
