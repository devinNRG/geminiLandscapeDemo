"use client";

import { BackButton, FpoChip, riseStyle } from "./shared";

/**
 * Sits between picking the "Sort Friday night" pill and playing a demo — the
 * use case branches into two: "Go out" (a local-search flow — nearby vegetarian
 * restaurants, ending with Gemini drafting a plan into the group chat) and "Stay
 * in" (the FoodOrder task-automation flow).
 */
export default function FridayNightChoiceScreen({
  show,
  onBack,
  onSelect,
}: {
  /** Whether this is the screen on show — its content rises in and sinks out on it. */
  show: boolean;
  onBack: () => void;
  onSelect: (choice: "goOut" | "stayIn") => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {/* 9:16 into 16:9, so a centred cover keeps the middle third — a close crop of the
          dish rather than the whole plate on its table. The plate is 1090px tall in a 678px
          band, so no zoom or pan reaches its full width; this is the framing the source
          photo allows in a landscape frame, not a compromise between several. */}
      <img
        src="/v81-image-assets-inuse/assets/pick/veg-dish-1.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {/* The same wash the landing and rundown screens carry. This screen used to get by on
          a light scrim because its backdrop was a night street that held the heading at
          ~17:1 unaided; a sunlit plate does not. */}
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
      <p
        className="relative z-10 pointer-events-none pt-[5.63cqw] text-center text-[4cqw] leading-[4.4cqw] text-white"
        style={riseStyle(show)}
      >
        Make plans for Friday night
      </p>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center pb-[2.71cqw]">
        <div className="flex w-[48cqw] flex-col gap-[1cqw]">
          <button
            type="button"
            onClick={() => onSelect("goOut")}
            style={riseStyle(show, 1)}
            className="flex h-[5.16cqw] items-center rounded-full border border-white/12 bg-black/45 px-[2.66cqw] text-left text-[1.6cqw] font-medium leading-[2cqw] text-white backdrop-blur-2xl transition-transform duration-150 active:scale-[0.97]"
          >
            Go out
          </button>
          <button
            type="button"
            onClick={() => onSelect("stayIn")}
            style={riseStyle(show, 2)}
            className="flex h-[5.16cqw] items-center rounded-full border border-white/12 bg-black/45 px-[2.66cqw] text-left text-[1.6cqw] font-medium leading-[2cqw] text-white backdrop-blur-2xl transition-transform duration-150 active:scale-[0.97]"
          >
            Order in
          </button>
        </div>
      </div>
    </div>
  );
}
