"use client";

import { PERSONAS, type Persona } from "../types";
import { FpoChip } from "../shared";

/**
 * The persona picker — now the only landing layout (the earlier full-height
 * photo-card exploration was retired). A full-bleed photo behind a centered
 * heading and a bottom-anchored stack of glass pills, matching the centered
 * heading / bottom-anchored-stack shape every screen after this one uses
 * (Rundown, the Friday-night choice screen). The pills are deliberately
 * frosted glass rather than a solid fill — that only reads as glass with
 * something behind it to refract, which is what this photo is for.
 *
 * Each persona is still a color swatch + initial rather than a photo — the
 * per-persona photography isn't signed off yet, and a flat color reads as an
 * intentional placeholder rather than a broken image.
 */
export default function GlassPillsLayout({ onSelect }: { onSelect: (persona: Persona) => void }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {/* `object-top` + a top-origin scale rather than a plain centered cover: the source
          is 4:3 going into a 16:9 frame, so something has to be cropped, and cropping from
          the bottom keeps the subject's face clear of the heading. (Centered, the crop
          pulled his eyes up to ~13% of the frame — directly behind the heading.) The zoom
          then pushes them further down and fills the frame with more of him and less
          background. Any future swap of this photo needs both values re-checked against
          wherever its own subject lands. */}
      <img
        src="/geminiBackground1.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full origin-top scale-[1.15] object-cover object-top"
      />
      {/* Legibility scrim, shaped rather than a flat wash: darker at the very top (the
          heading sits over bright brickwork here — a flat 30% left nearly half that band
          under a 4.5:1 contrast ratio) and at the bottom (behind the pills), but lightest
          across the middle so his face reads as a photo instead of a murky backdrop. The
          bottom stops well short of near-black on purpose — burying the photo there would
          put the pills back on a flat dark field, the exact thing the glass needs a
          visible backdrop to avoid. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.34) 20%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <FpoChip />

      <p className="relative z-10 pointer-events-none pt-[5.63cqw] text-center text-[2.9cqw] text-white">
        Who&rsquo;s starting their day?
      </p>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center pb-[3.5cqw]">
        <div className="flex w-[48cqw] flex-col gap-[1cqw]">
          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              type="button"
              disabled={!persona.active}
              onClick={() => onSelect(persona)}
              className={`flex h-[5.7cqw] items-center gap-[1.3cqw] rounded-full border py-[0.7cqw] pl-[0.7cqw] pr-[2.2cqw] text-left backdrop-blur-xl transition-transform duration-150 ${
                persona.active
                  ? "border-white/15 bg-white/10 active:scale-[0.97]"
                  : "pointer-events-none border-white/8 bg-white/4"
              }`}
            >
              <span
                className={`flex h-full w-[4.3cqw] shrink-0 items-center justify-center rounded-full text-[1.7cqw] font-medium text-white ${!persona.active ? "opacity-40 grayscale" : ""}`}
                style={{ backgroundColor: persona.swatchColor }}
              >
                {persona.id.charAt(0).toUpperCase()}
              </span>
              <span className={`whitespace-nowrap text-[1.5cqw] font-medium ${persona.active ? "text-white" : "text-white/40"}`}>
                {persona.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
