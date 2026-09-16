"use client";

import { PERSONAS, type Persona } from "../types";

/**
 * Full-bleed exploration: a single atmospheric backdrop (placeholder — a real
 * photo is coming) with a left-aligned heading and each persona as a
 * full-width glass pill with a circular avatar, reusing RundownScreen's pill
 * styling rather than the card layout's photo tiles. The stack is
 * bottom-anchored and grows upward, same as RundownScreen, so every pill's
 * tap target stays inside the reachable bottom-60% band regardless of how
 * many personas exist.
 */
export default function GlassPillsLayout({ onSelect }: { onSelect: (persona: Persona) => void }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {/* placeholder atmospheric backdrop — swap for the client-provided photo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 85% 10%, #5b2f86 0%, transparent 60%)," +
            "#05060a",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.78) 100%)" }}
      />

      <p className="relative z-10 whitespace-nowrap px-[3.8cqw] pt-[5.63cqw] text-[2.9cqw] text-white">
        Who&rsquo;s starting their day?
      </p>

      <div className="relative z-10 mt-auto flex w-full flex-col gap-[1cqw] px-[3.8cqw] pb-[3.5cqw]">
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            type="button"
            disabled={!persona.active}
            onClick={() => onSelect(persona)}
            className={`flex h-[5.7cqw] items-center gap-[1.3cqw] rounded-full border py-[0.7cqw] pl-[0.7cqw] pr-[2.2cqw] text-left backdrop-blur-xl transition-transform duration-150 ${
              persona.active
                ? "border-white/15 bg-white/10 active:scale-[0.98]"
                : "pointer-events-none border-white/8 bg-white/4"
            }`}
          >
            <span className="h-full w-[4.3cqw] shrink-0 overflow-hidden rounded-full">
              <img
                src={persona.image}
                alt=""
                className={`h-full w-full object-cover ${!persona.active ? "opacity-40 grayscale" : ""}`}
                style={{ objectPosition: `${persona.imageFocusXPct}% center` }}
              />
            </span>
            <span className={`whitespace-nowrap text-[1.5cqw] font-medium ${persona.active ? "text-white" : "text-white/40"}`}>
              {persona.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
