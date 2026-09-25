"use client";

import { useEffect, useState } from "react";

/** The heading lands first, on its own. */
const HEADING_MS = 300;
/** ...then the Google mark. */
const MARK_MS = 900;
/** ...which spins and becomes the Gemini star. */
const SPIN_MS = 2000;
/** ...and then the pair slide left as the wordmark is uncovered. */
const REVEAL_MS = 2900;
/** How long the whole thing runs. The reveal finishes at REVEAL_MS + its own duration, so
 * this is that plus a beat to read the finished lockup on. */
const HOLD_MS = 5200;

/** The turn itself, and the uncovering — both long enough to read as one move rather than
 * a cut. */
const SPIN_DURATION_MS = 750;
const REVEAL_DURATION_MS = 900;

// the wordmark's own proportions (viewBox 1162.37 x 174.29), so the box it is uncovered
// inside is exactly as wide as the artwork and never letterboxes it
const WORDMARK_H_CQW = 3.6;
const WORDMARK_W_CQW = WORDMARK_H_CQW * (1162.37 / 174.29);
const MARK_CQW = 4.6;
const GAP_CQW = 1.6;

/**
 * What the kiosk opens on, once, before the persona picker.
 *
 * Three beats: the line, then Google's own mark, which turns and becomes the Gemini star
 * and slides left as "Google Gemini" is uncovered behind it. The uncovering is a box that
 * widens with the wordmark pinned to its right edge, so the name is revealed from its end
 * back to its start — and because the row is centred, the star is carried left by the same
 * movement rather than being animated there separately.
 */
export default function IntroScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [HEADING_MS, MARK_MS, SPIN_MS, REVEAL_MS].map((ms, i) =>
      setTimeout(() => setStep(i + 1), ms),
    );
    const end = setTimeout(onDone, HOLD_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
  }, [onDone]);

  const headingIn = step >= 1;
  const markIn = step >= 2;
  const spun = step >= 3;
  const revealed = step >= 4;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-black">
      <p
        className="max-w-[46cqw] text-center text-[3.2cqw] leading-[3.9cqw] font-medium text-white transition-all duration-700 ease-out"
        style={{ opacity: headingIn ? 1 : 0, transform: `translateY(${headingIn ? "0" : "0.8cqw"})` }}
      >
        Create, explore, and get organized with
      </p>

      <div className="mt-[4.4cqw] flex items-center">
        {/* the two marks share one box and cross-fade through a turn, so the G becomes the
            star rather than being replaced by it */}
        <div className="relative shrink-0" style={{ height: `${MARK_CQW}cqw`, width: `${MARK_CQW}cqw` }}>
          <img
            src="/v81-image-assets-inuse/assets/super-g.svg"
            alt=""
            className="absolute inset-0 h-full w-full object-contain transition-all ease-in-out"
            style={{
              transitionDuration: `${markIn ? SPIN_DURATION_MS : 500}ms`,
              opacity: markIn && !spun ? 1 : 0,
              transform: `rotate(${spun ? 360 : 0}deg) scale(${markIn ? 1 : 0.7})`,
            }}
          />
          <img
            src="/v81-image-assets-inuse/assets/gi-spark-color.svg"
            alt=""
            className="absolute inset-0 h-full w-full object-contain transition-all ease-in-out"
            style={{
              transitionDuration: `${SPIN_DURATION_MS}ms`,
              opacity: spun ? 1 : 0,
              transform: `rotate(${spun ? 360 : 180}deg) scale(${spun ? 1 : 0.7})`,
            }}
          />
        </div>

        {/* the box widens from nothing with the wordmark pinned to its right edge: the name
            is uncovered from its end backwards, and the star is carried left as it grows */}
        <div
          className="relative overflow-hidden transition-all ease-out"
          style={{
            transitionDuration: `${REVEAL_DURATION_MS}ms`,
            height: `${WORDMARK_H_CQW}cqw`,
            width: revealed ? `${WORDMARK_W_CQW}cqw` : "0cqw",
            marginLeft: revealed ? `${GAP_CQW}cqw` : "0cqw",
          }}
        >
          <img
            src="/v81-image-assets-inuse/assets/google-gemini-dark.svg"
            alt="Google Gemini"
            className="absolute right-0 top-0 h-full max-w-none"
            style={{ width: `${WORDMARK_W_CQW}cqw` }}
          />
        </div>
      </div>
    </div>
  );
}
