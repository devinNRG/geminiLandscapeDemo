"use client";

import { useEffect, useState } from "react";

/**
 * Reveals text character-by-character, like the prompt being typed live into
 * the compose box, with a blinking cursor trailing the current write
 * position. `lines` is how the prompt is authored as data (natural sentence
 * chunks); they're joined into one flowing paragraph here so the browser
 * wraps it to the container's actual width rather than at the authored
 * chunk boundaries. Resets and replays every time `active` flips true.
 */
export default function TypingLines({
  lines,
  active,
  charsPerTick = 1,
  tickMs = 30,
}: {
  lines: string[];
  active: boolean;
  charsPerTick?: number;
  tickMs?: number;
}) {
  const text = lines.join(" ");
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisible(0);
      return;
    }
    setVisible(0);
    const id = setInterval(() => {
      setVisible((v) => Math.min(text.length, v + charsPerTick));
    }, tickMs);
    return () => clearInterval(id);
  }, [active, text, charsPerTick, tickMs]);

  const done = visible >= text.length;

  return (
    <p>
      {text.slice(0, visible)}
      {!done && <span className="ml-[0.1em] inline-block h-[0.9em] w-[0.09em] translate-y-[0.12em] animate-pulse bg-current align-middle" />}
    </p>
  );
}
