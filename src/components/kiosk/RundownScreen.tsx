"use client";

import { RUNDOWNS, type Persona } from "./types";
import { FpoChip } from "./shared";

/**
 * The personalized "Hi, here's your daily rundown" screen shown right after
 * a persona is picked on the landing screen — a full-bleed photo of that
 * persona with a handful of suggestion pills standing in for their likely
 * asks. The pill stack is bottom-anchored (not top-anchored) so it grows
 * upward the same way regardless of whether a persona has four or five
 * pills, matching how the source design keeps every stack's bottom edge at
 * the same height.
 */
export default function RundownScreen({
  persona,
  onBack,
  onSelectPill,
}: {
  persona: Persona;
  onBack: () => void;
  onSelectPill: (pillId: string) => void;
}) {
  const data = RUNDOWNS[persona.id];
  if (!data) return null;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {/* cover-fitted first, then zoomed and panned off that — see `bgZoom` in types.ts for
          why the pan budget is tied to the zoom. Scaling about the centre is what keeps a
          zero-offset photo framed exactly as a plain object-cover would frame it. */}
      <img
        src={data.bgImage}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{
          transform: `translate(${data.bgOffsetXCqw ?? 0}cqw, ${data.bgOffsetYCqw ?? 0}cqw) scale(${data.bgZoom ?? 1})`,
        }}
      />

      {/* the persona photography is a stand-in here too, same as the landing backdrop */}
      <FpoChip />

      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-[2.6cqw] top-[5.94cqw] z-10 flex h-[3.23cqw] w-[3.23cqw] items-center justify-center"
      >
        <img src="/gemini/rundown/back-button.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="relative text-[1.55cqw] text-white/96">‹</span>
      </button>

      {/* pointer-events-none: purely decorative text — without this its full-width box
          (even though the text itself is centered) sits above the back button in paint
          order and swallows clicks meant for it */}
      <p className="relative z-10 pointer-events-none pt-[5.63cqw] text-center text-[2.9cqw] leading-[3.5cqw] text-white">
        <span>Hi, </span>
        <span className="font-medium">here&rsquo;s your daily rundown</span>
      </p>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center pb-[2.71cqw]">
        <div className="flex w-[48cqw] flex-col gap-[1cqw]">
          {data.pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              disabled={!pill.active}
              onClick={() => onSelectPill(pill.id)}
              className={`flex h-[5.16cqw] items-center rounded-full border px-[2.66cqw] text-left text-[1.5cqw] leading-[1.92cqw] backdrop-blur-xl transition-transform duration-150 ${
                pill.active
                  ? "border-white/15 bg-white/10 text-white active:scale-[0.97]"
                  : "pointer-events-none border-white/8 bg-white/4 text-white/40"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
