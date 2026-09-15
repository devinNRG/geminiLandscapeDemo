"use client";

import { useEffect, useState } from "react";

/**
 * Gemini's inline "thinking" indicator — recreated from a direct description
 * rather than a live reference, so treat this as a first pass: three dots
 * bounce, morph into a triangle, spin as a group while swapping which
 * vertex each dot occupies, then collapse back to a row and repeat.
 * `captions` cycles underneath, mirroring how Gemini's subtext names
 * whatever it's actually doing (reading a doc, checking a connected app).
 */
const CYCLE = "3.4s";

export default function ThinkingIndicator({ captions }: { captions: string[] }) {
  const [captionIndex, setCaptionIndex] = useState(0);

  useEffect(() => {
    setCaptionIndex(0);
    if (captions.length <= 1) return;
    const id = setInterval(() => {
      setCaptionIndex((i) => (i + 1) % captions.length);
    }, 1250);
    return () => clearInterval(id);
  }, [captions]);

  return (
    <div className="flex items-center gap-[0.8cqw]">
      {/* sized generously beyond the 1.6cqw rotating cluster so the swept
          radius (vertex + dot radius) never touches this box's own edge,
          which would otherwise get clipped by an ancestor's overflow-hidden */}
      <div className="flex h-[2.6cqw] w-[2.6cqw] shrink-0 items-center justify-center">
        <div className="relative h-[1.6cqw] w-[1.6cqw]" style={{ animation: `thinking-spin ${CYCLE} linear infinite` }}>
          <span
            className="absolute h-[0.42cqw] w-[0.42cqw] rounded-full bg-white"
            style={{ left: "50%", top: "50%", marginLeft: "-0.21cqw", marginTop: "-0.21cqw", animation: `thinking-dot-1 ${CYCLE} ease-in-out infinite` }}
          />
          <span
            className="absolute h-[0.42cqw] w-[0.42cqw] rounded-full bg-white"
            style={{ left: "50%", top: "50%", marginLeft: "-0.21cqw", marginTop: "-0.21cqw", animation: `thinking-dot-2 ${CYCLE} ease-in-out infinite` }}
          />
          <span
            className="absolute h-[0.42cqw] w-[0.42cqw] rounded-full bg-white"
            style={{ left: "50%", top: "50%", marginLeft: "-0.21cqw", marginTop: "-0.21cqw", animation: `thinking-dot-3 ${CYCLE} ease-in-out infinite` }}
          />
        </div>
      </div>
      <span className="text-[1.1cqw] text-[#9a9b9c]">{captions[captionIndex]}</span>
    </div>
  );
}
