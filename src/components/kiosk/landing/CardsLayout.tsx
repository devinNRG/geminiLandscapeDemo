"use client";

import { PERSONAS, type Persona } from "../types";

/**
 * The original persona picker: full-width photo cards, one per persona.
 * Each card is its own tap target — the touch area is the entire card, but
 * only its lower portion needs to sit in the reachable bottom-60% band, so
 * the card can keep its full height as a photo showcase.
 */
export default function CardsLayout({ onSelect }: { onSelect: (persona: Persona) => void }) {
  return (
    <div className="relative flex h-full flex-col items-center">
      <div className="relative z-10 flex flex-col items-center gap-[1.13cqw] pt-[3.75cqw]">
        <img src="/gemini/ph-spark.png" alt="" className="h-[3.4cqw] w-[3.4cqw] object-cover" />
        <p className="whitespace-nowrap text-[2.9cqw] text-white">Who&rsquo;s starting their day?</p>
      </div>

      <div className="relative z-10 mt-[2.1cqw] flex h-[35.89cqw] w-full gap-[1.56cqw] px-[3.8cqw]">
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            type="button"
            disabled={!persona.active}
            onClick={() => onSelect(persona)}
            className={`relative h-full flex-1 overflow-hidden rounded-[3.13cqw] text-left ${!persona.active ? "pointer-events-none" : ""}`}
          >
            <img
              src={persona.image}
              alt=""
              className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${!persona.active ? "opacity-40 grayscale" : ""}`}
              style={{ objectPosition: `${persona.imageFocusXPct}% center` }}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0) 55%)" }}
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[0.5cqw] px-[1.6cqw] pb-[4.5cqw]">
              <span className={`text-[2.38cqw] leading-[3.01cqw] ${persona.active ? "text-white" : "text-white/40"}`}>{persona.label}</span>
              <span className={`text-[1.5cqw] leading-[1.95cqw] ${persona.active ? "text-white/66" : "text-white/30"}`}>{persona.sublabel}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
