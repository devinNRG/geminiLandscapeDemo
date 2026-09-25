"use client";

import { PERSONAS, type Persona } from "../types";
import { FpoChip, riseStyle } from "../shared";

/**
 * The persona picker — now the only landing layout (the earlier full-height
 * photo-card exploration was retired). A full-bleed photo behind a centered
 * heading and a bottom-anchored stack of glass pills, matching the centered
 * heading / bottom-anchored-stack shape every screen after this one uses
 * (Rundown, the Friday-night choice screen). The pills are deliberately
 * frosted glass rather than a solid fill — that only reads as glass with
 * something behind it to refract, which is what this photo is for.
 *
 * The screen names what it is asking for ("Choose a story") rather than
 * narrating the visitor ("Who's starting their day?"), and the pills answer
 * in the same register: a role plus the life that story is a day in, not an
 * age. The subtitle under the heading is what carries the framing the old
 * single question used to.
 */
export default function GlassPillsLayout({
  show,
  onSelect,
}: {
  /** Whether this is the screen on show — its content rises in and sinks out on it. */
  show: boolean;
  onSelect: (persona: Persona) => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {/* A plain centered cover, with none of the zoom/pan the previous backdrop needed: this
          photo is wider than the frame (2.36:1 into 16:9) and its subject is the whole
          horizon rather than a face, so nothing has to be steered out from behind the heading
          or the pill stack. Swapping in a photo with a subject (a person, a focal object)
          puts those framing questions back — see RundownScreen's `bgZoom`/`bgOffset*` for the
          pan budget that answers them. */}
      <img
        src="/v81-image-assets-inuse/assets/pick/sunrise-dunes.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {/* Legibility scrim, shaped rather than a flat wash: darker at the very top (behind the
          heading) and at the bottom (behind the pills), but lightest across the middle so the
          photo reads as a photo instead of a murky backdrop. The bottom stops well short of
          near-black on purpose — burying the photo there would put the pills back on a flat
          dark field, the exact thing the glass needs a visible backdrop to avoid.
          The top is heavy (0.78) because this crop puts bright sunrise sky exactly where the
          heading sits — the portrait version's taller crop gets dark upper sky for free, and
          this is what buys the same ~60-luminance band to set type on. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.6) 22%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      <FpoChip />

      <div className="relative z-10 pointer-events-none flex flex-col items-center gap-[0.7cqw] pt-[5.2cqw] text-center" style={riseStyle(show)}>
        {/* a display step above the 2.9cqw every other screen's heading sits at — this is the
            one screen with nothing above it in the flow, so it opens rather than continues */}
        <p className="text-[4cqw] leading-[4.4cqw] text-white">Choose a story</p>
        <p className="text-[1.55cqw] leading-[1.9cqw] text-white/85">A day in the life with Gemini</p>
      </div>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center pb-[3.5cqw]">
        <div className="flex w-[48cqw] flex-col gap-[1cqw]">
          {PERSONAS.map((persona, i) => (
            <button
              key={persona.id}
              type="button"
              disabled={!persona.active}
              onClick={() => onSelect(persona)}
              style={riseStyle(show, i + 1)}
              /* Glass over a dark tint rather than over a white one: a white veil on a photo
                 this dark washes to a flat grey and the refraction stops reading, where a
                 black tint keeps the photo visible through it and lets the hairline border do
                 the work of describing the pill's edge. */
              className={`flex h-[6.6cqw] items-center gap-[1.35cqw] rounded-full border p-[0.75cqw] pr-[2.4cqw] text-left backdrop-blur-2xl transition-transform duration-150 ${
                persona.active
                  ? "border-white/12 bg-black/45 active:scale-[0.97]"
                  : "pointer-events-none border-white/8 bg-black/25"
              }`}
            >
              {/* the persona photography is a stand-in like every other photo here, so each
                  thumbnail carries its own chip — the screen-level one above only speaks for
                  the backdrop behind it */}
              <span
                className={`relative aspect-square h-full shrink-0 overflow-hidden rounded-full ${!persona.active ? "opacity-40 grayscale" : ""}`}
              >
                <img src={persona.image} alt="" className="h-full w-full object-cover" />
                <FpoChip inline />
              </span>
              <span className="flex min-w-0 flex-col gap-[0.1cqw]">
                <span className={`whitespace-nowrap text-[1.6cqw] leading-[2cqw] font-medium ${persona.active ? "text-white" : "text-white/40"}`}>
                  {persona.label}
                </span>
                <span className={`whitespace-nowrap text-[1.25cqw] leading-[1.55cqw] ${persona.active ? "text-white/60" : "text-white/25"}`}>
                  {persona.sublabel}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
