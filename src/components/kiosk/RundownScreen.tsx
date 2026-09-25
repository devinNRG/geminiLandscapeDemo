"use client";

import { RUNDOWNS, type Persona } from "./types";
import { BackButton, FpoChip, riseStyle } from "./shared";

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
 *
 * Pills in `completed` are flows the visitor has already finished from this
 * menu: a check on the left and a step dimmer, but still live, since going
 * back through one is a perfectly good thing to do on a kiosk.
 */
export default function RundownScreen({
  persona,
  completed,
  show,
  onBack,
  onSelectPill,
}: {
  persona: Persona;
  /** Whether this is the screen on show — its content rises in and sinks out on it. */
  show: boolean;
  completed: ReadonlySet<string>;
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
      <p
        className="relative z-10 pointer-events-none pt-[5.63cqw] text-center text-[4cqw] leading-[4.4cqw] text-white"
        style={riseStyle(show)}
      >
        Hi, where should we start?
      </p>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center pb-[2.71cqw]">
        <div className="flex w-[48cqw] flex-col gap-[1cqw]">
          {data.pills.map((pill, i) => {
            const done = pill.active && completed.has(pill.id);
            return (
              <button
                // keyed by slot, not by pill: the persona changes in the same commit that
                // shows this screen, and keying by id would remount every button into its
                // final state — with nothing to transition from, the rise would be skipped
                key={i}
                type="button"
                disabled={!pill.active}
                onClick={() => onSelectPill(pill.id)}
                style={riseStyle(show, i + 1)}
                /* same darker glass as the landing pills, for the same reason — a white veil
                   over a photo flattens it, a black tint keeps the photo readable through it.
                   A finished flow steps back between live and disabled: dimmer than a pill
                   still to do, clearly brighter than one that can't be tapped at all. */
                className={`flex h-[5.16cqw] items-center gap-[1.1cqw] rounded-full border px-[2.66cqw] text-left text-[1.6cqw] font-medium leading-[2cqw] backdrop-blur-2xl transition-transform duration-150 ${
                  !pill.active
                    ? "pointer-events-none border-white/8 bg-black/25 text-white/40"
                    : done
                      ? "border-white/10 bg-black/35 text-white/65 active:scale-[0.97]"
                      : "border-white/12 bg-black/45 text-white active:scale-[0.97]"
                }`}
              >
                {done && (
                  <svg
                    viewBox="0 0 24 24"
                    aria-label="Completed"
                    className="h-[1.7cqw] w-[1.7cqw] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4.5 12.5l5 5L19.5 7" />
                  </svg>
                )}
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
