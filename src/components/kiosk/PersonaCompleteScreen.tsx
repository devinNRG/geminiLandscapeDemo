"use client";

import { COMPLETIONS, RUNDOWNS, type Persona } from "./types";
import { FpoChip, GradientPillButton } from "./shared";

/**
 * Where a persona's story ends: every flow on their rundown has been played, so there is no
 * rundown left to go back to — the last "Back to your rundown" arrives here instead.
 *
 * It reads their day back as the four things that got done, on the same backdrop their
 * rundown used, so the visitor lands somewhere they recognise as the end of where they
 * started. The ending's own furniture is the demo's: the QR in one bottom corner and the
 * way on in the other, exactly where every finished flow puts them.
 */
export default function PersonaCompleteScreen({ persona, onRestart }: { persona: Persona; onRestart: () => void }) {
  const completion = COMPLETIONS[persona.id];
  const rundown = RUNDOWNS[persona.id];
  if (!completion || !rundown) return null;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      <img
        src={rundown.bgImage}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{
          transform: `translate(${rundown.bgOffsetXCqw ?? 0}cqw, ${rundown.bgOffsetYCqw ?? 0}cqw) scale(${rundown.bgZoom ?? 1})`,
        }}
      />

      {/* the same wash every photographic screen carries, and for the same reason: the
          heading and the list both sit on whatever the photo happens to be doing */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.6) 22%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      <FpoChip />

      <p className="relative z-10 pointer-events-none shrink-0 pt-[4.2cqw] text-center text-[4cqw] leading-[4.4cqw] text-white">
        {completion.title}
      </p>

      {/* the list takes the room between the heading and the corners the ending furniture
          sits in, and centres itself in whatever is left */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center pb-[2cqw]">
        <ul className="flex w-[54cqw] flex-col gap-[0.9cqw]">
          {completion.items.map((item, i) => (
            <li
              key={item}
              className="flex items-center gap-[1.6cqw] rounded-[2.6cqw] border border-white/12 bg-black/45 px-[2.4cqw] py-[1.1cqw] backdrop-blur-2xl"
              // the four land in turn rather than all at once — the day being totted up
              style={{ animation: "fade-in-up 500ms ease-out both", animationDelay: `${i * 140}ms` }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[2cqw] w-[2cqw] shrink-0 text-[#8ab4f8]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4.5 12.5l5 5L19.5 7" />
              </svg>
              <span className="text-[1.6cqw] leading-[2.2cqw] font-medium text-white">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute bottom-[2.5cqw] left-[2.87cqw] z-10 flex items-center gap-[0.9cqw]">
        <img src="/gemini/qr-code.jpg" alt="" className="h-[5cqw] w-[5cqw] rounded-[0.5cqw] object-cover" />
        <span className="max-w-[7cqw] text-[0.95cqw] leading-[1.2cqw] text-muted">Scan to try Gemini on your phone</span>
      </div>

      <div className="absolute bottom-[2.5cqw] right-[2.87cqw] z-10">
        <GradientPillButton onClick={onRestart}>Start again</GradientPillButton>
      </div>
    </div>
  );
}
