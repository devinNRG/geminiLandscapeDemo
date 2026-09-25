"use client";

import { useEffect, useState } from "react";
import { CITY_CHOICES } from "./types";
import { BackButton, FpoChip } from "./shared";

/** How long each city holds before the next one comes up. */
const HOLD_MS = 4200;
/** The crossfade between them — long, so the change reads as the screen breathing rather
 * than as a slideshow advancing. */
const FADE_MS = 1400;

/**
 * Sits between the traveler's "Explore a new city" pill and a city's own flow.
 *
 * Unlike the other choice screens, whose backdrop is one photo, this one rotates through
 * the five cities it is offering: the screen is asking which city, so showing one of them
 * would quietly answer its own question. All five are mounted and cross-faded by opacity
 * rather than swapped, which both preloads them and keeps the change from flashing black
 * between photos.
 *
 * Everything else is the choice-screen language already in use — the same wash, the same
 * glass pills at the same size, the heading centred at the menu's display size.
 */
export default function CityChoiceScreen({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (cityId: string) => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % CITY_CHOICES.length), HOLD_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {CITY_CHOICES.map((city, i) => (
        <img
          key={city.id}
          src={city.image}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
          style={{ opacity: i === index ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        />
      ))}

      {/* the same wash the landing, rundown and friday-night screens carry — and this screen
          needs it most, since what is behind the type changes every few seconds */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.6) 22%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      <FpoChip />

      <BackButton onClick={onBack} />

      {/* named after the pill that opens it, at the same display size as the menu before it */}
      <p className="relative z-10 pointer-events-none pt-[5.63cqw] text-center text-[4cqw] leading-[4.4cqw] text-white">
        Explore a new city
      </p>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center pb-[2.71cqw]">
        <div className="flex w-[48cqw] flex-col gap-[1cqw]">
          {CITY_CHOICES.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => onSelect(city.id)}
              className="flex h-[5.16cqw] items-center rounded-full border border-white/12 bg-black/45 px-[2.66cqw] text-left text-[1.6cqw] font-medium leading-[2cqw] text-white backdrop-blur-2xl transition-transform duration-150 active:scale-[0.97]"
            >
              {city.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
