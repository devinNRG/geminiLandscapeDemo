"use client";

import { RUNDOWNS, type Persona } from "./types";
import { BackButton, FpoChip } from "./shared";

/**
 * The personalized "Hi, where should we start?" menu shown right after a
 * persona is picked on the landing screen — a full-bleed photo from that
 * persona's life with a handful of suggestion pills standing in for their
 * likely asks. The pill stack is bottom-anchored (not top-anchored) so it
 * grows upward the same way regardless of whether a persona has four or five
 * pills, matching how the source design keeps every stack's bottom edge at
 * the same height.
 *
 * The heading sits at the landing screen's display size rather than a step
 * down from it: this is the screen the visitor actually chooses from, so it
 * opens the same way the picker before it did.
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

      {/* Legibility scrim, the same shaped wash the landing screen carries and for the same
          reason — darkest behind the heading and behind the pill stack, lightest across the
          middle so the photo still reads as a photo. This screen went without one while its
          backdrops were dim banner crops of a person. All three are daylight scenes now, and
          two of them are bright exactly where type sits: the study desk puts the tablet's
          white screen under the pill stack, and the meadow puts sunrise sky behind the
          heading. Same stops as the landing screen's wash, for the same reason — a heavy top
          (0.78) is what buys a dark enough band to set a heading on. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.6) 22%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.62) 100%)",
        }}
      />

      {/* the persona photography is a stand-in here too, same as the landing backdrop */}
      <FpoChip />

      <BackButton onClick={onBack} />

      {/* pointer-events-none: purely decorative text — without this its full-width box
          (even though the text itself is centered) sits above the back button in paint
          order and swallows clicks meant for it */}
      <p className="relative z-10 pointer-events-none pt-[5.63cqw] text-center text-[4cqw] leading-[4.4cqw] text-white">
        Hi, where should we start?
      </p>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center pb-[2.71cqw]">
        <div className="flex w-[48cqw] flex-col gap-[1cqw]">
          {data.pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              disabled={!pill.active}
              onClick={() => onSelectPill(pill.id)}
              /* same darker glass as the landing pills, for the same reason — a white veil
                 over a photo flattens it, a black tint keeps the photo readable through it */
              className={`flex h-[5.16cqw] items-center rounded-full border px-[2.66cqw] text-left text-[1.6cqw] font-medium leading-[2cqw] backdrop-blur-2xl transition-transform duration-150 ${
                pill.active
                  ? "border-white/12 bg-black/45 text-white active:scale-[0.97]"
                  : "pointer-events-none border-white/8 bg-black/25 text-white/40"
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
